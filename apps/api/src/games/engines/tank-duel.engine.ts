import { BadRequestException } from '@nestjs/common';
import type {
  EngineApplyContext,
  EngineContext,
  EngineResult,
} from './game-engine.types';

type Vec = { x: number; y: number };
type TankPlayer = {
  userId: string;
  seatIndex: number;
  pos: Vec;
  angle: number;
  hp: number;
  score: number;
  cooldownUntil: number;
};
type TankShot = Vec & {
  id: string;
  ownerId: string;
  vx: number;
  vy: number;
  ttl: number;
};
type TankDuelState = {
  gameType: 'TANK_DUEL';
  players: TankPlayer[];
  shots: TankShot[];
  obstacles: Array<{ x: number; y: number; w: number; h: number }>;
  lastTick: number;
  status: 'active' | 'finished';
  winnerUserId: string | null;
  targetScore: number;
  lastEvent: { type: string; at: number; byUserId?: string | null; targetUserId?: string | null } | null;
};

const WIDTH = 100;
const HEIGHT = 64;
const TANK_R = 3.2;
const SHOT_R = 1.2;
const MAX_DT = 0.12;
const SHOT_SPEED = 66;
const TANK_SPEED = 30;
const DAMAGE = 34;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function numberIn(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalize(dx: number, dy: number) {
  const len = Math.hypot(dx, dy);
  if (len <= 0) return { x: 0, y: 0 };
  return { x: dx / len, y: dy / len };
}

function resetPlayers(players: TankPlayer[]) {
  players[0].pos = { x: 16, y: HEIGHT / 2 };
  players[0].angle = 0;
  players[0].hp = 100;
  players[0].cooldownUntil = 0;
  players[1].pos = { x: WIDTH - 16, y: HEIGHT / 2 };
  players[1].angle = Math.PI;
  players[1].hp = 100;
  players[1].cooldownUntil = 0;
}

export function buildInitialTankDuelState(
  context: EngineContext,
): Record<string, unknown> {
  if (context.seats.length !== 2) {
    throw new BadRequestException('Cosmic Tank Duel requires exactly two players.');
  }
  return {
    gameType: 'TANK_DUEL',
    players: [
      {
        userId: context.seats[0]?.userId ?? '',
        seatIndex: context.seats[0]?.seatIndex ?? 0,
        pos: { x: 16, y: HEIGHT / 2 },
        angle: 0,
        hp: 100,
        score: 0,
        cooldownUntil: 0,
      },
      {
        userId: context.seats[1]?.userId ?? '',
        seatIndex: context.seats[1]?.seatIndex ?? 1,
        pos: { x: WIDTH - 16, y: HEIGHT / 2 },
        angle: Math.PI,
        hp: 100,
        score: 0,
        cooldownUntil: 0,
      },
    ],
    shots: [],
    obstacles: [
      { x: 47, y: 12, w: 6, h: 14 },
      { x: 47, y: HEIGHT - 26, w: 6, h: 14 },
      { x: 25, y: 29, w: 9, h: 6 },
      { x: 66, y: 29, w: 9, h: 6 },
    ],
    lastTick: Date.now(),
    status: 'active',
    winnerUserId: null,
    targetScore: 3,
    lastEvent: null,
  } satisfies TankDuelState;
}

function overlapsObstacle(
  x: number,
  y: number,
  r: number,
  obstacle: { x: number; y: number; w: number; h: number },
) {
  const nearestX = clamp(x, obstacle.x, obstacle.x + obstacle.w);
  const nearestY = clamp(y, obstacle.y, obstacle.y + obstacle.h);
  return Math.hypot(x - nearestX, y - nearestY) < r;
}

function collides(state: TankDuelState, x: number, y: number, r: number) {
  if (x < r || x > WIDTH - r || y < r || y > HEIGHT - r) return true;
  return state.obstacles.some((o) => overlapsObstacle(x, y, r, o));
}

function advance(state: TankDuelState, now: number) {
  let remaining = clamp((now - state.lastTick) / 1000, 0, MAX_DT);
  while (remaining > 0) {
    const dt = Math.min(remaining, 1 / 60);
    remaining -= dt;

    const nextShots: TankShot[] = [];
    for (const shot of state.shots) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.ttl -= dt;
      if (shot.ttl <= 0 || collides(state, shot.x, shot.y, SHOT_R)) {
        state.lastEvent = { type: 'spark', at: now, byUserId: shot.ownerId };
        continue;
      }

      const target = state.players.find((p) => p.userId !== shot.ownerId);
      if (target && Math.hypot(target.pos.x - shot.x, target.pos.y - shot.y) <= TANK_R + SHOT_R) {
        target.hp = Math.max(0, target.hp - DAMAGE);
        state.lastEvent = {
          type: target.hp <= 0 ? 'ko' : 'hit',
          at: now,
          byUserId: shot.ownerId,
          targetUserId: target.userId,
        };
        if (target.hp <= 0) {
          const scorer = state.players.find((p) => p.userId === shot.ownerId);
          if (scorer) {
            scorer.score += 1;
            if (scorer.score >= state.targetScore) {
              state.status = 'finished';
              state.winnerUserId = scorer.userId;
              state.shots = [];
              return;
            }
          }
          state.shots = [];
          resetPlayers(state.players);
          return;
        }
        continue;
      }
      nextShots.push(shot);
    }
    state.shots = nextShots;
  }
  state.lastTick = now;
}

