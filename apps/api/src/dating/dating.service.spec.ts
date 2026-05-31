import { ForbiddenException } from '@nestjs/common';
import { DatingSwipeAction } from '@prisma/client';
import { DatingService } from './dating.service';

describe('DatingService', () => {
  const realtimeEvents = {
    emitToUser: jest.fn(),
  };
  const realtimeState = {
    buildUserState: jest.fn().mockResolvedValue({}),
  };

  const prisma = {
    datingProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    userBlock: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    datingSwipe: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    datingMatch: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    datingMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    notification: {
      create: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  let service: DatingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DatingService(
      prisma as never,
      realtimeEvents as never,
      realtimeState as never,
    );
  });

  it('discover requires a dating profile', async () => {
    prisma.datingProfile.findUnique.mockResolvedValue(null);
    await expect(service.discover('u1', {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('swipe returns no match on pass', async () => {
    prisma.datingProfile.findUnique.mockResolvedValue({
      userId: 'target',
      isDiscoverable: true,
    });
    prisma.datingSwipe.upsert.mockResolvedValue({});
    const result = await service.swipe('viewer', {
      toUserId: 'target',
      action: DatingSwipeAction.PASS,
    });
    expect(result.matched).toBe(false);
    expect(result.match).toBeNull();
  });
});
