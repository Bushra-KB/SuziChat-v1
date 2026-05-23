import { Injectable } from '@nestjs/common';
import { FriendRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type RealtimeUserState = {
  inboxCount: number;
  unreadNotifications: number;
  incomingFriendRequests: number;
  outgoingFriendRequests: number;
};

@Injectable()
export class RealtimeStateService {
  constructor(private readonly prisma: PrismaService) {}

  async buildUserState(userId: string): Promise<RealtimeUserState> {
    const [
      unreadNotifications,
      incomingFriendRequests,
      outgoingFriendRequests,
      messages,
      states,
    ] = await Promise.all([
      this.prisma.notification.count({
        where: { userId, read: false },
      }),
      this.prisma.friendRequest.count({
        where: { receiverId: userId, status: FriendRequestStatus.PENDING },
      }),
      this.prisma.friendRequest.count({
        where: { senderId: userId, status: FriendRequestStatus.PENDING },
      }),
      this.prisma.directMessage.findMany({
        where: {
          OR: [{ senderId: userId }, { recipientId: userId }],
        },
        orderBy: { createdAt: 'desc' },
        select: { senderId: true, recipientId: true, createdAt: true },
      }),
      this.prisma.directConversationState.findMany({
        where: { userId },
        select: { peerId: true, clearedAt: true },
      }),
    ]);

    const clearedByPeer = new Map(
      states.map((state) => [state.peerId, state.clearedAt]),
    );
    const peers = new Set<string>();
    for (const row of messages) {
      const peerId = row.senderId === userId ? row.recipientId : row.senderId;
      const clearedAt = clearedByPeer.get(peerId);
      if (clearedAt && row.createdAt <= clearedAt) {
        continue;
      }
      peers.add(peerId);
    }

    return {
      inboxCount: peers.size,
      unreadNotifications,
      incomingFriendRequests,
      outgoingFriendRequests,
    };
  }
}
