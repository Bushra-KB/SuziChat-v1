import { HttpException, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import {
  CallContext,
  CallMedia,
  CallStatus,
  GameType,
  MoveKind,
  PostKind,
} from '@prisma/client';
import type { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import {
  CallService,
  type ActiveCall,
  type CallEventMessage,
} from '../calls/call.service';
import { DatingService } from '../dating/dating.service';
import { ConversationsService } from '../conversations/conversations.service';
import { GamesService } from '../games/games.service';
import { PostsService } from '../posts/posts.service';
import { RoomsService } from '../rooms/rooms.service';
import { RoomLiveService } from '../room-live/room-live.service';
import { GamesMetricsService } from '../games/games-metrics.service';
import type { ChatAttachmentInput } from '../uploads/attachment-input';
import {
  APP_REALTIME_CHANNEL,
  postsFeedChannel,
  ROOMS_CATALOG_CHANNEL,
} from './realtime-channels';
import { RealtimeEventsService } from './realtime-events.service';
import { RealtimeStateService } from './realtime-state.service';

type AuthSocket = Socket & {
  data: {
    userId?: string;
    gameSessionIds?: Set<string>;
    gameLobbyIds?: Set<string>;
    roomSlugs?: Set<string>;
    callIds?: Set<string>;
    liveSessions?: Map<string, { roomSlug: string; role: 'host' | 'viewer' }>;
  };
};

function getRealtimeAllowedOrigins() {
  const fallbackOrigins =
    process.env.NODE_ENV === 'production'
      ? ''
      : 'http://localhost:3000,http://127.0.0.1:3000';
  return (process.env.CORS_ORIGINS ?? fallbackOrigins)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function realtimeCorsOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) {
  if (!origin) {
    callback(null, true);
    return;
  }

  const allowlist = getRealtimeAllowedOrigins();
  if (allowlist.length === 0 && process.env.NODE_ENV === 'production') {
    callback(
      new Error(
        'Realtime CORS blocked: CORS_ORIGINS is empty. Set allowed origins explicitly.',
      ),
    );
    return;
  }

  if (allowlist.length === 0 || allowlist.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`Realtime CORS blocked for origin: ${origin}`));
}

@WebSocketGateway({
  cors: {
    origin: realtimeCorsOrigin,
    credentials: false,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly lastGameSocketActionAt = new Map<string, number>();
  private readonly gameSocketActionCooldownMs = Number(
    process.env.GAMES_SOCKET_ACTION_COOLDOWN_MS ?? 400,
  );
  private readonly activeAtByUserId = new Map<string, number>();
  private readonly awayAfterMs = Number(
    process.env.REALTIME_AWAY_AFTER_MS ?? 90_000,
  );
  private readonly lastPresenceByUserId = new Map<
    string,
    'online' | 'away' | 'offline'
  >();
  private readonly presenceTicker: ReturnType<typeof setInterval>;

  constructor(
    private readonly authService: AuthService,
    private readonly conversationsService: ConversationsService,
    private readonly postsService: PostsService,
    private readonly roomsService: RoomsService,
    private readonly gamesService: GamesService,
    private readonly realtimeEvents: RealtimeEventsService,
    private readonly realtimeState: RealtimeStateService,
    private readonly datingService: DatingService,
    private readonly gamesMetrics: GamesMetricsService,
    private readonly callService: CallService,
    private readonly roomLiveService: RoomLiveService,
  ) {
    this.presenceTicker = setInterval(() => {
      this.emitAllPresenceIfChanged();
    }, 15_000);
  }

  onModuleDestroy() {
    clearInterval(this.presenceTicker);
  }

  private getToken(socket: Socket) {
    const authToken =
      typeof socket.handshake.auth?.token === 'string'
        ? socket.handshake.auth.token
        : null;
    if (authToken?.trim()) {
      return authToken.trim().replace(/^Bearer\s+/i, '');
    }

    const header = socket.handshake.headers.authorization;
    if (typeof header === 'string' && header.trim()) {
      return header.trim().replace(/^Bearer\s+/i, '');
    }
    return null;
  }

  private getUserId(socket: AuthSocket) {
    const userId = socket.data.userId;
    if (!userId) {
      throw new WsException('Unauthorized');
    }
    return userId;
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private roomChannel(roomSlug: string) {
    return `room:${roomSlug}`;
  }

  private roomStatsChannel(roomSlug: string) {
    return `roomstats:${roomSlug}`;
  }

  private postChannel(postId: string) {
    return `post:${postId}`;
  }

  private gameLobbyChannel(lobbyId: string) {
    return `game:lobby:${lobbyId}`;
  }

  private gameSessionChannel(sessionId: string) {
    return `game:session:${sessionId}`;
  }

  private callChannel(callId: string) {
    return `call:${callId}`;
  }

  private canAccessCall(call: ActiveCall, userId: string) {
    return (
      call.initiatorId === userId ||
      call.calleeId === userId ||
      call.participants.has(userId) ||
      call.invitedIds.has(userId)
    );
  }

  /** Subscribed by games hub / lobby pages for live lobby list refresh. */
  private gameLobbiesBroadcastChannel() {
    return 'game:lobbies';
  }

  private async getRoomOnlineUsers(roomSlug: string) {
    const sockets = await this.server
      .in(this.roomChannel(roomSlug))
      .fetchSockets();
    const userIds = [
      ...new Set(
        sockets
          .map((socket) => (socket.data as { userId?: string }).userId)
          .filter((userId): userId is string => Boolean(userId)),
      ),
    ];
    return this.roomsService.listPublicUsersByIds(userIds);
  }

  private async emitRoomStats(roomSlug: string, totalMembers?: number) {
    const onlineUsers = await this.getRoomOnlineUsers(roomSlug);
    if (onlineUsers.length > 0) {
      await this.roomsService.markRoomActive(roomSlug);
    } else {
      await this.roomsService.markRoomEmpty(roomSlug);
    }
    const stats = {
      roomSlug,
      onlineUsers: onlineUsers.length,
      totalMembers,
    };
    this.server.to(this.roomStatsChannel(roomSlug)).emit('room:stats', stats);
    this.server.to(this.roomStatsChannel(roomSlug)).emit('room:presence', {
      ...stats,
      onlineUsers,
    });
  }

  private presenceChannel(userId: string) {
    return `presence:${userId}`;
  }

  private isUserOnline(userId: string) {
    const sockets = this.server.sockets.adapter.rooms.get(
      this.userRoom(userId),
    );
    return Boolean(sockets && sockets.size > 0);
  }

  private emitPresence(userId: string) {
    const status = this.computePresenceStatus(userId);
    this.lastPresenceByUserId.set(userId, status);
    this.server.to(this.presenceChannel(userId)).emit('presence:update', {
      userId,
      online: status !== 'offline',
      status,
    });
  }

  private computePresenceStatus(userId: string): 'online' | 'away' | 'offline' {
    if (!this.isUserOnline(userId)) {
      return 'offline';
    }
    const activeAt = this.activeAtByUserId.get(userId) ?? 0;
    return Date.now() - activeAt > this.awayAfterMs ? 'away' : 'online';
  }

  private normalizeActivityAt(activeAt?: number) {
    const now = Date.now();
    if (typeof activeAt !== 'number' || !Number.isFinite(activeAt)) {
      return now;
    }
    return Math.min(now, Math.max(0, activeAt));
  }

  private markUserActive(userId: string, activeAt = Date.now()) {
    this.activeAtByUserId.set(userId, activeAt);
    this.emitPresence(userId);
  }

  private touchUserPresence(userId: string) {
    this.emitPresence(userId);
  }

  private emitAllPresenceIfChanged() {
    for (const userId of this.activeAtByUserId.keys()) {
      const next = this.computePresenceStatus(userId);
      const prev = this.lastPresenceByUserId.get(userId);
      if (next !== prev) {
        this.emitPresence(userId);
      }
      if (next === 'offline') {
        this.activeAtByUserId.delete(userId);
      }
    }
  }

  async handleConnection(client: AuthSocket) {
    try {
      const token = this.getToken(client);
      if (!token) {
        client.emit('realtime:error', { message: 'Missing access token' });
        client.disconnect();
        return;
      }
      const payload = await this.authService.verifyAccessToken(token);
      client.data.userId = payload.sub;
      await client.join(this.userRoom(payload.sub));
      await client.join(this.presenceChannel(payload.sub));
      await client.join(APP_REALTIME_CHANNEL);
      this.markUserActive(payload.sub);
      this.realtimeEvents.setServer(this.server);
      const state = await this.realtimeState.buildUserState(payload.sub);
      client.emit('realtime:state', state);
      void this.syncUserGameLobbyCleanup(payload.sub);
    } catch {
      client.emit('realtime:error', { message: 'Unauthorized' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthSocket) {
    const userId = client.data.userId;
    if (!userId) {
      return;
    }
    void this.cleanupSocketCalls(client);
    void this.cleanupSocketLiveSessions(client);
    // Defer until socket.io updates room membership.
    setTimeout(() => {
      this.emitPresence(userId);
      for (const roomSlug of client.data.roomSlugs ?? []) {
        void this.emitRoomStats(roomSlug);
      }
      void this.syncUserGameLobbyCleanup(userId, client.data.gameLobbyIds);
      const sessionIds = new Set<string>([
        ...(client.data.gameSessionIds ?? []),
        ...[...client.rooms]
          .filter((name) => name.startsWith('game:session:'))
          .map((name) => name.slice('game:session:'.length)),
      ]);
      for (const sessionId of sessionIds) {
        void this.broadcastGameSessionPresence(sessionId);
      }
    }, 0);
  }

  private async broadcastGameSessionPresence(sessionId: string) {
    if (!this.server) return;
    try {
      const meta = await this.gamesService.getSessionWatcherMeta(sessionId);
      const room = this.gameSessionChannel(sessionId);
      const sockets = await this.server.in(room).fetchSockets();
      const seatedIds = new Set(meta.seatedUserIds);
      const activeUserIds = new Set<string>();
      const activeSeatedUserIds = new Set<string>();
      const watchingUserIds = new Set<string>();
      for (const sock of sockets) {
        const uid = (sock.data as { userId?: string }).userId;
        if (!uid) continue;
        activeUserIds.add(uid);
        if (seatedIds.has(uid)) {
          activeSeatedUserIds.add(uid);
        } else {
          watchingUserIds.add(uid);
        }
      }
      await this.gamesService.syncSessionCleanupPresence(
        sessionId,
        activeSeatedUserIds.size,
        activeUserIds.size,
      );
      await this.syncGameLobbyCleanup(meta.lobbyId);
      const payload = {
        sessionId,
        watcherCount: watchingUserIds.size,
        allowSpectatorChat: meta.allowSpectatorChat,
      };
      this.server.to(room).emit('game:session:presence', payload);
      return payload;
    } catch (err) {
      this.logger.warn(
        `game:session:presence broadcast failed session=${sessionId}`,
      );
      return null;
    }
  }

  private async channelUserIds(channel: string) {
    const sockets = await this.server.in(channel).fetchSockets();
    return [
      ...new Set(
        sockets
          .map((socket) => (socket.data as { userId?: string }).userId)
          .filter((userId): userId is string => Boolean(userId)),
      ),
    ];
  }

  private async syncGameLobbyCleanup(lobbyId: string) {
    const meta = await this.gamesService.getLobbyCleanupMeta(lobbyId);
    if (!meta) return;
    const activeUserIds = new Set<string>(
      await this.channelUserIds(this.gameLobbyChannel(lobbyId)),
    );
    for (const participantId of meta.participantIds) {
      if (this.isUserOnline(participantId)) {
        activeUserIds.add(participantId);
      }
    }
    await this.gamesService.syncLobbyCleanupPresence(
      lobbyId,
      activeUserIds.size,
    );
  }

  private async syncUserGameLobbyCleanup(
    userId: string,
    knownLobbyIds?: Set<string>,
  ) {
    const lobbyIds = new Set<string>(knownLobbyIds ?? []);
    const userLobbyIds = await this.gamesService
      .getOpenLobbyIdsForUser(userId)
      .catch(() => []);
    for (const lobbyId of userLobbyIds) {
      lobbyIds.add(lobbyId);
    }
    for (const lobbyId of lobbyIds) {
      await this.syncGameLobbyCleanup(lobbyId).catch(() => undefined);
    }
  }

  @SubscribeMessage('dm:join')
  async onDmJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { peerId?: string },
  ) {
    const userId = this.getUserId(client);
    const peerId = payload?.peerId?.trim();
    if (!peerId) {
      throw new WsException('peerId is required');
    }
    await this.conversationsService.getPeer(userId, peerId);
    return { ok: true };
  }

  @SubscribeMessage('dm:send')
  async onDmSend(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    payload: {
      peerId?: string;
      body?: string;
      attachments?: ChatAttachmentInput[];
    },
  ) {
    const userId = this.getUserId(client);
    const peerId = payload?.peerId?.trim();
    const body = payload?.body?.trim() ?? '';
    const attachments = payload?.attachments ?? [];
    if (!peerId) {
      throw new WsException('peerId is required');
    }
    if (!body && attachments.length === 0) {
      throw new WsException('A message needs text or an attachment');
    }

    const message = await this.conversationsService.sendMessage(
      userId,
      peerId,
      body,
      attachments,
    );
    this.markUserActive(userId);
    this.server
      .to(this.userRoom(message.sender.id))
      .to(this.userRoom(message.recipient.id))
      .emit('dm:message', message);
    const [senderState, recipientState] = await Promise.all([
      this.realtimeState.buildUserState(message.sender.id),
      this.realtimeState.buildUserState(message.recipient.id),
    ]);
    this.realtimeEvents.emitToUser(
      message.sender.id,
      'realtime:state',
      senderState,
    );
    this.realtimeEvents.emitToUser(
      message.recipient.id,
      'realtime:state',
      recipientState,
    );

    return { ok: true, message };
  }

  @SubscribeMessage('room:join')
  async onRoomJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomSlug?: string },
  ) {
    const userId = this.getUserId(client);
    const roomSlug = payload?.roomSlug?.trim();
    if (!roomSlug) {
      throw new WsException('roomSlug is required');
    }
    const access = await this.roomsService.getRoomAccess(roomSlug, userId);
    if (!access.canOpen) {
      throw new WsException('You are not allowed to open this room');
    }
    await client.join(this.roomChannel(roomSlug));
    await client.join(this.roomStatsChannel(roomSlug));
    client.data.roomSlugs ??= new Set<string>();
    client.data.roomSlugs.add(roomSlug);
    this.markUserActive(userId);
    await this.emitRoomStats(roomSlug);
    return { ok: true };
  }

  @SubscribeMessage('room:leave')
  async onRoomLeave(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomSlug?: string },
  ) {
    this.getUserId(client);
    const roomSlug = payload?.roomSlug?.trim();
    if (!roomSlug) {
      throw new WsException('roomSlug is required');
    }
    await client.leave(this.roomChannel(roomSlug));
    await client.leave(this.roomStatsChannel(roomSlug));
    client.data.roomSlugs?.delete(roomSlug);
    await this.emitRoomStats(roomSlug);
    return { ok: true };
  }

  @SubscribeMessage('room:watch')
  async onRoomWatch(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomSlug?: string },
  ) {
    const userId = this.getUserId(client);
    const roomSlug = payload?.roomSlug?.trim();
    if (!roomSlug) {
      throw new WsException('roomSlug is required');
    }
    const access = await this.roomsService.getRoomAccess(roomSlug, userId);
    if (access.isBlocked) {
      throw new WsException('You are blocked from this room');
    }
    const room = await this.roomsService.getRoomBySlug(roomSlug);
    await client.join(this.roomStatsChannel(roomSlug));
    await this.emitRoomStats(roomSlug, room._count?.memberships ?? undefined);
    return { ok: true };
  }

  @SubscribeMessage('room:send')
  async onRoomSend(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    payload: {
      roomSlug?: string;
      body?: string;
      attachments?: ChatAttachmentInput[];
    },
  ) {
    const userId = this.getUserId(client);
    const roomSlug = payload?.roomSlug?.trim();
    const body = payload?.body?.trim() ?? '';
    const attachments = payload?.attachments ?? [];
    if (!roomSlug) {
      throw new WsException('roomSlug is required');
    }
    if (!body && attachments.length === 0) {
      throw new WsException('A message needs text or an attachment');
    }

    const message = await this.roomsService.postMessage(
      roomSlug,
      userId,
      body,
      attachments,
    );
    this.markUserActive(userId);
    this.server.to(this.roomChannel(roomSlug)).emit('room:message', {
      roomSlug,
      message,
    });

    return { ok: true, message };
  }

  private roomLivePayload(
    session: NonNullable<Awaited<ReturnType<RoomLiveService['getActiveForRoom']>>>,
  ) {
    return {
      id: session.id,
      roomSlug: session.room.slug,
      roomName: session.room.name,
      host: session.host,
      startedAt: session.startedAt,
      viewerCount: this.roomLiveService.getViewerCount(session.id),
    };
  }

  private trackRoomLiveSocket(
    client: AuthSocket,
    sessionId: string,
    roomSlug: string,
    role: 'host' | 'viewer',
  ) {
    client.data.liveSessions ??= new Map();
    client.data.liveSessions.set(sessionId, { roomSlug, role });
  }

  @SubscribeMessage('room:live:status')
  async onRoomLiveStatus(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomSlug?: string },
  ) {
    const userId = this.getUserId(client);
    const roomSlug = payload?.roomSlug?.trim();
    if (!roomSlug) {
      throw new WsException('roomSlug is required');
    }
    const access = await this.roomsService.getRoomAccess(roomSlug, userId);
    if (!access.canOpen || !access.isMember) {
      throw new WsException('Join the room before watching live');
    }
    const session = await this.roomLiveService.getActiveForRoom(roomSlug);
    return {
      ok: true,
      live: session ? this.roomLivePayload(session) : null,
    };
  }

  @SubscribeMessage('room:live:start')
  async onRoomLiveStart(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomSlug?: string },
  ) {
    const userId = this.getUserId(client);
    const roomSlug = payload?.roomSlug?.trim();
    if (!roomSlug) {
      throw new WsException('roomSlug is required');
    }
    const { session, message, token } = await this.roomLiveService.start(
      roomSlug,
      userId,
    );
    this.trackRoomLiveSocket(client, session.id, roomSlug, 'host');
    this.markUserActive(userId);
    this.server.to(this.roomChannel(roomSlug)).emit('room:message', {
      roomSlug,
      message,
    });
    this.server.to(this.roomChannel(roomSlug)).emit('room:live:started', {
      roomSlug,
      live: this.roomLivePayload(session),
    });
    return { ok: true, live: this.roomLivePayload(session), token };
  }

  @SubscribeMessage('room:live:join')
  async onRoomLiveJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomSlug?: string },
  ) {
    const userId = this.getUserId(client);
    const roomSlug = payload?.roomSlug?.trim();
    if (!roomSlug) {
      throw new WsException('roomSlug is required');
    }
    const { session, token } = await this.roomLiveService.join(roomSlug, userId);
    this.trackRoomLiveSocket(client, session.id, roomSlug, 'viewer');
    this.markUserActive(userId);
    this.server.to(this.roomChannel(roomSlug)).emit('room:live:viewer-count', {
      roomSlug,
      liveId: session.id,
      viewerCount: this.roomLiveService.getViewerCount(session.id),
    });
    return { ok: true, live: this.roomLivePayload(session), token };
  }

  @SubscribeMessage('room:live:leave')
  onRoomLiveLeave(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { liveId?: string },
  ) {
    const userId = this.getUserId(client);
    const liveId = payload?.liveId?.trim();
    const tracked = liveId ? client.data.liveSessions?.get(liveId) : undefined;
    if (!liveId || !tracked) {
      return { ok: true };
    }
    client.data.liveSessions?.delete(liveId);
    const viewerCount = this.roomLiveService.removeViewer(liveId, userId);
    this.server.to(this.roomChannel(tracked.roomSlug)).emit('room:live:viewer-count', {
      roomSlug: tracked.roomSlug,
      liveId,
      viewerCount,
    });
    return { ok: true };
  }

  @SubscribeMessage('room:live:end')
  async onRoomLiveEnd(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomSlug?: string },
  ) {
    const userId = this.getUserId(client);
    const roomSlug = payload?.roomSlug?.trim();
    if (!roomSlug) {
      throw new WsException('roomSlug is required');
    }
    const ended = await this.roomLiveService.end(roomSlug, userId);
    if (!ended) {
      return { ok: true };
    }
    client.data.liveSessions?.delete(ended.session.id);
    this.server.to(this.roomChannel(roomSlug)).emit('room:message', {
      roomSlug,
      message: ended.message,
    });
    this.server.to(this.roomChannel(roomSlug)).emit('room:live:ended', {
      roomSlug,
      liveId: ended.session.id,
      endedAt: ended.session.endedAt,
    });
    return { ok: true };
  }

  @SubscribeMessage('dm:typing')
  async onDmTyping(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { peerId?: string; typing?: boolean },
  ) {
    const userId = this.getUserId(client);
    const peerId = payload?.peerId?.trim();
    if (!peerId) {
      throw new WsException('peerId is required');
    }
    await this.conversationsService.getPeer(userId, peerId);
    this.markUserActive(userId);
    this.server.to(this.userRoom(peerId)).emit('dm:typing', {
      userId,
      peerId,
      typing: Boolean(payload?.typing),
    });
    return { ok: true };
  }

  @SubscribeMessage('room:typing')
  async onRoomTyping(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomSlug?: string; typing?: boolean },
  ) {
    const userId = this.getUserId(client);
    const roomSlug = payload?.roomSlug?.trim();
    if (!roomSlug) {
      throw new WsException('roomSlug is required');
    }
    await this.roomsService.getRoomBySlug(roomSlug);
    this.markUserActive(userId);
    this.server.to(this.roomChannel(roomSlug)).emit('room:typing', {
      roomSlug,
      userId,
      typing: Boolean(payload?.typing),
    });
    return { ok: true };
  }

  @SubscribeMessage('posts:feed:subscribe')
  async onPostsFeedSubscribe(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { kind?: string },
  ) {
    this.getUserId(client);
    const kind = payload?.kind?.trim().toUpperCase();
    if (kind !== PostKind.REEL && kind !== PostKind.SNAP) {
      throw new WsException('kind must be REEL or SNAP');
    }
    await client.join(postsFeedChannel(kind as PostKind));
    return { ok: true };
  }

  @SubscribeMessage('rooms:catalog:subscribe')
  async onRoomsCatalogSubscribe(@ConnectedSocket() client: AuthSocket) {
    this.getUserId(client);
    await client.join(ROOMS_CATALOG_CHANNEL);
    return { ok: true };
  }

  @SubscribeMessage('post:watch')
  async onPostWatch(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { postId?: string },
  ) {
    this.getUserId(client);
    const postId = payload?.postId?.trim();
    if (!postId) {
      throw new WsException('postId is required');
    }
    await this.postsService.getPostById(postId, this.getUserId(client));
    await client.join(this.postChannel(postId));
    return { ok: true };
  }

  @SubscribeMessage('realtime:ping')
  onPing(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload?: { active?: boolean; activeAt?: number },
  ) {
    const userId = this.getUserId(client);
    if (payload?.active) {
      this.markUserActive(
        userId,
        this.normalizeActivityAt(payload.activeAt),
      );
    } else {
      this.touchUserPresence(userId);
    }
    return { ok: true, ts: Date.now() };
  }

  @SubscribeMessage('realtime:activity')
  onActivity(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload?: { activeAt?: number },
  ) {
    const userId = this.getUserId(client);
    this.markUserActive(
      userId,
      this.normalizeActivityAt(payload?.activeAt),
    );
    return { ok: true };
  }

  @SubscribeMessage('game:lobbies:subscribe')
  async onGameLobbiesSubscribe(@ConnectedSocket() client: AuthSocket) {
    this.getUserId(client);
    await client.join(this.gameLobbiesBroadcastChannel());
    return { ok: true };
  }

  @SubscribeMessage('game:lobby:create')
  async onGameLobbyCreate(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    payload: {
      gameType?: GameType;
      title?: string;
      isPrivate?: boolean;
      maxSeats?: number;
      settings?: Record<string, unknown>;
    },
  ) {
    const userId = this.getUserId(client);
    if (!payload?.gameType || !payload.title?.trim()) {
      throw new WsException('gameType and title are required');
    }
    const lobby = await this.gamesService.createLobby(userId, {
      gameType: payload.gameType,
      title: payload.title,
      isPrivate: payload.isPrivate,
      maxSeats: payload.maxSeats,
      settings: payload.settings,
    });
    this.markUserActive(userId);
    await this.syncGameLobbyCleanup(lobby.id);
    return { ok: true, lobby };
  }

  @SubscribeMessage('game:lobby:join')
  async onGameLobbyJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { lobbyId?: string },
  ) {
    const userId = this.getUserId(client);
    const lobbyId = payload?.lobbyId?.trim();
    if (!lobbyId) {
      throw new WsException('lobbyId is required');
    }
    try {
      await this.gamesService.assertLobbySocketSubscription(lobbyId, userId);
      await this.gamesService.recordRealtimeLobbyJoinAudit(lobbyId, userId);
      this.gamesMetrics.recordSocketLobbyJoin();
      await client.join(this.gameLobbyChannel(lobbyId));
      client.data.gameLobbyIds ??= new Set<string>();
      client.data.gameLobbyIds.add(lobbyId);
      this.markUserActive(userId);
      await this.syncGameLobbyCleanup(lobbyId);
      return { ok: true };
    } catch (err) {
      this.gamesMetrics.recordSocketLobbyJoinDenied();
      this.logger.warn(
        `game:lobby:join denied user=${userId} lobby=${lobbyId}`,
      );
      throw this.toWsException(err);
    }
  }

  @SubscribeMessage('game:lobby:seat')
  async onGameLobbySeat(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { lobbyId?: string; seatIndex?: number },
  ) {
    const userId = this.getUserId(client);
    const lobbyId = payload?.lobbyId?.trim();
    if (!lobbyId || typeof payload?.seatIndex !== 'number') {
      throw new WsException('lobbyId and seatIndex are required');
    }
    const lobby = await this.gamesService.joinLobby(lobbyId, userId, {
      seatIndex: payload.seatIndex,
    });
    this.markUserActive(userId);
    return { ok: true, lobby };
  }

  @SubscribeMessage('game:lobby:settings')
  async onGameLobbySettings(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    payload: { lobbyId?: string; allowSpectatorChat?: boolean },
  ) {
    const userId = this.getUserId(client);
    const lobbyId = payload?.lobbyId?.trim();
    if (!lobbyId) {
      throw new WsException('lobbyId is required');
    }
    const lobby = await this.gamesService.updateLobbySettings(lobbyId, userId, {
      allowSpectatorChat: payload.allowSpectatorChat,
    });
    this.markUserActive(userId);
    return { ok: true, lobby };
  }

  @SubscribeMessage('game:lobby:start')
  async onGameLobbyStart(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    payload: {
      lobbyId?: string;
      options?: Record<string, unknown>;
      restart?: boolean;
    },
  ) {
    const userId = this.getUserId(client);
    const lobbyId = payload?.lobbyId?.trim();
    if (!lobbyId) {
      throw new WsException('lobbyId is required');
    }
    const session = await this.gamesService.startSession(lobbyId, userId, {
      options: payload.options ?? {},
      restart: payload.restart,
    });
    this.markUserActive(userId);
    return { ok: true, session };
  }

  @SubscribeMessage('game:lobby:delete')
  async onGameLobbyDelete(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { lobbyId?: string },
  ) {
    const userId = this.getUserId(client);
    const lobbyId = payload?.lobbyId?.trim();
    if (!lobbyId) {
      throw new WsException('lobbyId is required');
    }
    const result = await this.gamesService.deleteLobby(lobbyId, userId);
    this.markUserActive(userId);
    return result;
  }

  @SubscribeMessage('game:lobby:invite')
  async onGameLobbyInvite(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { lobbyId?: string; targetUserId?: string },
  ) {
    const userId = this.getUserId(client);
    const lobbyId = payload?.lobbyId?.trim();
    const targetUserId = payload?.targetUserId?.trim();
    if (!lobbyId || !targetUserId) {
      throw new WsException('lobbyId and targetUserId are required');
    }
    const result = await this.gamesService.sendInvite(
      lobbyId,
      userId,
      targetUserId,
    );
    this.markUserActive(userId);
    return result;
  }

  @SubscribeMessage('game:session:join')
  async onGameSessionJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { sessionId?: string },
  ) {
    const userId = this.getUserId(client);
    const sessionId = payload?.sessionId?.trim();
    if (!sessionId) {
      throw new WsException('sessionId is required');
    }
    try {
      const session = await this.gamesService.assertSessionViewAccess(
        sessionId,
        userId,
      );
      await this.gamesService.recordRealtimeSessionJoinAudit(
        sessionId,
        session.lobbyId,
        userId,
      );
      this.gamesMetrics.recordSocketSessionJoin();
      await client.join(this.gameSessionChannel(sessionId));
      if (!client.data.gameSessionIds) {
        client.data.gameSessionIds = new Set();
      }
      client.data.gameSessionIds.add(sessionId);
      this.markUserActive(userId);
      const presence = await this.broadcastGameSessionPresence(sessionId);
      return { ok: true, presence };
    } catch (err) {
      this.gamesMetrics.recordSocketSessionJoinDenied();
      this.logger.warn(
        `game:session:join denied user=${userId} session=${sessionId}`,
      );
      throw this.toWsException(err);
    }
  }

  @SubscribeMessage('game:session:action')
  async onGameSessionAction(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    payload: {
      sessionId?: string;
      action?: Record<string, unknown>;
      kind?: MoveKind;
    },
  ) {
    const userId = this.getUserId(client);
    const sessionId = payload?.sessionId?.trim();
    if (!sessionId || !payload.action) {
      throw new WsException('sessionId and action are required');
    }
    const now = Date.now();
    const last = this.lastGameSocketActionAt.get(userId) ?? 0;
    if (now - last < this.gameSocketActionCooldownMs) {
      this.gamesMetrics.recordSocketRateLimited();
      return { ok: false, error: 'Too many actions — wait a moment.' };
    }
    this.lastGameSocketActionAt.set(userId, now);
    try {
      const snapshot = await this.gamesService.postAction(sessionId, userId, {
        payload: payload.action,
        kind: payload.kind,
      });
      this.markUserActive(userId);
      return { ok: true, session: snapshot };
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof Error ? err.message : 'Game action could not be sent.',
      };
    }
  }

  @SubscribeMessage('game:session:chat')
  async onGameSessionChat(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { sessionId?: string; body?: string },
  ) {
    const userId = this.getUserId(client);
    const sessionId = payload?.sessionId?.trim();
    const body = payload?.body?.trim();
    if (!sessionId || !body) {
      throw new WsException('sessionId and body are required');
    }
    const message = await this.gamesService.sendSessionChat(
      sessionId,
      userId,
      body,
    );
    this.markUserActive(userId);
    return { ok: true, message };
  }

  private toWsException(err: unknown): WsException {
    if (err instanceof WsException) return err;
    if (err instanceof HttpException) return new WsException(err.message);
    this.logger.error(
      err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    );
    return new WsException('Request failed');
  }

  @SubscribeMessage('dating:typing')
  async onDatingTyping(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { matchId?: string; typing?: boolean },
  ) {
    const userId = this.getUserId(client);
    const matchId = payload?.matchId?.trim();
    if (!matchId) {
      throw new WsException('matchId is required');
    }
    const { peerId } = await this.datingService.assertMatchParticipant(
      userId,
      matchId,
    );
    this.markUserActive(userId);
    this.datingService.emitTyping(
      userId,
      matchId,
      peerId,
      Boolean(payload?.typing),
    );
    return { ok: true };
  }

  @SubscribeMessage('presence:watch')
  async onPresenceWatch(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { userIds?: string[] },
  ) {
    const requesterId = this.getUserId(client);
    const ids = Array.isArray(payload?.userIds)
      ? [
          ...new Set(
            payload.userIds
              .map((id) => id?.trim())
              .filter((id): id is string => Boolean(id)),
          ),
        ]
      : [];
    const watchIds = [...new Set([requesterId, ...ids])];
    await Promise.all(
      watchIds.map((id) => client.join(this.presenceChannel(id))),
    );
    const statuses = Object.fromEntries(
      watchIds.map((id) => [id, this.computePresenceStatus(id)]),
    ) as Record<string, 'online' | 'away' | 'offline'>;
    return {
      ok: true,
      onlineIds: watchIds.filter((id) => this.isUserOnline(id)),
      statuses,
    };
  }

  // --- WebRTC call signaling ------------------------------------------------

  private trackCallSocket(client: AuthSocket, callId: string) {
    client.data.callIds ??= new Set<string>();
    client.data.callIds.add(callId);
  }

  private async callerSummary(calleeId: string, callerId: string) {
    return this.conversationsService.getPeer(calleeId, callerId).catch(() => ({
      id: callerId,
      username: 'Someone',
      displayName: null,
      country: null,
      avatarUrl: null,
    }));
  }

  private emitCallEventMessage(event: CallEventMessage | null) {
    if (!event) {
      return;
    }
    if ('recipient' in event.message) {
      this.server
        .to(this.userRoom(event.message.sender.id))
        .to(this.userRoom(event.message.recipient.id))
        .emit('dm:message', event.message);
      return;
    }
    if ('matchId' in event) {
      const payload = { matchId: event.matchId, message: event.message };
      for (const userId of event.audienceIds) {
        this.server.to(this.userRoom(userId)).emit('dating:message', payload);
      }
      return;
    }
    if ('roomSlug' in event) {
      this.server.to(this.roomChannel(event.roomSlug)).emit('room:message', {
        roomSlug: event.roomSlug,
        message: event.message,
      });
    }
  }

  @SubscribeMessage('call:invite')
  async onCallInvite(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    payload: { context?: 'DM' | 'DATING'; targetKey?: string; media?: 'AUDIO' | 'VIDEO' },
  ) {
    const userId = this.getUserId(client);
    const targetKey = payload?.targetKey?.trim();
    const context = payload?.context;
    const media = payload?.media === 'VIDEO' ? CallMedia.VIDEO : CallMedia.AUDIO;
    if (!targetKey || (context !== 'DM' && context !== 'DATING')) {
      throw new WsException('context and targetKey are required');
    }

    let calleeId: string;
    let contextKey: string;
    if (context === 'DM') {
      const peer = await this.callService.resolveDirectTarget(userId, targetKey);
      calleeId = peer.id;
      contextKey = [userId, calleeId].sort().join(':');
    } else {
      calleeId = await this.callService.resolveDatingTarget(userId, targetKey);
      contextKey = targetKey;
    }

    if (this.callService.isUserBusy(userId)) {
      return { ok: false, reason: 'busy', error: 'You are already in a call' };
    }
    const calleeBusy = this.callService.getUserActiveCall(calleeId);
    const call = await this.callService.createDirectCall(
      context === 'DM' ? CallContext.DM : CallContext.DATING,
      contextKey,
      userId,
      calleeId,
      media,
    );
    this.trackCallSocket(client, call.id);
    await client.join(this.callChannel(call.id));
    this.markUserActive(userId);

    const from = await this.callerSummary(calleeId, userId);
    if (!this.isUserOnline(calleeId)) {
      await this.callService.endCall(call.id, CallStatus.UNAVAILABLE);
      this.emitCallEventMessage(
        await this.callService.createCallEventMessage(
          call,
          CallStatus.UNAVAILABLE,
          userId,
        ),
      );
      await this.callService.notifyMissedCall(
        call,
        calleeId,
        from.displayName?.trim() || from.username,
      );
      return {
        ok: false,
        reason: 'unavailable',
        error: 'User is not available',
        callId: call.id,
      };
    }
    if (calleeBusy) {
      await this.callService.endCall(call.id, CallStatus.BUSY);
      this.emitCallEventMessage(
        await this.callService.createCallEventMessage(call, CallStatus.BUSY, userId),
      );
      return {
        ok: false,
        reason: 'busy',
        busyContext: calleeBusy.context,
        error:
          calleeBusy.context === CallContext.ROOM
            ? 'User is in a group call'
            : 'User is already in a call',
        callId: call.id,
      };
    }

    this.server.to(this.userRoom(calleeId)).emit('call:incoming', {
      callId: call.id,
      context,
      contextKey,
      media: payload?.media === 'VIDEO' ? 'VIDEO' : 'AUDIO',
      from,
    });
    return { ok: true, callId: call.id };
  }

  @SubscribeMessage('call:accept')
  async onCallAccept(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { callId?: string },
  ) {
    const userId = this.getUserId(client);
    const callId = payload?.callId?.trim();
    const call = callId ? this.callService.getCall(callId) : undefined;
    if (!call || !callId) {
      throw new WsException('Call not found');
    }
    if (!call.invitedIds.has(userId) && !call.participants.has(userId)) {
      throw new WsException('You were not invited to this call');
    }
    this.callService.addParticipant(callId, userId);
    await this.callService.markAccepted(callId);
    this.trackCallSocket(client, callId);
    await client.join(this.callChannel(callId));
    this.markUserActive(userId);
    this.server.to(this.userRoom(call.initiatorId)).emit('call:accepted', {
      callId,
      userId,
    });
    return { ok: true, callId };
  }

  @SubscribeMessage('call:decline')
  async onCallDecline(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { callId?: string },
  ) {
    const userId = this.getUserId(client);
    const callId = payload?.callId?.trim();
    const call = callId ? this.callService.getCall(callId) : undefined;
    if (!call || !callId) {
      return { ok: true };
    }
    if (!call.invitedIds.has(userId)) {
      throw new WsException('You were not invited to this call');
    }
    await this.callService.endCall(callId, CallStatus.DECLINED);
    this.emitCallEventMessage(
      await this.callService.createCallEventMessage(
        call,
        CallStatus.DECLINED,
        userId,
      ),
    );
    this.server
      .to(this.callChannel(callId))
      .to(this.userRoom(call.initiatorId))
      .emit('call:declined', { callId, userId });
    return { ok: true };
  }

  @SubscribeMessage('call:cancel')
  async onCallCancel(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { callId?: string },
  ) {
    const userId = this.getUserId(client);
    const callId = payload?.callId?.trim();
    const call = callId ? this.callService.getCall(callId) : undefined;
    if (!call || !callId) {
      return { ok: true };
    }
    if (call.initiatorId !== userId) {
      throw new WsException('Only the call initiator can cancel this call');
    }
    await this.callService.endCall(callId, CallStatus.CANCELED);
    this.emitCallEventMessage(
      await this.callService.createCallEventMessage(
        call,
        CallStatus.CANCELED,
        userId,
      ),
    );
    const from = await this.callerSummary(
      [...call.invitedIds][0] ?? userId,
      userId,
    );
    for (const calleeId of call.invitedIds) {
      this.server.to(this.userRoom(calleeId)).emit('call:canceled', { callId });
      await this.callService.notifyMissedCall(
        call,
        calleeId,
        from.displayName?.trim() || from.username,
      );
    }
    return { ok: true };
  }

  @SubscribeMessage('call:end')
  async onCallEnd(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { callId?: string },
  ) {
    const userId = this.getUserId(client);
    const callId = payload?.callId?.trim();
    if (!callId) {
      return { ok: true };
    }
    const call = this.callService.getCall(callId);
    if (call && !this.canAccessCall(call, userId)) {
      throw new WsException('You are not part of this call');
    }
    await client.leave(this.callChannel(callId));
    client.data.callIds?.delete(callId);
    const ended = await this.callService.leaveParticipant(callId, userId);
    this.server.to(this.callChannel(callId)).emit('call:peer-left', {
      callId,
      userId,
    });
    if (ended) {
      if (call) {
        const status = call.accepted ? CallStatus.ENDED : CallStatus.MISSED;
        this.emitCallEventMessage(
          await this.callService.createCallEventMessage(call, status, userId),
        );
      }
      this.server.to(this.callChannel(callId)).emit('call:ended', { callId });
    }
    return { ok: true };
  }

  @SubscribeMessage('call:signal')
  onCallSignal(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    payload: { callId?: string; toUserId?: string; data?: unknown },
  ) {
    const userId = this.getUserId(client);
    const callId = payload?.callId?.trim();
    const toUserId = payload?.toUserId?.trim();
    if (!callId || !toUserId || payload?.data == null) {
      throw new WsException('callId, toUserId and data are required');
    }
    if (!this.callService.isParticipant(callId, userId)) {
      throw new WsException('You are not part of this call');
    }
    const call = this.callService.getCall(callId);
    if (!call || !this.canAccessCall(call, toUserId)) {
      throw new WsException('Signal recipient is not part of this call');
    }
    this.server.to(this.userRoom(toUserId)).emit('call:signal', {
      callId,
      fromUserId: userId,
      data: payload.data,
    });
    return { ok: true };
  }

  @SubscribeMessage('call:room:join')
  async onCallRoomJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomSlug?: string },
  ) {
    const userId = this.getUserId(client);
    const roomSlug = payload?.roomSlug?.trim();
    if (!roomSlug) {
      throw new WsException('roomSlug is required');
    }
    await this.callService.assertRoomCallAccess(userId, roomSlug);
    let call = this.callService.findRoomCall(roomSlug);
    const activeCall = this.callService.getUserActiveCall(userId);
    if (activeCall && activeCall.id !== call?.id) {
      return {
        ok: false,
        reason: 'busy',
        error: activeCall.context === CallContext.ROOM
          ? 'You are already in a group call'
          : 'You are already in a call',
      };
    }
    if (!call) {
      call = await this.callService.createRoomCall(roomSlug, userId);
    } else {
      this.callService.addParticipant(call.id, userId);
    }
    this.trackCallSocket(client, call.id);
    await client.join(this.callChannel(call.id));
    this.markUserActive(userId);
    const peerIds = [...call.participants].filter((id) => id !== userId);
    this.server.to(this.callChannel(call.id)).emit('call:room:participant-joined', {
      callId: call.id,
      roomSlug,
      userId,
    });
    return { ok: true, callId: call.id, peerIds };
  }

  private async cleanupSocketCalls(client: AuthSocket) {
    const userId = client.data.userId;
    const callIds = client.data.callIds;
    if (!userId || !callIds) {
      return;
    }
    for (const callId of callIds) {
      const call = this.callService.getCall(callId);
      const ended = await this.callService
        .leaveParticipant(callId, userId)
        .catch(() => true);
      this.server.to(this.callChannel(callId)).emit('call:peer-left', {
        callId,
        userId,
      });
      if (ended) {
        if (call) {
          const status = call.accepted ? CallStatus.ENDED : CallStatus.MISSED;
          this.emitCallEventMessage(
            await this.callService.createCallEventMessage(call, status, userId),
          );
        }
        this.server.to(this.callChannel(callId)).emit('call:ended', { callId });
      }
    }
  }

  private async cleanupSocketLiveSessions(client: AuthSocket) {
    const userId = client.data.userId;
    const liveSessions = client.data.liveSessions;
    if (!userId || !liveSessions) {
      return;
    }
    for (const [liveId, tracked] of liveSessions) {
      if (tracked.role === 'host') {
        const ended = await this.roomLiveService
          .end(tracked.roomSlug, userId)
          .catch(() => null);
        if (ended) {
          this.server.to(this.roomChannel(tracked.roomSlug)).emit('room:message', {
            roomSlug: tracked.roomSlug,
            message: ended.message,
          });
          this.server.to(this.roomChannel(tracked.roomSlug)).emit('room:live:ended', {
            roomSlug: tracked.roomSlug,
            liveId: ended.session.id,
            endedAt: ended.session.endedAt,
          });
        }
        continue;
      }
      const viewerCount = this.roomLiveService.removeViewer(liveId, userId);
      this.server.to(this.roomChannel(tracked.roomSlug)).emit('room:live:viewer-count', {
        roomSlug: tracked.roomSlug,
        liveId,
        viewerCount,
      });
    }
  }
}
