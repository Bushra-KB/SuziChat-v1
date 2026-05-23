import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { RealtimeStateService } from '../realtime/realtime-state.service';

const friendUserSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  country: true,
} as const;

function normalizeIdentifier(value: string) {
  return value.trim();
}

@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEvents: RealtimeEventsService,
    private readonly realtimeState: RealtimeStateService,
  ) {}

  private async emitState(userIds: string[]) {
    await Promise.all(
      [...new Set(userIds)].map(async (id) => {
        const state = await this.realtimeState.buildUserState(id);
        this.realtimeEvents.emitToUser(id, 'realtime:state', state);
      }),
    );
  }

  private async getRelationshipExclusionIds(userId: string) {
    const [friends, outgoing, incoming, blockedByMe, blockedMe] =
      await Promise.all([
        this.prisma.friendship.findMany({
          where: { userId },
          select: { friendId: true },
        }),
        this.prisma.friendRequest.findMany({
          where: { senderId: userId, status: FriendRequestStatus.PENDING },
          select: { receiverId: true },
        }),
        this.prisma.friendRequest.findMany({
          where: { receiverId: userId, status: FriendRequestStatus.PENDING },
          select: { senderId: true },
        }),
        this.prisma.userBlock.findMany({
          where: { blockerId: userId },
          select: { blockedId: true },
        }),
        this.prisma.userBlock.findMany({
          where: { blockedId: userId },
          select: { blockerId: true },
        }),
      ]);

    return new Set<string>([
      userId,
      ...friends.map((row) => row.friendId),
      ...outgoing.map((row) => row.receiverId),
      ...incoming.map((row) => row.senderId),
      ...blockedByMe.map((row) => row.blockedId),
      ...blockedMe.map((row) => row.blockerId),
    ]);
  }

  async getSummary(userId: string) {
    const [friends, incomingRequests, outgoingRequests] = await Promise.all([
      this.prisma.friendship.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          friend: {
            select: friendUserSelect,
          },
        },
      }),
      this.prisma.friendRequest.findMany({
        where: {
          receiverId: userId,
          status: FriendRequestStatus.PENDING,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          sender: {
            select: friendUserSelect,
          },
        },
      }),
      this.prisma.friendRequest.findMany({
        where: {
          senderId: userId,
          status: FriendRequestStatus.PENDING,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          receiver: {
            select: friendUserSelect,
          },
        },
      }),
    ]);

    return {
      friends: friends.map((item) => ({
        friendshipId: item.id,
        createdAt: item.createdAt,
        ...item.friend,
      })),
      incomingRequests: incomingRequests.map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        user: item.sender,
      })),
      outgoingRequests: outgoingRequests.map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        user: item.receiver,
      })),
    };
  }

  async getSuggestions(userId: string, take = 12) {
    const excluded = await this.getRelationshipExclusionIds(userId);
    const users = await this.prisma.user.findMany({
      where: {
        id: { notIn: [...excluded] },
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: friendUserSelect,
    });
    return users;
  }

  async exploreUsers(userId: string, query: string, take = 24) {
    const excluded = await this.getRelationshipExclusionIds(userId);
    const q = query.trim();
    const users = await this.prisma.user.findMany({
      where: {
        id: { notIn: [...excluded] },
        ...(q
          ? {
              OR: [
                { username: { contains: q, mode: 'insensitive' } },
                { displayName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { country: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      take,
      select: friendUserSelect,
    });
    return users;
  }

  async listBlockedUsers(userId: string) {
    const blocks = await this.prisma.userBlock.findMany({
      where: { blockerId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        blocked: { select: friendUserSelect },
      },
    });

    return blocks.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      user: row.blocked,
    }));
  }

  async sendRequest(userId: string, usernameOrEmail: string) {
    const identifier = normalizeIdentifier(usernameOrEmail);

    if (!identifier) {
      throw new BadRequestException('Username or email is required');
    }

    const targetUser = await this.prisma.user.findFirst({
      where: identifier.includes('@')
        ? { email: identifier.toLowerCase() }
        : { username: identifier },
      select: friendUserSelect,
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.id === userId) {
      throw new BadRequestException(
        'You cannot send a friend request to yourself',
      );
    }

    const [
      existingFriendship,
      outgoingRequest,
      incomingRequest,
      userBlockedTarget,
      targetBlockedUser,
    ] = await Promise.all([
      this.prisma.friendship.findFirst({
        where: {
          userId,
          friendId: targetUser.id,
        },
      }),
      this.prisma.friendRequest.findUnique({
        where: {
          senderId_receiverId: {
            senderId: userId,
            receiverId: targetUser.id,
          },
        },
      }),
      this.prisma.friendRequest.findUnique({
        where: {
          senderId_receiverId: {
            senderId: targetUser.id,
            receiverId: userId,
          },
        },
      }),
      this.prisma.userBlock.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: userId,
            blockedId: targetUser.id,
          },
        },
      }),
      this.prisma.userBlock.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: targetUser.id,
            blockedId: userId,
          },
        },
      }),
    ]);

    if (userBlockedTarget || targetBlockedUser) {
      throw new ConflictException('Friend request unavailable for this user');
    }

    if (existingFriendship) {
      throw new ConflictException('You are already friends');
    }

    if (incomingRequest?.status === FriendRequestStatus.PENDING) {
      throw new ConflictException(
        'This user has already sent you a friend request',
      );
    }

    if (outgoingRequest?.status === FriendRequestStatus.PENDING) {
      throw new ConflictException('Friend request already sent');
    }

    const friendRequest = outgoingRequest
      ? await this.prisma.friendRequest.update({
          where: {
            senderId_receiverId: {
              senderId: userId,
              receiverId: targetUser.id,
            },
          },
          data: {
            status: FriendRequestStatus.PENDING,
          },
          select: {
            id: true,
            createdAt: true,
            receiver: {
              select: friendUserSelect,
            },
          },
        })
      : await this.prisma.friendRequest.create({
          data: {
            senderId: userId,
            receiverId: targetUser.id,
          },
          select: {
            id: true,
            createdAt: true,
            receiver: {
              select: friendUserSelect,
            },
          },
        });

    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, displayName: true },
    });

    await this.prisma.notification
      .create({
        data: {
          userId: targetUser.id,
          title: 'Friend request',
          body: `${sender?.displayName ?? sender?.username ?? 'Someone'} sent you a friend request`,
        },
      })
      .catch(() => undefined);

    this.realtimeEvents.emitToUser(targetUser.id, 'friends:update', {
      reason: 'request_received',
    });
    this.realtimeEvents.emitToUser(userId, 'friends:update', {
      reason: 'request_sent',
    });
    this.realtimeEvents.emitToUser(targetUser.id, 'notifications:update', {
      reason: 'friend_request',
    });
    await this.emitState([targetUser.id, userId]);

    return {
      id: friendRequest.id,
      createdAt: friendRequest.createdAt,
      user: friendRequest.receiver,
    };
  }

  async acceptRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findFirst({
      where: {
        id: requestId,
        receiverId: userId,
        status: FriendRequestStatus.PENDING,
      },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        sender: {
          select: friendUserSelect,
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    const eitherBlocked = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: request.senderId },
          { blockerId: request.senderId, blockedId: userId },
        ],
      },
      select: { id: true },
    });

    if (eitherBlocked) {
      throw new ConflictException('Cannot accept request for blocked user');
    }

    await this.prisma.$transaction([
      this.prisma.friendRequest.update({
        where: { id: request.id },
        data: {
          status: FriendRequestStatus.ACCEPTED,
        },
      }),
      this.prisma.friendship.createMany({
        data: [
          {
            userId,
            friendId: request.senderId,
          },
          {
            userId: request.senderId,
            friendId: userId,
          },
        ],
        skipDuplicates: true,
      }),
    ]);

    this.realtimeEvents.emitToUser(userId, 'friends:update', {
      reason: 'request_accepted',
    });
    this.realtimeEvents.emitToUser(request.senderId, 'friends:update', {
      reason: 'request_accepted',
    });
    await this.emitState([userId, request.senderId]);

    return {
      message: 'Friend request accepted',
      user: request.sender,
    };
  }

  async declineRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findFirst({
      where: {
        id: requestId,
        receiverId: userId,
        status: FriendRequestStatus.PENDING,
      },
      select: {
        id: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    await this.prisma.friendRequest.update({
      where: { id: request.id },
      data: {
        status: FriendRequestStatus.DECLINED,
      },
    });

    this.realtimeEvents.emitToUser(userId, 'friends:update', {
      reason: 'request_declined',
    });
    await this.emitState([userId]);

    return {
      message: 'Friend request declined',
    };
  }

  async cancelOutgoingRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findFirst({
      where: {
        id: requestId,
        senderId: userId,
        status: FriendRequestStatus.PENDING,
      },
      select: { id: true },
    });

    if (!request) {
      throw new NotFoundException('Outgoing request not found');
    }

    await this.prisma.friendRequest.update({
      where: { id: request.id },
      data: { status: FriendRequestStatus.CANCELED },
    });

    this.realtimeEvents.emitToUser(userId, 'friends:update', {
      reason: 'request_canceled',
    });
    await this.emitState([userId]);

    return { message: 'Outgoing friend request canceled' };
  }

  async unfriend(userId: string, friendId: string) {
    const result = await this.prisma.friendship.deleteMany({
      where: {
        OR: [
          {
            userId,
            friendId,
          },
          {
            userId: friendId,
            friendId: userId,
          },
        ],
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Friendship not found');
    }

    this.realtimeEvents.emitToUser(userId, 'friends:update', {
      reason: 'unfriend',
    });
    this.realtimeEvents.emitToUser(friendId, 'friends:update', {
      reason: 'unfriend',
    });
    await this.emitState([userId, friendId]);

    return {
      message: 'Friend removed',
    };
  }

  async blockUser(userId: string, blockedId: string) {
    if (userId === blockedId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: blockedId },
      select: friendUserSelect,
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return { message: 'User already blocked', user: target };
    }

    await this.prisma.$transaction([
      this.prisma.userBlock.create({
        data: {
          blockerId: userId,
          blockedId,
        },
      }),
      this.prisma.friendship.deleteMany({
        where: {
          OR: [
            { userId, friendId: blockedId },
            { userId: blockedId, friendId: userId },
          ],
        },
      }),
      this.prisma.friendRequest.deleteMany({
        where: {
          OR: [
            {
              senderId: userId,
              receiverId: blockedId,
              status: FriendRequestStatus.PENDING,
            },
            {
              senderId: blockedId,
              receiverId: userId,
              status: FriendRequestStatus.PENDING,
            },
          ],
        },
      }),
    ]);

    this.realtimeEvents.emitToUser(userId, 'friends:update', {
      reason: 'block',
    });
    this.realtimeEvents.emitToUser(blockedId, 'friends:update', {
      reason: 'blocked_by_other',
    });
    await this.emitState([userId, blockedId]);

    return { message: 'User blocked', user: target };
  }

  async unblockUser(userId: string, blockedId: string) {
    const removed = await this.prisma.userBlock.deleteMany({
      where: {
        blockerId: userId,
        blockedId,
      },
    });

    if (!removed.count) {
      throw new NotFoundException('Blocked user not found');
    }

    this.realtimeEvents.emitToUser(userId, 'friends:update', {
      reason: 'unblock',
    });
    await this.emitState([userId]);

    return { message: 'User unblocked' };
  }
}
