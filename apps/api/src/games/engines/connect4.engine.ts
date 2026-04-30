import { BadRequestException } from '@nestjs/common';
import type { EngineApplyContext, EngineContext, EngineResult } from './game-engine.types';

type Cell = 0 | 1 | 2;
type Connect4State = {
  gameType: 'CONNECT4';
  board: Cell[][];
  players: string[];
  turnUserId: string;
  status: 'active' | 'finished';
  winnerUserId: string | null;
};

export function buildInitialConnect4State(context: EngineContext): Record<string, unknown> {
  if (context.seats.length < 2) {
    throw new BadRequestException('Connect 4 requires two seated players.');
  }
  return {
    gameType: 'CONNECT4',
    board: Array.from({ length: 6 }, () => Array.from({ length: 7 }, () => 0 as Cell)),
    players: [context.seats[0]?.userId ?? '', context.seats[1]?.userId ?? ''],
    turnUserId: context.seats[0]?.userId ?? '',
    status: 'active',
    winnerUserId: null,
  } satisfies Connect4State;
}

function hasFour(board: Cell[][], value: Cell) {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < 6; r += 1) {
    for (let c = 0; c < 7; c += 1) {
      if (board[r]?.[c] !== value) continue;
      for (const [dr, dc] of dirs) {
        let k = 1;
        while (
          k < 4 &&
          board[r + dr * k]?.[c + dc * k] !== undefined &&
          board[r + dr * k]?.[c + dc * k] === value
        ) {
          k += 1;
        }
        if (k === 4) return true;
      }
    }
  }
  return false;
}

export function applyConnect4Action(
  stateRaw: Record<string, unknown>,
  context: EngineApplyContext,
): EngineResult {
  const state = stateRaw as Connect4State;
  if (state.status !== 'active') {
    throw new BadRequestException('Connect 4 session is already finished.');
  }
  if (state.turnUserId !== context.userId) {
    throw new BadRequestException('It is not your turn.');
  }
  const column = Number(context.payload.column);
  if (!Number.isInteger(column) || column < 0 || column > 6) {
    throw new BadRequestException('column must be between 0 and 6.');
  }
  const meIndex = state.players[0] === context.userId ? 1 : 2;
  const board = state.board.map((row) => [...row]);
  let placedRow = -1;
  for (let r = 5; r >= 0; r -= 1) {
    if (board[r]?.[column] === 0) {
      board[r][column] = meIndex as Cell;
      placedRow = r;
      break;
    }
  }
  if (placedRow < 0) {
    throw new BadRequestException('Column is full.');
  }
  const nextTurn = state.players.find((id) => id !== context.userId) ?? context.userId;
  const next: Connect4State = { ...state, board, turnUserId: nextTurn };

  if (hasFour(board, meIndex as Cell)) {
    next.status = 'finished';
    next.winnerUserId = context.userId;
    return { state: next, status: 'finished', winnerUserId: context.userId };
  }
  if (board.every((row) => row.every((cell) => cell !== 0))) {
    next.status = 'finished';
    next.winnerUserId = null;
    return { state: next, status: 'finished', winnerUserId: null };
  }
  return { state: next };
}
