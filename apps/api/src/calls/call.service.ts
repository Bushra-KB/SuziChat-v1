import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { CallContext, CallMedia, CallStatus, MessageKind } from '@prisma/client';
import { ConversationsService } from '../conversations/conversations.service';
import { DatingService } from '../dating/dating.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsService } from '../rooms/rooms.service';

export interface ActiveCall {
  id: string;
  context: CallContext;
  contextKey: string;
  media: CallMedia;
  initiatorId: string;
  calleeId?: string;
  participants: Set<string>;
  invitedIds: Set<string>;
  status: CallStatus;
  accepted: boolean;
}

const ROOM_CALL_MAX = Number(process.env.ROOM_CALL_MAX ?? 6);

const callUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

const directCallMessageSelect = {
  id: true,
  kind: true,
  body: true,
  createdAt: true,
  attachments: { select: { id: true } },
  sender: { select: { ...callUserSelect, country: true } },
  recipient: { select: { id: true } },
} as const;

const roomCallMessageSelect = {
  id: true,
  kind: true,
  body: true,
  createdAt: true,
  attachments: { select: { id: true } },
  sender: { select: callUserSelect },
} as const;

const datingCallMessageSelect = {
  id: true,
  kind: true,
  body: true,
  createdAt: true,
  senderId: true,
  attachments: { select: { id: true } },
  sender: { select: callUserSelect },
} as const;

export type CallEventMessage =
  | {
      context: 'DM';
      message: Awaited<ReturnType<CallService['createDirectCallMessage']>>;
    }
  | {
      context: 'DATING';
      matchId: string;
      audienceIds: string[];
      message: Awaited<ReturnType<CallService['createDatingCallMessage']>>;
    }
  | {
      context: 'ROOM';
      roomSlug: string;
      message: Awaited<ReturnType<CallService['createRoomCallMessage']>>;
    };

/**
 * Holds the live registry of in-progress WebRTC calls and persists a lightweight
 * CallSession for history and missed-call notifications. Media never flows
 * through here; the gateway only relays SDP/ICE between participants.
 */
