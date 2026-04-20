import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const friendUserSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  country: true,
} as const;

function normalizeIdentifier(value: string) {
  return value.trim();
}

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

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

    const [existingFriendship, outgoingRequest, incomingRequest] =
      await Promise.all([
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
      ]);

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

    return {
      message: 'Friend request declined',
    };
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

    return {
      message: 'Friend removed',
    };
  }
}
