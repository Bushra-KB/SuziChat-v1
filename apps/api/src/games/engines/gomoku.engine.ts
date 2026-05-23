import { BadRequestException } from '@nestjs/common';
import type {
  EngineApplyContext,
  EngineContext,
  EngineResult,
} from './game-engine.types';

type Cell = 0 | 1 | 2;
type GomokuState = {
  gameType: 'GOMOKU';
  size: number;
  board: Cell[][];
  players: string[];
  turnUserId: string;
  status: 'active' | 'finished';
  winnerUserId: string | null;
};

const GOMOKU_SIZE = 15;

export function buildInitialGomokuState(
  context: EngineContext,
): Record<string, unknown> {
  if (context.seats.length < 2) {
    throw new BadRequestException('Gomoku requires two seated players.');
  }
  return {
    gameType: 'GOMOKU',
    size: GOMOKU_SIZE,
    board: Array.from({ length: GOMOKU_SIZE }, () =>
      Array.from({ length: GOMOKU_SIZE }, () => 0 as Cell),
    ),
    players: [context.seats[0]?.userId ?? '', context.seats[1]?.userId ?? ''],
    turnUserId: context.seats[0]?.userId ?? '',
    status: 'active',
    winnerUserId: null,
  } satisfies GomokuState;
}

function hasFive(board: Cell[][], row: number, col: number, value: Cell) {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of dirs) {
    let total = 1;
    for (const step of [-1, 1]) {
      let r = row + dr * step;
      let c = col + dc * step;
      while (board[r]?.[c] === value) {
        total += 1;
        r += dr * step;
        c += dc * step;
      }
    }
    if (total >= 5) return true;
  }
  return false;
}

export function applyGomokuAction(
  stateRaw: Record<string, unknown>,
  context: EngineApplyContext,
): EngineResult {
  const state = stateRaw as GomokuState;
  if (state.status !== 'active') {
    throw new BadRequestException('Gomoku session is already finished.');
  }
  if (state.turnUserId !== context.userId) {
    throw new BadRequestException('It is not your turn.');
  }

  const row = Number(context.payload.row);
  const col = Number(context.payload.col);
  const size = Number(state.size || GOMOKU_SIZE);
  if (
    !Number.isInteger(row) ||
    !Number.isInteger(col) ||
    row < 0 ||
    col < 0 ||
    row >= size ||
    col >= size
  ) {
    throw new BadRequestException('row and col must be valid board points.');
  }

  const meIndex =
    state.players[0] === context.userId
      ? 1
      : state.players[1] === context.userId
        ? 2
        : 0;
  if (meIndex === 0) {
    throw new BadRequestException('Player is not seated.');
  }

  const board = state.board.map((line) => [...line]);
  if (board[row]?.[col] !== 0) {
    throw new BadRequestException('Point is already occupied.');
  }
  board[row][col] = meIndex as Cell;

  const nextTurn =
    state.players.find((id) => id !== context.userId) ?? context.userId;
  const next: GomokuState = { ...state, board, turnUserId: nextTurn };

  if (hasFive(board, row, col, meIndex as Cell)) {
    next.status = 'finished';
    next.winnerUserId = context.userId;
    return { state: next, status: 'finished', winnerUserId: context.userId };
  }

  if (board.every((line) => line.every((cell) => cell !== 0))) {
    next.status = 'finished';
    next.winnerUserId = null;
    return { state: next, status: 'finished', winnerUserId: null };
  }

  return { state: next };
}
