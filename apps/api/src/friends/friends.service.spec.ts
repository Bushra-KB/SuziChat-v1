import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { FriendRequestStatus } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { FriendsService } from './friends.service';

describe('FriendsService', () => {
  let friendsService: FriendsService;
  const prismaMock = {
    user: {
      findFirst: jest.fn(),
    },
    friendRequest: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    friendship: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    friendsService = module.get(FriendsService);
  });

  beforeEach(() => {
    prismaMock.user.findFirst.mockReset();
    prismaMock.friendRequest.findMany.mockReset();
    prismaMock.friendRequest.findUnique.mockReset();
    prismaMock.friendRequest.findFirst.mockReset();
    prismaMock.friendRequest.create.mockReset();
    prismaMock.friendRequest.update.mockReset();
    prismaMock.friendship.findMany.mockReset();
    prismaMock.friendship.findFirst.mockReset();
    prismaMock.friendship.deleteMany.mockReset();
    prismaMock.friendship.createMany.mockReset();
    prismaMock.$transaction.mockReset();
  });

  it('returns a friend summary', async () => {
    prismaMock.friendship.findMany.mockResolvedValueOnce([
      {
        id: 'friendship_1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        friend: {
          id: 'user_2',
          email: 'friend@example.com',
          username: 'frienduser',
          displayName: 'Friend User',
          country: 'Ireland',
        },
      },
    ]);
    prismaMock.friendRequest.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(friendsService.getSummary('user_1')).resolves.toMatchObject({
      friends: [
        {
          id: 'user_2',
          username: 'frienduser',
        },
      ],
      incomingRequests: [],
      outgoingRequests: [],
    });
  });

  it('sends a friend request by username', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 'user_2',
      email: 'friend@example.com',
      username: 'frienduser',
      displayName: 'Friend User',
      country: 'Ireland',
    });
    prismaMock.friendship.findFirst.mockResolvedValueOnce(null);
    prismaMock.friendRequest.findUnique.mockResolvedValueOnce(null);
    prismaMock.friendRequest.findUnique.mockResolvedValueOnce(null);
    prismaMock.friendRequest.create.mockResolvedValueOnce({
      id: 'request_1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      receiver: {
        id: 'user_2',
        email: 'friend@example.com',
        username: 'frienduser',
        displayName: 'Friend User',
        country: 'Ireland',
      },
    });

    await expect(
      friendsService.sendRequest('user_1', 'frienduser'),
    ).resolves.toMatchObject({
      id: 'request_1',
      user: {
        id: 'user_2',
      },
    });
  });

  it('rejects self friend requests', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 'user_1',
      email: 'self@example.com',
      username: 'selfuser',
      displayName: null,
      country: null,
    });

    await expect(
      friendsService.sendRequest('user_1', 'selfuser'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a pending friend request', async () => {
    prismaMock.friendRequest.findFirst.mockResolvedValueOnce({
      id: 'request_1',
      senderId: 'user_2',
      receiverId: 'user_1',
      sender: {
        id: 'user_2',
        email: 'friend@example.com',
        username: 'frienduser',
        displayName: 'Friend User',
        country: 'Ireland',
      },
    });
    prismaMock.$transaction.mockResolvedValueOnce([]);

    await expect(
      friendsService.acceptRequest('user_1', 'request_1'),
    ).resolves.toMatchObject({
      message: 'Friend request accepted',
      user: {
        id: 'user_2',
      },
    });

    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it('declines a pending friend request', async () => {
    prismaMock.friendRequest.findFirst.mockResolvedValueOnce({
      id: 'request_1',
    });
    prismaMock.friendRequest.update.mockResolvedValueOnce({
      id: 'request_1',
      status: FriendRequestStatus.DECLINED,
    });

    await expect(
      friendsService.declineRequest('user_1', 'request_1'),
    ).resolves.toEqual({
      message: 'Friend request declined',
    });
  });

  it('unfriends an existing friend', async () => {
    prismaMock.friendship.deleteMany.mockResolvedValueOnce({
      count: 2,
    });

    await expect(friendsService.unfriend('user_1', 'user_2')).resolves.toEqual({
      message: 'Friend removed',
    });
  });

  it('rejects duplicate outgoing requests', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 'user_2',
      email: 'friend@example.com',
      username: 'frienduser',
      displayName: 'Friend User',
      country: 'Ireland',
    });
    prismaMock.friendship.findFirst.mockResolvedValueOnce(null);
    prismaMock.friendRequest.findUnique.mockResolvedValueOnce({
      id: 'request_1',
      status: FriendRequestStatus.PENDING,
    });
    prismaMock.friendRequest.findUnique.mockResolvedValueOnce(null);

    await expect(
      friendsService.sendRequest('user_1', 'frienduser'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when unfriending a non-friend', async () => {
    prismaMock.friendship.deleteMany.mockResolvedValueOnce({
      count: 0,
    });

    await expect(
      friendsService.unfriend('user_1', 'user_9'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
