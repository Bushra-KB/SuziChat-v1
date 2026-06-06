import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';
import { MessageKind, RoomLiveStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsService } from '../rooms/rooms.service';

const roomLiveUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

const roomLiveMessageSelect = {
  id: true,
  kind: true,
  body: true,
  createdAt: true,
  attachments: { select: { id: true } },
  sender: { select: roomLiveUserSelect },
} as const;

const roomLiveSessionSelect = {
  id: true,
  roomId: true,
  roomName: true,
  status: true,
  startedAt: true,
  endedAt: true,
  host: { select: roomLiveUserSelect },
  room: { select: { slug: true, name: true } },
} as const;

export type RoomLiveRole = 'host' | 'viewer';

@Injectable()
export class RoomLiveService {
  private readonly viewerIdsBySession = new Map<string, Set<string>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly rooms: RoomsService,
  ) {}

  async getActiveForRoom(roomSlug: string) {
    return this.prisma.roomLiveSession.findFirst({
      where: { room: { slug: roomSlug }, status: RoomLiveStatus.LIVE },
      orderBy: { startedAt: 'desc' },
      select: roomLiveSessionSelect,
    });
  }

  async start(roomSlug: string, hostId: string) {
    const access = await this.rooms.getRoomAccess(roomSlug, hostId);
    if (!access.canPost || (!access.isOwner && !access.isModerator)) {
      throw new ForbiddenException('Only room owners and moderators can go live');
    }

    const existing = await this.getActiveForRoom(roomSlug);
    if (existing) {
      throw new BadRequestException('This room already has a live broadcast');
    }

    const room = await this.prisma.room.findUnique({
      where: { slug: roomSlug },
      select: { id: true, name: true },
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const session = await this.prisma.roomLiveSession.create({
      data: {
        roomId: room.id,
        hostId,
        roomName: `suzi-room-live-${roomSlug}-${Date.now()}`,
      },
      select: roomLiveSessionSelect,
    });
    this.viewerIdsBySession.set(session.id, new Set([hostId]));
    const message = await this.createRoomLiveMessage(
      room.id,
      hostId,
      'Room live started',
    );
    return { session, message, token: await this.createToken(session, hostId, 'host') };
  }

  async join(roomSlug: string, userId: string) {
    const access = await this.rooms.getRoomAccess(roomSlug, userId);
    if (!access.canPost) {
      throw new ForbiddenException('Join the room before watching live');
    }
    const session = await this.getActiveForRoom(roomSlug);
    if (!session) {
      throw new NotFoundException('No live broadcast is active');
    }
    this.addViewer(session.id, userId);
    return { session, token: await this.createToken(session, userId, 'viewer') };
  }

  async end(roomSlug: string, actorId: string) {
    const session = await this.getActiveForRoom(roomSlug);
    if (!session) {
      return null;
    }
    const access = await this.rooms.getRoomAccess(roomSlug, actorId);
    const isHost = session.host.id === actorId;
    if (!isHost && !access.isOwner && !access.isModerator) {
      throw new ForbiddenException('You cannot end this live broadcast');
    }
    const ended = await this.prisma.roomLiveSession.update({
      where: { id: session.id },
      data: { status: RoomLiveStatus.ENDED, endedAt: new Date() },
      select: roomLiveSessionSelect,
    });
    this.viewerIdsBySession.delete(session.id);
    const message = await this.createRoomLiveMessage(
      session.roomId,
      actorId,
      'Room live ended',
    );
    return { session: ended, message };
  }

  addViewer(sessionId: string, userId: string) {
    const viewers = this.viewerIdsBySession.get(sessionId) ?? new Set<string>();
    viewers.add(userId);
    this.viewerIdsBySession.set(sessionId, viewers);
    return viewers.size;
  }

  removeViewer(sessionId: string, userId: string) {
    const viewers = this.viewerIdsBySession.get(sessionId);
    if (!viewers) return 0;
    viewers.delete(userId);
    if (viewers.size === 0) {
      this.viewerIdsBySession.delete(sessionId);
    }
    return viewers.size;
  }

  getViewerCount(sessionId: string) {
    return this.viewerIdsBySession.get(sessionId)?.size ?? 0;
  }

  private async createRoomLiveMessage(
    roomId: string,
    senderId: string,
    body: string,
  ) {
    return this.prisma.roomMessage.create({
      data: {
        roomId,
        senderId,
        kind: MessageKind.CALL,
        body,
      },
      select: roomLiveMessageSelect,
    });
  }

  private async createToken(
    session: Awaited<ReturnType<RoomLiveService['getActiveForRoom']>>,
    userId: string,
    role: RoomLiveRole,
  ) {
    if (!session) {
      throw new NotFoundException('No live broadcast is active');
    }
    const apiKey = process.env.LIVEKIT_API_KEY?.trim();
    const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
    const livekitUrl = process.env.LIVEKIT_URL?.trim();
    if (!apiKey || !apiSecret || !livekitUrl) {
      throw new BadRequestException('Live video is not configured');
    }
    const token = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: userId,
      ttl: '2h',
    });
    token.addGrant({
      room: session.roomName,
      roomJoin: true,
      canPublish: role === 'host',
      canSubscribe: true,
      canPublishData: true,
    });
    return {
      livekitUrl,
      token: await token.toJwt(),
      role,
    };
  }
}
