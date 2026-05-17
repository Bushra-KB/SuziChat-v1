import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GameType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { GamesMetricsService } from './games-metrics.service';
import { GamesService } from './games.service';

describe('GamesService', () => {
  let service: GamesService;
  const prisma = {
    gameLobby: { findUnique: jest.fn() },
    gameSession: { findUnique: jest.fn() },
    gameEvent: { create: jest.fn() },
  };
  const realtime = { emitToUser: jest.fn(), emitToChannel: jest.fn() };
  const metrics = {
    recordSessionActionOk: jest.fn(),
    recordSessionActionFailed: jest.fn(),
    recordSocketRateLimited: jest.fn(),
    recordSocketLobbyJoin: jest.fn(),
    recordSocketSessionJoin: jest.fn(),
    recordSocketLobbyJoinDenied: jest.fn(),
    recordSocketSessionJoinDenied: jest.fn(),
    getOperationalSnapshot: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GamesService,
        { provide: PrismaService, useValue: prisma },
        { provide: RealtimeEventsService, useValue: realtime },
        { provide: GamesMetricsService, useValue: metrics },
      ],
    }).compile();
    service = moduleRef.get(GamesService);
  });

  it('sendInvite rejects users who are neither owner nor seated', async () => {
    prisma.gameLobby.findUnique.mockResolvedValue({
      id: 'lobby1',
      ownerId: 'owner1',
      isPrivate: false,
      gameType: GameType.CHESS,
      title: 'Table',
      seats: [{ userId: 'owner1', seatIndex: 0 }],
    });
    await expect(
      service.sendInvite('lobby1', 'outsider', 'target'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assertSessionSocketSubscription allows lobby owner', async () => {
    prisma.gameSession.findUnique.mockResolvedValue({
      id: 'sess1',
      lobbyId: 'lobby1',
      lobby: {
        ownerId: 'owner1',
        seats: [{ userId: 'p2', seatIndex: 0 }],
      },
    });
    await expect(
      service.assertSessionSocketSubscription('sess1', 'owner1'),
    ).resolves.toBeDefined();
  });

  it('assertSessionViewAccess allows strangers on public lobbies', async () => {
    prisma.gameSession.findUnique.mockResolvedValue({
      id: 'sess1',
      lobbyId: 'lobby1',
      lobby: {
        ownerId: 'owner1',
        isPrivate: false,
        seats: [{ userId: 'p2', seatIndex: 0 }],
      },
    });
    await expect(
      service.assertSessionViewAccess('sess1', 'stranger'),
    ).resolves.toBeDefined();
  });

  it('assertSessionViewAccess rejects strangers on private lobbies', async () => {
    prisma.gameSession.findUnique.mockResolvedValue({
      id: 'sess1',
      lobbyId: 'lobby1',
      lobby: {
        ownerId: 'owner1',
        isPrivate: true,
        seats: [{ userId: 'p2', seatIndex: 0 }],
      },
    });
    prisma.gameLobby.findUnique.mockResolvedValue({
      id: 'lobby1',
      ownerId: 'owner1',
      isPrivate: true,
      seats: [{ userId: 'p2', seatIndex: 0 }],
    });
    await expect(
      service.assertSessionViewAccess('sess1', 'stranger'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sendSessionChat blocks spectators when watcher chat is disabled', async () => {
    prisma.gameSession.findUnique.mockResolvedValue({
      id: 'sess1',
      lobbyId: 'lobby1',
      lobby: {
        ownerId: 'owner1',
        isPrivate: false,
        settings: { allowSpectatorChat: false },
        seats: [{ userId: 'p2', seatIndex: 0 }],
      },
    });
    await expect(
      service.sendSessionChat('sess1', 'stranger', 'hello'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assertSessionSocketSubscription throws when session missing', async () => {
    prisma.gameSession.findUnique.mockResolvedValue(null);
    await expect(
      service.assertSessionSocketSubscription('missing', 'u1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
