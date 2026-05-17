import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GameEventType,
  GameLobbyStatus,
  GameSeatStatus,
  GameSessionStatus,
  GameType,
  MoveKind,
  PokerRound,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { GamesMetricsService } from './games-metrics.service';
import {
  applyChessAction,
  buildInitialChessState,
} from './engines/chess.engine';
import {
  applyCheckersAction,
  buildInitialCheckersState,
} from './engines/checkers.engine';
import {
  applyConnect4Action,
  buildInitialConnect4State,
} from './engines/connect4.engine';
import type { EngineContext, SeatSnapshot } from './engines/game-engine.types';
import {
  applyPokerAction,
  buildInitialPokerState,
  buildNextPokerHand,
} from './engines/poker-holdem.engine';
import { CreateGameLobbyDto } from './dto/create-game-lobby.dto';
import { GameActionDto } from './dto/game-action.dto';
import { JoinGameLobbyDto } from './dto/join-game-lobby.dto';
import { StartGameSessionDto } from './dto/start-game-session.dto';
import {
  mergeGameLobbySettings,
  parseGameLobbySettings,
} from './game-lobby-settings';

const GAME_CATALOG = [
  {
    id: 'chess',
    gameType: GameType.CHESS,
    name: 'Chess',
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    id: 'checkers',
    gameType: GameType.CHECKERS,
    name: 'Checkers',
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    id: 'poker',
    gameType: GameType.POKER_HOLDEM,
    name: 'Poker',
    minPlayers: 2,
    maxPlayers: 9,
  },
  {
    id: 'connect4',
    gameType: GameType.CONNECT4,
    name: 'Connect 4',
    minPlayers: 2,
    maxPlayers: 2,
  },
] as const;

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function safeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function jsonPrimitiveString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  return fallback;
}

function gameTypeToRouteId(gameType: GameType) {
  if (gameType === GameType.POKER_HOLDEM) return 'poker';
  return gameType.toLowerCase();
}

type LobbySeatRow = { seatIndex: number; userId: string | null };

function catalogEntry(gameType: GameType) {
  const entry = GAME_CATALOG.find((item) => item.gameType === gameType);
  if (!entry) throw new BadRequestException('Unknown game type.');
  return entry;
}

function countSeated(seats: LobbySeatRow[]) {
  return seats.filter((seat) => seat.userId).length;
}

function lobbyStatusForSeats(
  gameType: GameType,
  seats: LobbySeatRow[],
): GameLobbyStatus {
  const catalog = catalogEntry(gameType);
  const seated = countSeated(seats);
  if (seated === 0) return GameLobbyStatus.EMPTY;
  if (seated < catalog.minPlayers) return GameLobbyStatus.WAITING;
  return GameLobbyStatus.OPEN;
}

const LOBBY_SEATABLE: GameLobbyStatus[] = [
  GameLobbyStatus.EMPTY,
  GameLobbyStatus.WAITING,
  GameLobbyStatus.OPEN,
];

