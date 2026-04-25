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
    const [unreadNotifications, incomingFriendRequests, outgoingFriendRequests, sentRows, recvRows] =
      await Promise.all([
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
          where: { senderId: userId },
          select: { recipientId: true },
        }),
        this.prisma.directMessage.findMany({
          where: { recipientId: userId },
          select: { senderId: true },
        }),
      ]);

    const peers = new Set<string>();
    for (const row of sentRows) {
      peers.add(row.recipientId);
    }
    for (const row of recvRows) {
      peers.add(row.senderId);
    }

    return {
      inboxCount: peers.size,
      unreadNotifications,
      incomingFriendRequests,
      outgoingFriendRequests,
    };
  }
}
