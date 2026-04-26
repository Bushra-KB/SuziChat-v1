import {
  OnModuleDestroy,
} from '@nestjs/common';
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
import type { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { DatingService } from '../dating/dating.service';
import { ConversationsService } from '../conversations/conversations.service';
import { PostsService } from '../posts/posts.service';
import { RoomsService } from '../rooms/rooms.service';
import { RealtimeEventsService } from './realtime-events.service';
import { RealtimeStateService } from './realtime-state.service';

type AuthSocket = Socket & {
  data: {
    userId?: string;
  };
};

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: false,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnModuleDestroy {
  @WebSocketServer()
  server!: Server;
  private readonly idleAfterMs = 90_000;
  private readonly activeAtByUserId = new Map<string, number>();
  private readonly lastPresenceByUserId = new Map<string, 'online' | 'away' | 'offline'>();
  private readonly presenceTicker: ReturnType<typeof setInterval>;

  constructor(
    private readonly authService: AuthService,
    private readonly conversationsService: ConversationsService,
    private readonly postsService: PostsService,
    private readonly roomsService: RoomsService,
    private readonly realtimeEvents: RealtimeEventsService,
    private readonly realtimeState: RealtimeStateService,
    private readonly datingService: DatingService,
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

  private getRoomOnlineCount(roomSlug: string) {
    const sockets = this.server.sockets.adapter.rooms.get(this.roomChannel(roomSlug));
    return sockets?.size ?? 0;
  }

  private emitRoomStats(roomSlug: string, totalMembers?: number) {
    this.server.to(this.roomStatsChannel(roomSlug)).emit('room:stats', {
      roomSlug,
      onlineUsers: this.getRoomOnlineCount(roomSlug),
      totalMembers,
    });
  }

  private presenceChannel(userId: string) {
    return `presence:${userId}`;
  }

  private isUserOnline(userId: string) {
    const sockets = this.server.sockets.adapter.rooms.get(this.userRoom(userId));
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
    return Date.now() - activeAt > this.idleAfterMs ? 'away' : 'online';
  }

  private markUserActive(userId: string) {
    this.activeAtByUserId.set(userId, Date.now());
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
      this.markUserActive(payload.sub);
      this.realtimeEvents.setServer(this.server);
      const state = await this.realtimeState.buildUserState(payload.sub);
      client.emit('realtime:state', state);
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
    // Defer until socket.io updates room membership.
    setTimeout(() => {
      this.emitPresence(userId);
      const joinedRoomStats = [...client.rooms]
        .filter((name) => name.startsWith('room:'))
        .map((name) => name.slice('room:'.length));
      for (const roomSlug of joinedRoomStats) {
        this.emitRoomStats(roomSlug);
      }
    }, 0);
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
    @MessageBody() payload: { peerId?: string; body?: string },
  ) {
    const userId = this.getUserId(client);
    const peerId = payload?.peerId?.trim();
    const body = payload?.body?.trim();
    if (!peerId || !body) {
      throw new WsException('peerId and body are required');
    }

    const message = await this.conversationsService.sendMessage(userId, peerId, body);
    this.markUserActive(userId);
    this.server
      .to(this.userRoom(message.sender.id))
      .to(this.userRoom(message.recipient.id))
      .emit('dm:message', message);
    const [senderState, recipientState] = await Promise.all([
      this.realtimeState.buildUserState(message.sender.id),
      this.realtimeState.buildUserState(message.recipient.id),
    ]);
    this.realtimeEvents.emitToUser(message.sender.id, 'realtime:state', senderState);
    this.realtimeEvents.emitToUser(message.recipient.id, 'realtime:state', recipientState);

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
    this.emitRoomStats(roomSlug);
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
    this.emitRoomStats(roomSlug, room._count?.memberships ?? undefined);
    return { ok: true };
  }

  @SubscribeMessage('room:send')
  async onRoomSend(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomSlug?: string; body?: string },
  ) {
    const userId = this.getUserId(client);
    const roomSlug = payload?.roomSlug?.trim();
    const body = payload?.body?.trim();
    if (!roomSlug || !body) {
      throw new WsException('roomSlug and body are required');
    }

    const message = await this.roomsService.postMessage(roomSlug, userId, body);
    this.markUserActive(userId);
    this.server.to(this.roomChannel(roomSlug)).emit('room:message', {
      roomSlug,
      message,
    });

    return { ok: true, message };
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
  onPing(@ConnectedSocket() client: AuthSocket) {
    this.getUserId(client);
    return { ok: true, ts: Date.now() };
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
    const { peerId } = await this.datingService.assertMatchParticipant(userId, matchId);
    this.markUserActive(userId);
    this.datingService.emitTyping(userId, matchId, peerId, Boolean(payload?.typing));
    return { ok: true };
  }

  @SubscribeMessage('presence:watch')
  async onPresenceWatch(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { userIds?: string[] },
  ) {
    const requesterId = this.getUserId(client);
    const ids = Array.isArray(payload?.userIds)
      ? [...new Set(payload.userIds.map((id) => id?.trim()).filter((id): id is string => Boolean(id)))]
      : [];
    const watchIds = [...new Set([requesterId, ...ids])];
    await Promise.all(watchIds.map((id) => client.join(this.presenceChannel(id))));
    const statuses = Object.fromEntries(
      watchIds.map((id) => [id, this.computePresenceStatus(id)]),
    ) as Record<string, 'online' | 'away' | 'offline'>;
    return {
      ok: true,
      onlineIds: watchIds.filter((id) => this.isUserOnline(id)),
      statuses,
    };
  }
}
