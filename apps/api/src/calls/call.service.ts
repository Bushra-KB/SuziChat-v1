import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { CallContext, CallMedia, CallStatus } from '@prisma/client';
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
  participants: Set<string>;
  invitedIds: Set<string>;
  status: CallStatus;
  accepted: boolean;
}

const ROOM_CALL_MAX = Number(process.env.ROOM_CALL_MAX ?? 6);

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
      participants: new Set([initiatorId]),
      invitedIds: new Set([calleeId]),
      status: CallStatus.RINGING,
      accepted: false,
    };
    this.calls.set(call.id, call);
    return call;
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
      await this.endCall(callId, CallStatus.ENDED);
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