@Injectable()
export class CallService {
  private readonly logger = new Logger(CallService.name);
  private readonly calls = new Map<string, ActiveCall>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationsService,
    private readonly dating: DatingService,
    private readonly rooms: RoomsService,
  ) {}

  get roomCallMax() {
    return ROOM_CALL_MAX;
  }

  getCall(callId: string): ActiveCall | undefined {
    return this.calls.get(callId);
  }

  isParticipant(callId: string, userId: string): boolean {
    const call = this.calls.get(callId);
    return Boolean(call && call.participants.has(userId));
  }

  /** Validates a 1:1 DM call and returns the resolved peer summary. */
  async resolveDirectTarget(callerId: string, peerId: string) {
    return this.conversations.getPeer(callerId, peerId);
  }

  /** Validates a dating-match call and returns the peer user id. */
  async resolveDatingTarget(callerId: string, matchId: string) {
    const { peerId } = await this.dating.assertMatchParticipant(callerId, matchId);
    return peerId;
  }

  /** Validates that a user may open a voice call in a room. */
  async assertRoomCallAccess(userId: string, roomSlug: string) {
    const access = await this.rooms.getRoomAccess(roomSlug, userId);
    if (access.isBlocked || !access.canPost) {
      throw new ForbiddenException('You cannot start a call in this room');
    }
  }

  async createDirectCall(
    context: CallContext,
    contextKey: string,
    initiatorId: string,
    calleeId: string,
    media: CallMedia,
  ): Promise<ActiveCall> {
    const row = await this.prisma.callSession.create({
      data: {
        context,
        contextKey,
        initiatorId,
        media,
        status: CallStatus.RINGING,
        participantIds: [initiatorId, calleeId],
      },
      select: { id: true },
    });
    const call: ActiveCall = {
      id: row.id,
      context,
      contextKey,
      media,
      initiatorId,
      calleeId,
      participants: new Set([initiatorId]),
      invitedIds: new Set([calleeId]),
      status: CallStatus.RINGING,
      accepted: false,
    };
    this.calls.set(call.id, call);
    return call;
  }

  getUserActiveCall(userId: string): ActiveCall | undefined {
    for (const call of this.calls.values()) {
      if (call.participants.has(userId) || call.invitedIds.has(userId)) {
        return call;
      }
    }
    return undefined;
  }

  isUserBusy(userId: string) {
    return Boolean(this.getUserActiveCall(userId));
  }

  async createRoomCall(
    roomSlug: string,
    initiatorId: string,
  ): Promise<ActiveCall> {
    const row = await this.prisma.callSession.create({
      data: {
        context: CallContext.ROOM,
        contextKey: roomSlug,
        initiatorId,
        media: CallMedia.AUDIO,
        status: CallStatus.ONGOING,
        startedAt: new Date(),
        participantIds: [initiatorId],
      },
      select: { id: true },
    });
    const call: ActiveCall = {
      id: row.id,
      context: CallContext.ROOM,
      contextKey: roomSlug,
      media: CallMedia.AUDIO,
      initiatorId,
      participants: new Set([initiatorId]),
      invitedIds: new Set(),
      status: CallStatus.ONGOING,
      accepted: true,
    };
    this.calls.set(call.id, call);
    return call;
  }

  /** Finds an active audio call already running for a room, if any. */
  findRoomCall(roomSlug: string): ActiveCall | undefined {
    for (const call of this.calls.values()) {
      if (call.context === CallContext.ROOM && call.contextKey === roomSlug) {
        return call;
      }
    }
    return undefined;
  }

  addParticipant(callId: string, userId: string): ActiveCall | undefined {
    const call = this.calls.get(callId);
    if (!call) {
      return undefined;
    }
    if (
      call.context === CallContext.ROOM &&
      !call.participants.has(userId) &&
      call.participants.size >= ROOM_CALL_MAX
    ) {
      throw new ForbiddenException('This call is full');
    }
    call.participants.add(userId);
    call.invitedIds.delete(userId);
    return call;
  }

  async markAccepted(callId: string): Promise<ActiveCall | undefined> {
    const call = this.calls.get(callId);
    if (!call || call.accepted) {
      return call;
    }
    call.accepted = true;
    call.status = CallStatus.ONGOING;
    await this.persistStatus(callId, CallStatus.ONGOING, { startedAt: true });
    return call;
  }

  /** Removes a participant; returns true when the call has now ended. */
  async leaveParticipant(callId: string, userId: string): Promise<boolean> {
    const call = this.calls.get(callId);
    if (!call) {
      return true;
    }
    call.participants.delete(userId);
    const shouldEnd =
      call.context === CallContext.ROOM
        ? call.participants.size === 0
        : call.participants.size <= 1;
    if (shouldEnd) {
      await this.endCall(
        callId,
        call.accepted ? CallStatus.ENDED : CallStatus.MISSED,
      );
      return true;
    }
    return false;
  }

  async endCall(callId: string, status: CallStatus): Promise<ActiveCall | undefined> {
    const call = this.calls.get(callId);
    this.calls.delete(callId);
    await this.persistStatus(callId, status, { endedAt: true });
    return call;
  }

  async createCallEventMessage(
    call: ActiveCall,
    status: CallStatus,
    actorId = call.initiatorId,
  ): Promise<CallEventMessage | null> {
    const body = await this.callEventBody(call, status);
    if (call.context === CallContext.DM) {
      const calleeId = call.calleeId ?? [...call.invitedIds][0];
      if (!calleeId) return null;
      return {
        context: CallContext.DM,
        message: await this.createDirectCallMessage(
          call.initiatorId,
          calleeId,
          body,
        ),
      };
    }
    if (call.context === CallContext.DATING) {
      const audienceIds = await this.resolveDatingAudienceIds(call.contextKey);
      return {
        context: CallContext.DATING,
        matchId: call.contextKey,
        audienceIds,
        message: await this.createDatingCallMessage(
          call.contextKey,
          actorId,
          body,
        ),
      };
    }
    return {
      context: CallContext.ROOM,
      roomSlug: call.contextKey,
      message: await this.createRoomCallMessage(call.contextKey, actorId, body),
    };
  }

  async createDirectCallMessage(
    senderId: string,
    recipientId: string,
    body: string,
  ) {
    return this.prisma.directMessage.create({
      data: {
        senderId,
        recipientId,
        kind: MessageKind.CALL,
        body,
      },
      select: directCallMessageSelect,
    });
  }

  async createDatingCallMessage(matchId: string, senderId: string, body: string) {
    return this.prisma.datingMessage.create({
      data: {
        matchId,
        senderId,
        kind: MessageKind.CALL,
        body,
      },
      select: datingCallMessageSelect,
    });
  }

  async createRoomCallMessage(roomSlug: string, senderId: string, body: string) {
    const room = await this.prisma.room.findUnique({
      where: { slug: roomSlug },
      select: { id: true },
    });
    if (!room) {
      throw new ForbiddenException('Room not found');
    }
    return this.prisma.roomMessage.create({
      data: {
        roomId: room.id,
        senderId,
        kind: MessageKind.CALL,
        body,
      },
      select: roomCallMessageSelect,
    });
  }

  private async callEventBody(call: ActiveCall, status: CallStatus) {
    const media = call.media === CallMedia.VIDEO ? 'Video' : 'Audio';
    const isRoom = call.context === CallContext.ROOM;
    switch (status) {
      case CallStatus.UNAVAILABLE:
        return `${media} call unavailable`;
      case CallStatus.BUSY:
        return `${media} call busy`;
      case CallStatus.MISSED:
        return `Missed ${media.toLowerCase()} call`;
      case CallStatus.DECLINED:
        return `${media} call declined`;
      case CallStatus.CANCELED:
        return `${media} call canceled`;
      case CallStatus.ENDED: {
        const duration = await this.callDurationLabel(call.id);
        return isRoom
          ? `Room audio call ended${duration ? ` • ${duration}` : ''}`
          : `${media} call ended${duration ? ` • ${duration}` : ''}`;
      }
      default:
        return `${media} call`;
    }
  }

  private async callDurationLabel(callId: string) {
    const row = await this.prisma.callSession
      .findUnique({
        where: { id: callId },
        select: { startedAt: true, endedAt: true },
      })
      .catch(() => null);
    if (!row?.startedAt) return '';
    const endedAt = row.endedAt ?? new Date();
    const totalSeconds = Math.max(
      0,
      Math.round((endedAt.getTime() - row.startedAt.getTime()) / 1000),
    );
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = `${totalSeconds % 60}`.padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  private async resolveDatingAudienceIds(matchId: string) {
    const match = await this.prisma.datingMatch.findUnique({
      where: { id: matchId },
      select: { userAId: true, userBId: true },
    });
    return match ? [match.userAId, match.userBId] : [];
  }

  /** Sends an in-app missed-call notification to the callee. */
  async notifyMissedCall(call: ActiveCall, calleeId: string, callerName: string) {
    if (call.context === CallContext.ROOM) {
      return;
    }
    const href =
      call.context === CallContext.DM
        ? `/app/messages?with=${encodeURIComponent(
            call.initiatorId === calleeId ? '' : call.initiatorId,
          )}`
        : `/app/dating?panel=inbox&match=${encodeURIComponent(call.contextKey)}`;
    await this.prisma.notification
      .create({
        data: {
          userId: calleeId,
          title: 'Missed call',
          body: `${callerName} tried to ${call.media === CallMedia.VIDEO ? 'video' : 'voice'} call you`,
          href,
        },
      })
      .catch(() => undefined);
  }

  private async persistStatus(
    callId: string,
    status: CallStatus,
    timestamps: { startedAt?: boolean; endedAt?: boolean } = {},
  ) {
    await this.prisma.callSession
      .update({
        where: { id: callId },
        data: {
          status,
          ...(timestamps.startedAt ? { startedAt: new Date() } : {}),
          ...(timestamps.endedAt ? { endedAt: new Date() } : {}),
        },
      })
      .catch((err: unknown) => {
        this.logger.warn(
          `Failed to persist call ${callId} status=${status}: ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        );
      });
  }
}