export function applyTankDuelAction(
  stateRaw: Record<string, unknown>,
  context: EngineApplyContext,
): EngineResult {
  const state = structuredClone(stateRaw) as TankDuelState;
  if (state.status !== 'active') {
    throw new BadRequestException('Cosmic Tank Duel session is already finished.');
  }
  if (context.payload.type === 'resign') {
    const winner = state.players.find((p) => p.userId !== context.userId);
    state.status = 'finished';
    state.winnerUserId = winner?.userId ?? null;
    state.lastEvent = { type: 'resign', at: Date.now(), byUserId: context.userId };
    return { state, status: 'finished', winnerUserId: state.winnerUserId };
  }

  const now = Date.now();
  advance(state, now);
  if (state.winnerUserId) {
    return { state, status: 'finished', winnerUserId: state.winnerUserId };
  }

  const player = state.players.find((p) => p.userId === context.userId);
  if (!player) {
    throw new BadRequestException('You are not a Cosmic Tank Duel player.');
  }

  const dir = normalize(
    numberIn(context.payload.dx, 0),
    numberIn(context.payload.dy, 0),
  );
  const nextX = player.pos.x + dir.x * TANK_SPEED * MAX_DT;
  const nextY = player.pos.y + dir.y * TANK_SPEED * MAX_DT;
  if (!collides(state, nextX, nextY, TANK_R)) {
    player.pos = { x: nextX, y: nextY };
  }

  const angle = numberIn(context.payload.angle, player.angle);
  player.angle = angle;

  const wantsFire = context.payload.fire === true;
  if (wantsFire && now >= player.cooldownUntil) {
    const vx = Math.cos(angle) * SHOT_SPEED;
    const vy = Math.sin(angle) * SHOT_SPEED;
    state.shots.push({
      id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      ownerId: context.userId,
      x: player.pos.x + Math.cos(angle) * (TANK_R + 2.2),
      y: player.pos.y + Math.sin(angle) * (TANK_R + 2.2),
      vx,
      vy,
      ttl: 1.25,
    });
    player.cooldownUntil = now + 520;
    state.lastEvent = { type: 'fire', at: now, byUserId: context.userId };
  }

  return {
    state,
    status: state.winnerUserId ? 'finished' : 'active',
    winnerUserId: state.winnerUserId,
  };
}