function assertSeatPick(
  gameType: GameType,
  seats: LobbySeatRow[],
  seatIndex: number,
) {
  const catalog = catalogEntry(gameType);
  const target = seats.find((row) => row.seatIndex === seatIndex);
  if (!target) throw new BadRequestException('Seat does not exist.');
  if (target.userId) throw new BadRequestException('Seat already taken.');

  const seated = seats
    .filter((row) => row.userId)
    .sort((a, b) => a.seatIndex - b.seatIndex);

  if (seated.length === 0) {
    if (seatIndex !== 0) {
      throw new BadRequestException('The first player must take seat 1.');
    }
    return;
  }

  if (catalog.minPlayers === 2 && catalog.maxPlayers === 2) {
    const seat0Taken = Boolean(
      seats.find((row) => row.seatIndex === 0)?.userId,
    );
    if (seated.length === 1) {
      if (seat0Taken && seatIndex !== 1) {
        throw new BadRequestException('The second player must take seat 2.');
      }
      if (!seat0Taken) {
        throw new BadRequestException(
          'Seat 1 must be taken before seat 2.',
        );
      }
    }
    return;
  }
}

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEvents: RealtimeEventsService,
    private readonly gamesMetrics: GamesMetricsService,
  ) {}

  private lobbyChannel(lobbyId: string) {
    return `game:lobby:${lobbyId}`;
  }

  private sessionChannel(sessionId: string) {
    return `game:session:${sessionId}`;
  }

  /** Broadcast room for lobby list UIs (games hub + per-game lobby pages). */
  private readonly lobbyListBroadcastChannel = 'game:lobbies';

  private emitLobbyListRefresh(gameType: GameType) {
    this.realtimeEvents.emitToChannel(
      this.lobbyListBroadcastChannel,
      'game:lobbies:update',
      { gameType },
    );
  }

  listCatalog() {
    return GAME_CATALOG;
  }

  async listLobbies(gameType?: GameType) {
    const lobbies = await this.prisma.gameLobby.findMany({
      where: {
        status: {
          in: [
            GameLobbyStatus.EMPTY,
            GameLobbyStatus.WAITING,
            GameLobbyStatus.OPEN,
            GameLobbyStatus.IN_PROGRESS,
          ],
        },
        ...(gameType ? { gameType } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        seats: {
          orderBy: { seatIndex: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true, createdAt: true, gameType: true },
        },
      },
    });
    await Promise.all(
      lobbies.map(async (lobby) => {
        const next = await this.reconcileLobbyPlayState(lobby.id);
        if (next) lobby.status = next;
      }),
    );
    return lobbies;
  }

  async getLobby(lobbyId: string) {
    const lobby = await this.prisma.gameLobby.findUnique({
      where: { id: lobbyId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        seats: {
          orderBy: { seatIndex: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        sessions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!lobby) throw new NotFoundException('Lobby not found.');
    const next = await this.reconcileLobbyPlayState(lobbyId);
    if (next) lobby.status = next;
    return lobby;
  }

  /**
   * Keeps lobby status aligned with seats and whether a session is ACTIVE.
   * Fixes stale IN_PROGRESS lobbies after a game ends.
   */
  private async reconcileLobbyPlayState(
    lobbyId: string,
  ): Promise<GameLobbyStatus | null> {
    const lobby = await this.prisma.gameLobby.findUnique({
      where: { id: lobbyId },
      include: {
        seats: { orderBy: { seatIndex: 'asc' } },
        sessions: {
          where: { status: GameSessionStatus.ACTIVE },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!lobby) return null;

    const nextStatus = lobby.sessions.length
      ? GameLobbyStatus.IN_PROGRESS
      : lobbyStatusForSeats(lobby.gameType, lobby.seats);

    if (nextStatus === lobby.status) return lobby.status;

    await this.prisma.gameLobby.update({
      where: { id: lobbyId },
      data: { status: nextStatus },
    });
    this.emitLobbyListRefresh(lobby.gameType);
    this.realtimeEvents.emitToChannel(
      this.lobbyChannel(lobbyId),
      'game:lobby:update',
      await this.getLobby(lobbyId),
    );
    return nextStatus;
  }

  private async syncLobbyStatusFromSeats(lobbyId: string) {
    await this.reconcileLobbyPlayState(lobbyId);
    return this.getLobby(lobbyId);
  }

  async createLobby(ownerId: string, dto: CreateGameLobbyDto) {
    const catalog = catalogEntry(dto.gameType);
    const existing = await this.prisma.gameLobby.findFirst({
      where: {
        ownerId,
        gameType: dto.gameType,
        status: {
          in: [
            GameLobbyStatus.EMPTY,
            GameLobbyStatus.WAITING,
            GameLobbyStatus.OPEN,
            GameLobbyStatus.IN_PROGRESS,
          ],
        },
      },
      select: { id: true, title: true },
    });
    if (existing) {
      throw new BadRequestException(
        `You already have an active ${catalog.name} lobby ("${existing.title}"). Delete it before creating another.`,
      );
    }
    const maxSeats = Math.max(
      catalog.minPlayers,
      Math.min(catalog.maxPlayers, dto.maxSeats ?? catalog.maxPlayers),
    );
    const slugBase = safeSlug(dto.title) || dto.gameType.toLowerCase();
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 7)}`;

    const lobby = await this.prisma.gameLobby.create({
      data: {
        slug,
        gameType: dto.gameType,
        title: dto.title.trim(),
        ownerId,
        maxSeats,
        isPrivate: Boolean(dto.isPrivate),
        settings: toJson(dto.settings ?? {}),
        status: GameLobbyStatus.EMPTY,
      },
    });
    await this.prisma.gameSeat.createMany({
      data: Array.from({ length: maxSeats }, (_, seatIndex) => ({
        lobbyId: lobby.id,
        seatIndex,
        status: GameSeatStatus.OPEN,
      })),
    });
    const created = await this.getLobby(lobby.id);
    this.emitLobbyListRefresh(dto.gameType);
    return created;
  }

  /**
   * Same rules as lobby REST APIs — required before subscribing to lobby realtime channel.
   */
  async assertLobbySocketSubscription(lobbyId: string, userId: string) {
    await this.ensureLobbyAccess(lobbyId, userId);
  }

  /**
   * Authenticated users may watch public sessions; private lobbies require lobby access.
   */
  async assertSessionViewAccess(sessionId: string, userId: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { lobby: { include: { seats: true } } },
    });
    if (!session) throw new NotFoundException('Session not found.');
    if (session.lobby.isPrivate) {
      await this.ensureLobbyAccess(session.lobbyId, userId);
    }
    return session;
  }

  /** @deprecated Use assertSessionViewAccess — kept for existing call sites. */
  async assertSessionSocketSubscription(sessionId: string, userId: string) {
    return this.assertSessionViewAccess(sessionId, userId);
  }

  async getSessionWatcherMeta(sessionId: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        lobby: {
          select: {
            id: true,
            ownerId: true,
            settings: true,
            seats: { select: { userId: true } },
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Session not found.');
    const settings = parseGameLobbySettings(session.lobby.settings);
    return {
      sessionId,
      lobbyId: session.lobbyId,
      ownerId: session.lobby.ownerId,
      seatedUserIds: session.lobby.seats
        .map((seat) => seat.userId)
        .filter((id): id is string => Boolean(id)),
      allowSpectatorChat: settings.allowSpectatorChat,
    };
  }

  async updateLobbySettings(
    lobbyId: string,
    userId: string,
    patch: { allowSpectatorChat?: boolean },
  ) {
    const lobby = await this.prisma.gameLobby.findUnique({
      where: { id: lobbyId },
      include: {
        sessions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!lobby) throw new NotFoundException('Lobby not found.');
    if (lobby.ownerId !== userId) {
      throw new ForbiddenException('Only the lobby owner can change settings.');
    }
    const settings = mergeGameLobbySettings(lobby.settings, patch);
    await this.prisma.gameLobby.update({
      where: { id: lobbyId },
      data: { settings },
    });
    const snapshot = await this.getLobby(lobbyId);
    this.realtimeEvents.emitToChannel(
      this.lobbyChannel(lobbyId),
      'game:lobby:update',
      snapshot,
    );
    const activeSession = lobby.sessions.find(
      (row) => row.status === GameSessionStatus.ACTIVE,
    );
    if (activeSession) {
      this.realtimeEvents.emitToChannel(
        this.sessionChannel(activeSession.id),
        'game:session:presence',
        {
          sessionId: activeSession.id,
          allowSpectatorChat: parseGameLobbySettings(
            settings as Prisma.JsonValue,
          ).allowSpectatorChat,
        },
      );
    }
    return snapshot;
  }

  private isSeatedInLobby(
    lobby: { seats: Array<{ userId: string | null }> },
    userId: string,
  ) {
    return lobby.seats.some((seat) => seat.userId === userId);
  }

  private assertSpectatorMayChat(
    session: {
      lobby: {
        ownerId: string;
        settings: Prisma.JsonValue | null;
        seats: Array<{ userId: string | null }>;
      };
    },
    userId: string,
  ) {
    if (this.isSeatedInLobby(session.lobby, userId)) return;
    if (session.lobby.ownerId === userId) return;
    const { allowSpectatorChat } = parseGameLobbySettings(session.lobby.settings);
    if (!allowSpectatorChat) {
      throw new ForbiddenException('Spectators cannot chat in this game.');
    }
  }

  async recordRealtimeLobbyJoinAudit(lobbyId: string, userId: string) {
    await this.prisma.gameEvent.create({
      data: {
        lobbyId,
        userId,
        type: GameEventType.SYSTEM,
        payload: { kind: 'realtime_lobby_join', at: new Date().toISOString() },
      },
    });
  }

  async recordRealtimeSessionJoinAudit(
    sessionId: string,
    lobbyId: string,
    userId: string,
  ) {
    await this.prisma.gameEvent.create({
      data: {
        lobbyId,
        sessionId,
        userId,
        type: GameEventType.SYSTEM,
        payload: {
          kind: 'realtime_session_join',
          at: new Date().toISOString(),
        },
      },
    });
  }

  private async ensureLobbyAccess(lobbyId: string, userId: string) {
    const lobby = await this.prisma.gameLobby.findUnique({
      where: { id: lobbyId },
      include: { seats: true },
    });
    if (!lobby) throw new NotFoundException('Lobby not found.');
    if (lobby.isPrivate && lobby.ownerId !== userId) {
      const seated = lobby.seats.some((seat) => seat.userId === userId);
      if (!seated) throw new ForbiddenException('Private lobby.');
    }
    return lobby;
  }

  async joinLobby(lobbyId: string, userId: string, dto: JoinGameLobbyDto) {
    const lobby = await this.ensureLobbyAccess(lobbyId, userId);
    if (!LOBBY_SEATABLE.includes(lobby.status)) {
      throw new BadRequestException('Lobby is not accepting players.');
    }
    const existing = lobby.seats.find((seat) => seat.userId === userId);
    if (existing) return this.getLobby(lobbyId);
    assertSeatPick(lobby.gameType, lobby.seats, dto.seatIndex);
    const seat = lobby.seats.find((row) => row.seatIndex === dto.seatIndex);
    if (!seat) throw new BadRequestException('Seat does not exist.');

    await this.prisma.gameSeat.update({
      where: { id: seat.id },
      data: {
        userId,
        status: GameSeatStatus.OCCUPIED,
        stackChips: lobby.gameType === GameType.POKER_HOLDEM ? 2000 : 0,
      },
    });
    await this.prisma.gameEvent.create({
      data: {
        lobbyId,
        userId,
        type: GameEventType.SYSTEM,
        payload: { message: 'joined_lobby', seatIndex: dto.seatIndex },
      },
    });
    await this.syncLobbyStatusFromSeats(lobbyId);
    const snapshot = await this.getLobby(lobbyId);
    this.realtimeEvents.emitToChannel(
      this.lobbyChannel(lobbyId),
      'game:lobby:update',
      snapshot,
    );
    this.emitLobbyListRefresh(lobby.gameType);
    return snapshot;
  }

  async deleteLobby(lobbyId: string, userId: string) {
    const lobby = await this.prisma.gameLobby.findUnique({
      where: { id: lobbyId },
      include: {
        sessions: {
          where: {
            status: {
              in: [GameSessionStatus.WAITING, GameSessionStatus.ACTIVE],
            },
          },
          select: { id: true },
        },
      },
    });
    if (!lobby) throw new NotFoundException('Lobby not found.');
    if (lobby.ownerId !== userId) {
      throw new ForbiddenException('Only the lobby owner can delete it.');
    }
    if (lobby.sessions.length > 0) {
      throw new BadRequestException(
        'Resign or finish the active session before deleting this lobby.',
      );
    }
    await this.prisma.gameLobby.delete({ where: { id: lobbyId } });
    this.realtimeEvents.emitToChannel(
      this.lobbyChannel(lobbyId),
      'game:lobby:deleted',
      { lobbyId },
    );
    this.emitLobbyListRefresh(lobby.gameType);
    return { ok: true, lobbyId };
  }

  async leaveLobby(lobbyId: string, userId: string) {
    const lobby = await this.ensureLobbyAccess(lobbyId, userId);
    const seat = lobby.seats.find((row) => row.userId === userId);
    if (!seat) return this.getLobby(lobbyId);
    await this.prisma.gameSeat.update({
      where: { id: seat.id },
      data: { userId: null, status: GameSeatStatus.OPEN, stackChips: 0 },
    });
    await this.syncLobbyStatusFromSeats(lobbyId);
    const snapshot = await this.getLobby(lobbyId);
    this.realtimeEvents.emitToChannel(
      this.lobbyChannel(lobbyId),
      'game:lobby:update',
      snapshot,
    );
    this.emitLobbyListRefresh(lobby.gameType);
    return snapshot;
  }

  private buildInitialState(context: EngineContext): Record<string, unknown> {
    if (context.gameType === GameType.CHESS)
      return buildInitialChessState(context);
    if (context.gameType === GameType.CHECKERS)
      return buildInitialCheckersState(context);
    if (context.gameType === GameType.CONNECT4)
      return buildInitialConnect4State(context);
    if (context.gameType === GameType.POKER_HOLDEM)
      return buildInitialPokerState(context);
    throw new BadRequestException('Unsupported game type.');
  }

  private applyActionForGame(
    gameType: GameType,
    state: Record<string, unknown>,
    userId: string,
    payload: Record<string, unknown>,
    seatUserIds: string[],
  ) {
    if (gameType === GameType.CHESS) {
      return applyChessAction(state, { userId, payload }, seatUserIds);
    }
    if (gameType === GameType.CHECKERS) {
      return applyCheckersAction(state, { userId, payload });
    }
    if (gameType === GameType.CONNECT4) {
      return applyConnect4Action(state, { userId, payload });
    }
    if (gameType === GameType.POKER_HOLDEM) {
      return applyPokerAction(state, { userId, payload });
    }
    throw new BadRequestException('Unsupported game type.');
  }

  async startSession(
    lobbyId: string,
    userId: string,
    dto: StartGameSessionDto,
  ) {
    const lobby = await this.prisma.gameLobby.findUnique({
      where: { id: lobbyId },
      include: {
        seats: true,
        sessions: {
          where: { status: GameSessionStatus.ACTIVE },
          take: 1,
        },
      },
    });
    if (!lobby) throw new NotFoundException('Lobby not found.');
    if (lobby.ownerId !== userId)
      throw new ForbiddenException('Only lobby owner can start a session.');
    if (lobby.sessions.length > 0)
      throw new BadRequestException('Lobby already has an active session.');
    const reconciled = await this.reconcileLobbyPlayState(lobbyId);
    if (reconciled) lobby.status = reconciled;
    await this.prisma.gameSession.updateMany({
      where: { lobbyId, status: GameSessionStatus.WAITING },
      data: { status: GameSessionStatus.CANCELED, endedAt: new Date() },
    });
    if (lobby.status !== GameLobbyStatus.OPEN) {
      throw new BadRequestException(
        'Lobby is not ready to start. Both seats must be filled first.',
      );
    }
    const seated: SeatSnapshot[] = lobby.seats
      .filter((seat) => seat.userId)
      .map((seat) => ({
        seatIndex: seat.seatIndex,
        userId: seat.userId as string,
      }))
      .sort((a, b) => a.seatIndex - b.seatIndex);
    if (seated.length < 2)
      throw new BadRequestException('At least 2 players are required.');
    const context: EngineContext = {
      gameType: lobby.gameType,
      seats: seated,
      options: dto.options,
    };
    const state = this.buildInitialState(context);
    const pokerTurnUserId =
      lobby.gameType === GameType.POKER_HOLDEM
        ? this.pokerActorUserId(state, seated)
        : null;
    const session = await this.prisma.gameSession.create({
      data: {
        lobbyId,
        gameType: lobby.gameType,
        status: GameSessionStatus.ACTIVE,
        state: toJson(state),
        turnUserId: pokerTurnUserId ?? seated[0]?.userId ?? null,
        startedAt: new Date(),
      },
    });
    await this.prisma.gameLobby.update({
      where: { id: lobbyId },
      data: { status: GameLobbyStatus.IN_PROGRESS },
    });
    if (lobby.gameType === GameType.POKER_HOLDEM) {
      await this.createPokerHandStateRow(session.id, state);
      await this.syncPokerSeatStacks(lobbyId, state);
    }
    this.realtimeEvents.emitToChannel(
      this.lobbyChannel(lobbyId),
      'game:session:started',
      { sessionId: session.id, lobbyId },
    );
    this.emitLobbyListRefresh(lobby.gameType);
    const started = await this.fetchSessionSnapshot(session.id);
    this.emitSessionState(started);
    return this.maskSessionForViewer(started, userId);
  }

  async fetchSessionSnapshot(sessionId: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        lobby: {
          include: {
            seats: {
              orderBy: { seatIndex: 'asc' },
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        moves: { orderBy: { createdAt: 'asc' }, take: 500 },
      },
    });
    if (!session) throw new NotFoundException('Session not found.');
    return session;
  }

  /** GET /sessions/:id — applies Hold’em hole-card masking per authenticated viewer. */
  async getSession(sessionId: string, viewerId: string) {
    const session = await this.fetchSessionSnapshot(sessionId);
    return this.maskSessionForViewer(session, viewerId);
  }

  async listSessionChat(sessionId: string, viewerId: string) {
    await this.assertSessionViewAccess(sessionId, viewerId);
    const rows = await this.prisma.gameEvent.findMany({
      where: { sessionId, type: GameEventType.CHAT },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
    return rows.map((row) => this.mapChatEvent(row));
  }

  async sendSessionChat(sessionId: string, userId: string, body: string) {
    const text = body.trim();
    if (!text) throw new BadRequestException('Message is required.');
    if (text.length > 500) {
      throw new BadRequestException('Message must be 500 characters or less.');
    }
    const session = await this.assertSessionViewAccess(sessionId, userId);
    this.assertSpectatorMayChat(session, userId);
    const event = await this.prisma.gameEvent.create({
      data: {
        lobbyId: session.lobbyId,
        sessionId,
        userId,
        type: GameEventType.CHAT,
        payload: { body: text },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
    const message = this.mapChatEvent(event);
    this.realtimeEvents.emitToChannel(
      this.sessionChannel(sessionId),
      'game:chat',
      message,
    );
    return message;
  }

  private mapChatEvent(row: {
    id: string;
    sessionId: string | null;
    userId: string | null;
    payload: Prisma.JsonValue;
    createdAt: Date;
    user?: {
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  }) {
    const payload =
      row.payload &&
      typeof row.payload === 'object' &&
      !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {};
    return {
      id: row.id,
      sessionId: row.sessionId ?? '',
      userId: row.userId,
      body: jsonPrimitiveString(payload.body),
      createdAt: row.createdAt.toISOString(),
      user: row.user ?? null,
    };
  }

  private pokerActorUserId(
    state: Record<string, unknown>,
    seated: SeatSnapshot[],
  ): string | null {
    const pokerState = state as {
      currentTurnSeatIndex?: number;
      players?: Array<{ seatIndex: number; userId: string }>;
    };
    const seatIndex = pokerState.currentTurnSeatIndex;
    if (typeof seatIndex !== 'number') {
      return seated[0]?.userId ?? null;
    }
    const actor = pokerState.players?.find((p) => p.seatIndex === seatIndex);
    return actor?.userId ?? seated[0]?.userId ?? null;
  }

  private async syncPokerSeatStacks(
    lobbyId: string,
    state: Record<string, unknown>,
  ) {
    const players = (
      state as { players?: Array<{ userId: string; stack: number }> }
    ).players;
    if (!Array.isArray(players)) return;
    await Promise.all(
      players.map((player) =>
        this.prisma.gameSeat.updateMany({
          where: { lobbyId, userId: player.userId },
          data: { stackChips: Math.max(0, Number(player.stack ?? 0)) },
        }),
      ),
    );
  }

  private async createPokerHandStateRow(
    sessionId: string,
    state: Record<string, unknown>,
  ) {
    const pokerState = state as {
      phase?: PokerRound;
      board?: unknown[];
      currentBet?: number;
      minRaise?: number;
      pot?: number;
      currentTurnSeatIndex?: number;
      buttonSeatIndex?: number;
      smallBlindSeatIndex?: number;
      bigBlindSeatIndex?: number;
    };
    await this.prisma.pokerHandState.create({
      data: {
        sessionId,
        dealerSeatIndex: Number(pokerState.buttonSeatIndex ?? 0),
        smallBlindSeatIndex: Number(pokerState.smallBlindSeatIndex ?? 0),
        bigBlindSeatIndex: Number(pokerState.bigBlindSeatIndex ?? 0),
        communityCards: (pokerState.board ?? []) as object,
        round: pokerState.phase ?? PokerRound.PREFLOP,
        currentBet: Number(pokerState.currentBet ?? 0),
        minRaise: Number(pokerState.minRaise ?? 0),
        pot: Number(pokerState.pot ?? 0),
        actionSeatIndex: Number(pokerState.currentTurnSeatIndex ?? 0),
      },
    });
  }

  private maskSessionForViewer(
    session: Awaited<ReturnType<GamesService['fetchSessionSnapshot']>>,
    viewerId: string,
  ) {
    if (session.gameType !== GameType.POKER_HOLDEM) return session;
    return this.redactPokerHoldemForViewer(session, viewerId);
  }

  private redactPokerHoldemForViewer<
    T extends Awaited<ReturnType<GamesService['fetchSessionSnapshot']>>,
  >(session: T, viewerId: string): T {
    const clone = structuredClone(session);
    const rawState = clone.state as Record<string, unknown>;
    const phase = jsonPrimitiveString(rawState.phase);
    const revealHoleCards =
      phase === PokerRound.SHOWDOWN || phase === PokerRound.COMPLETE;
    rawState.deck = [];
    const players = Array.isArray(rawState.players) ? rawState.players : [];
    rawState.players = players.map((row): unknown => {
      const p = row as Record<string, unknown>;
      const uid = jsonPrimitiveString(p.userId);
      if (revealHoleCards || uid === viewerId) return row;
      const cards = Array.isArray(p.cards) ? p.cards : [];
      return { ...p, cards: cards.map(() => 'BACK') };
    });
    return clone;
  }

  private emitSessionState(
    session: Awaited<ReturnType<GamesService['fetchSessionSnapshot']>>,
  ) {
    if (session.gameType === GameType.POKER_HOLDEM) {
      for (const seat of session.lobby.seats) {
        if (!seat.userId) continue;
        const payload = this.redactPokerHoldemForViewer(session, seat.userId);
        this.realtimeEvents.emitToUser(seat.userId, 'game:state', payload);
      }
      this.realtimeEvents.emitToChannel(
        this.sessionChannel(session.id),
        'game:session:sync',
        { sessionId: session.id },
      );
      return;
    }
    this.realtimeEvents.emitToChannel(
      this.sessionChannel(session.id),
      'game:state',
      session,
    );
  }

  async postAction(sessionId: string, userId: string, dto: GameActionDto) {
    const t0 = Date.now();
    try {
      return await this.postActionInner(sessionId, userId, dto, t0);
    } catch (err) {
      this.gamesMetrics.recordSessionActionFailed();
      throw err;
    }
  }

  private async postActionInner(
    sessionId: string,
    userId: string,
    dto: GameActionDto,
    t0: number,
  ) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { lobby: { include: { seats: true } } },
    });
    if (!session) throw new NotFoundException('Session not found.');
    if (session.status !== GameSessionStatus.ACTIVE) {
      throw new BadRequestException('Session is not active.');
    }
    const isSeated = session.lobby.seats.some((seat) => seat.userId === userId);
    if (!isSeated)
      throw new ForbiddenException('You are not seated at this table.');
    const seatUserIds = session.lobby.seats
      .filter((seat) => seat.userId)
      .sort((a, b) => a.seatIndex - b.seatIndex)
      .map((seat) => seat.userId as string);
    const seated: SeatSnapshot[] = session.lobby.seats
      .filter((seat) => seat.userId)
      .map((seat) => ({
        seatIndex: seat.seatIndex,
        userId: seat.userId as string,
      }))
      .sort((a, b) => a.seatIndex - b.seatIndex);

    const actionKind = jsonPrimitiveString(dto.payload.kind).toUpperCase();
    if (session.gameType === GameType.POKER_HOLDEM && actionKind === 'NEXT_HAND') {
      const phase = jsonPrimitiveString(
        (session.state as Record<string, unknown>).phase,
      );
      if (phase !== PokerRound.COMPLETE) {
        throw new BadRequestException('Current hand is still in progress.');
      }
      const nextState = buildNextPokerHand(
        session.state as Record<string, unknown>,
        {
          gameType: GameType.POKER_HOLDEM,
          seats: seated,
          options: {},
        },
      );
      const nextTurnUserId = this.pokerActorUserId(nextState, seated);
      const updated = await this.prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          state: toJson(nextState),
          status: GameSessionStatus.ACTIVE,
          turnUserId: nextTurnUserId,
          winnerUserId: null,
          endedAt: null,
        },
      });
      await this.prisma.pokerHandState.update({
        where: { sessionId },
        data: {
          dealerSeatIndex: Number(
            (nextState as { buttonSeatIndex?: number }).buttonSeatIndex ?? 0,
          ),
          smallBlindSeatIndex: Number(
            (nextState as { smallBlindSeatIndex?: number }).smallBlindSeatIndex ??
              0,
          ),
          bigBlindSeatIndex: Number(
            (nextState as { bigBlindSeatIndex?: number }).bigBlindSeatIndex ?? 0,
          ),
          communityCards: [],
          round: PokerRound.PREFLOP,
          currentBet: Number((nextState as { currentBet?: number }).currentBet ?? 0),
          minRaise: Number((nextState as { minRaise?: number }).minRaise ?? 0),
          pot: Number((nextState as { pot?: number }).pot ?? 0),
          actionSeatIndex: Number(
            (nextState as { currentTurnSeatIndex?: number }).currentTurnSeatIndex ??
              0,
          ),
        },
      });
      await this.syncPokerSeatStacks(session.lobbyId, nextState);
      const snapshot = await this.fetchSessionSnapshot(updated.id);
      this.emitSessionState(snapshot);
      this.gamesMetrics.recordSessionActionOk(Date.now() - t0);
      return this.maskSessionForViewer(snapshot, userId);
    }

    const result = this.applyActionForGame(
      session.gameType,
      session.state as Record<string, unknown>,
      userId,
      dto.payload,
      seatUserIds,
    );
    const nextState = result.state as {
      turnUserId?: unknown;
      currentTurnSeatIndex?: unknown;
      players?: Array<{ seatIndex: number; userId: string }>;
    };
    let nextTurnUserId: string | null =
      typeof nextState.turnUserId === 'string' ? nextState.turnUserId : null;
    if (
      !nextTurnUserId &&
      session.gameType === GameType.POKER_HOLDEM &&
      typeof nextState.currentTurnSeatIndex === 'number'
    ) {
      const actor = nextState.players?.find(
        (p) => p.seatIndex === nextState.currentTurnSeatIndex,
      );
      nextTurnUserId = actor?.userId ?? null;
    }
    const pokerPhase =
      session.gameType === GameType.POKER_HOLDEM
        ? jsonPrimitiveString((result.state as Record<string, unknown>).phase)
        : '';
    const pokerHandComplete =
      session.gameType === GameType.POKER_HOLDEM &&
      pokerPhase === PokerRound.COMPLETE;
    const sessionFinished = result.status === 'finished';

    const updated = await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        state: toJson(result.state),
        status: sessionFinished
          ? GameSessionStatus.FINISHED
          : GameSessionStatus.ACTIVE,
        winnerUserId:
          sessionFinished || pokerHandComplete
            ? (result.winnerUserId ?? null)
            : null,
        turnUserId: pokerHandComplete ? null : nextTurnUserId,
        endedAt: sessionFinished ? new Date() : null,
      },
    });
    const ply = await this.prisma.gameMove.count({ where: { sessionId } });
    await this.prisma.gameMove.create({
      data: {
        sessionId,
        userId,
        kind:
          dto.kind ??
          (session.gameType === GameType.POKER_HOLDEM
            ? MoveKind.POKER_ACTION
            : MoveKind.MOVE),
        ply: ply + 1,
        payload: toJson(dto.payload),
      },
    });
    await this.prisma.gameEvent.create({
      data: {
        lobbyId: session.lobbyId,
        sessionId: session.id,
        userId,
        type: GameEventType.ACTION,
        payload: toJson(dto.payload),
      },
    });
    if (session.gameType === GameType.POKER_HOLDEM) {
      const pokerState = result.state as {
        board?: unknown[];
        phase?: PokerRound;
        currentBet?: number;
        minRaise?: number;
        pot?: number;
        currentTurnSeatIndex?: number;
      };
      const hand = await this.prisma.pokerHandState.findUnique({
        where: { sessionId },
      });
      if (hand) {
        await this.prisma.pokerHandState.update({
          where: { sessionId },
          data: {
            communityCards: (pokerState.board ?? []) as object,
            round: pokerState.phase ?? hand.round,
            currentBet: Number(pokerState.currentBet ?? hand.currentBet),
            minRaise: Number(pokerState.minRaise ?? hand.minRaise),
            pot: Number(pokerState.pot ?? hand.pot),
            actionSeatIndex: Number(
              pokerState.currentTurnSeatIndex ?? hand.actionSeatIndex,
            ),
          },
        });
        const seat = session.lobby.seats.find((row) => row.userId === userId);
        await this.prisma.pokerAction.create({
          data: {
            handStateId: hand.id,
            sessionId,
            userId,
            seatIndex: seat?.seatIndex ?? 0,
            kind: jsonPrimitiveString(
              dto.payload.kind,
              'CHECK',
            ).toUpperCase() as never,
            amount: Number(dto.payload.amount ?? 0),
            contribution: Number(dto.payload.amount ?? 0),
            isAllIn:
              jsonPrimitiveString(dto.payload.kind).toUpperCase() === 'ALL_IN',
          },
        });
      }
    }
    if (session.gameType === GameType.POKER_HOLDEM) {
      await this.syncPokerSeatStacks(session.lobbyId, result.state);
    }
    if (sessionFinished) {
      await this.syncLobbyStatusFromSeats(session.lobbyId);
    }
    const snapshot = await this.fetchSessionSnapshot(updated.id);
    this.emitSessionState(snapshot);
    this.gamesMetrics.recordSessionActionOk(Date.now() - t0);
    return this.maskSessionForViewer(snapshot, userId);
  }

  async sendInvite(lobbyId: string, fromUserId: string, targetUserId: string) {
    const lobby = await this.ensureLobbyAccess(lobbyId, fromUserId);
    if (
      lobby.ownerId !== fromUserId &&
      !lobby.seats.some((seat) => seat.userId === fromUserId)
    ) {
      throw new ForbiddenException(
        'Only owner or seated players can invite others.',
      );
    }
    const payload = {
      lobbyId,
      fromUserId,
      targetUserId,
      gameType: lobby.gameType,
      title: lobby.title,
      deepLink: `/app/games/${gameTypeToRouteId(lobby.gameType)}`,
      sentAt: new Date().toISOString(),
    };
    await this.prisma.gameEvent.create({
      data: {
        lobbyId,
        userId: fromUserId,
        type: GameEventType.INVITE,
        payload,
      },
    });
    this.realtimeEvents.emitToUser(targetUserId, 'game:invite', payload);
    return { ok: true };
  }
}
