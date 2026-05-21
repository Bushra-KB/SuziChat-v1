import { BadRequestException } from '@nestjs/common';
import type {
  EngineApplyContext,
  EngineContext,
  EngineResult,
} from './game-engine.types';

type Vec = { x: number; y: number };
type HockeyPlayer = {
  userId: string;
  seatIndex: number;
  paddle: Vec;
  score: number;
};

type NeonHockeyState = {
  gameType: 'NEON_HOCKEY';
  players: HockeyPlayer[];
  puck: Vec & { vx: number; vy: number };
  lastTick: number;
  status: 'active' | 'finished';
  winnerUserId: string | null;
  serveTo: number;
  targetScore: number;
  lastEvent: { type: string; at: number; byUserId?: string | null } | null;
};

const WIDTH = 100;
const HEIGHT = 60;
const PADDLE_R = 6;
const PUCK_R = 2.1;
const MAX_DT = 0.12;
const FRICTION = 0.992;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function numberIn(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function resetPuck(serveTo: number) {
  const dir = serveTo === 0 ? -1 : 1;
  return {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    vx: dir * 34,
    vy: (Math.random() > 0.5 ? 1 : -1) * 12,
  };
}

export function buildInitialNeonHockeyState(
  context: EngineContext,
): Record<string, unknown> {
  if (context.seats.length !== 2) {
    throw new BadRequestException('Neon Hockey requires exactly two players.');
  }
  return {
    gameType: 'NEON_HOCKEY',
    players: [
      {
        userId: context.seats[0]?.userId ?? '',
        seatIndex: context.seats[0]?.seatIndex ?? 0,
        paddle: { x: 18, y: HEIGHT / 2 },
        score: 0,
      },
      {
        userId: context.seats[1]?.userId ?? '',
        seatIndex: context.seats[1]?.seatIndex ?? 1,
        paddle: { x: WIDTH - 18, y: HEIGHT / 2 },
        score: 0,
      },
    ],
    puck: resetPuck(1),
    lastTick: Date.now(),
    status: 'active',
    winnerUserId: null,
    serveTo: 1,
    targetScore: 5,
    lastEvent: null,
  } satisfies NeonHockeyState;
}

function advance(state: NeonHockeyState, now: number) {
  let remaining = clamp((now - state.lastTick) / 1000, 0, MAX_DT);
  while (remaining > 0) {
    const dt = Math.min(remaining, 1 / 60);
    remaining -= dt;

    state.puck.x += state.puck.vx * dt;
    state.puck.y += state.puck.vy * dt;
    state.puck.vx *= FRICTION;
    state.puck.vy *= FRICTION;

    if (state.puck.y <= PUCK_R || state.puck.y >= HEIGHT - PUCK_R) {
      state.puck.y = clamp(state.puck.y, PUCK_R, HEIGHT - PUCK_R);
      state.puck.vy *= -1.04;
      state.lastEvent = { type: 'wall', at: now };
    }

    for (const player of state.players) {
      const dx = state.puck.x - player.paddle.x;
      const dy = state.puck.y - player.paddle.y;
      const dist = Math.hypot(dx, dy);
      const minDist = PADDLE_R + PUCK_R;
      if (dist > 0 && dist < minDist) {
        const nx = dx / dist;
        const ny = dy / dist;
        state.puck.x = player.paddle.x + nx * minDist;
        state.puck.y = player.paddle.y + ny * minDist;
        const speed = Math.max(42, Math.hypot(state.puck.vx, state.puck.vy) * 1.04);
        state.puck.vx = nx * speed;
        state.puck.vy = ny * speed;
        state.lastEvent = { type: 'hit', at: now, byUserId: player.userId };
      }
    }

    const leftGoal = state.puck.x < -PUCK_R;
    const rightGoal = state.puck.x > WIDTH + PUCK_R;
    if (leftGoal || rightGoal) {
      const scorer = leftGoal ? state.players[1] : state.players[0];
      scorer.score += 1;
      state.serveTo = leftGoal ? 0 : 1;
      state.lastEvent = { type: 'goal', at: now, byUserId: scorer.userId };
      if (scorer.score >= state.targetScore) {
        state.status = 'finished';
        state.winnerUserId = scorer.userId;
        state.puck.vx = 0;
        state.puck.vy = 0;
        break;
      }
      state.puck = resetPuck(state.serveTo);
    }
  }
  state.lastTick = now;
}

export function applyNeonHockeyAction(
  stateRaw: Record<string, unknown>,
  context: EngineApplyContext,
): EngineResult {
  const state = structuredClone(stateRaw) as NeonHockeyState;
  if (state.status !== 'active') {
    throw new BadRequestException('Neon Hockey session is already finished.');
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

  const playerIndex = state.players.findIndex((p) => p.userId === context.userId);
  if (playerIndex < 0) {
    throw new BadRequestException('You are not a Neon Hockey player.');
  }

  const player = state.players[playerIndex];
  const x = numberIn(context.payload.x, player.paddle.x);
  const y = numberIn(context.payload.y, player.paddle.y);
  const minX = playerIndex === 0 ? PADDLE_R + 2 : WIDTH / 2 + PADDLE_R;
  const maxX = playerIndex === 0 ? WIDTH / 2 - PADDLE_R : WIDTH - PADDLE_R - 2;
  player.paddle = {
    x: clamp(x, minX, maxX),
    y: clamp(y, PADDLE_R + 1, HEIGHT - PADDLE_R - 1),
  };

  return {
    state,
    status: state.winnerUserId ? 'finished' : 'active',
    winnerUserId: state.winnerUserId,
  };
}
