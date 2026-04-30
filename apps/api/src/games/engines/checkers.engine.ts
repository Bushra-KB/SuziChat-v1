import { BadRequestException } from '@nestjs/common';
import type { EngineApplyContext, EngineContext, EngineResult } from './game-engine.types';

type Piece = 'b' | 'B' | 'r' | 'R' | null;
type CheckersState = {
  gameType: 'CHECKERS';
  board: Piece[][];
  turnUserId: string;
  players: string[];
  status: 'active' | 'finished';
  winnerUserId: string | null;
};

function createBoard(): Piece[][] {
  const board: Piece[][] = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if ((row + col) % 2 === 0) continue;
      if (row < 3) board[row][col] = 'b';
      if (row > 4) board[row][col] = 'r';
    }
  }
  return board;
}

export function buildInitialCheckersState(context: EngineContext): Record<string, unknown> {
  if (context.seats.length < 2) {
    throw new BadRequestException('Checkers requires two seated players.');
  }
  return {
    gameType: 'CHECKERS',
    board: createBoard(),
    turnUserId: context.seats[0]?.userId ?? '',
    players: [context.seats[0]?.userId ?? '', context.seats[1]?.userId ?? ''],
    status: 'active',
    winnerUserId: null,
  } satisfies CheckersState;
}

export function applyCheckersAction(
  stateRaw: Record<string, unknown>,
  context: EngineApplyContext,
): EngineResult {
  const state = stateRaw as CheckersState;
  if (state.status !== 'active') {
    throw new BadRequestException('Checkers session is already finished.');
  }
  if (state.turnUserId !== context.userId) {
    throw new BadRequestException('It is not your turn.');
  }
  const from = String(context.payload.from ?? '');
  const to = String(context.payload.to ?? '');
  const [fr, fc] = from.split(',').map((v) => Number(v));
  const [tr, tc] = to.split(',').map((v) => Number(v));
  if ([fr, fc, tr, tc].some((v) => Number.isNaN(v) || v < 0 || v > 7)) {
    throw new BadRequestException('Invalid from/to coordinates.');
  }
  const piece = state.board[fr]?.[fc] ?? null;
  if (!piece) {
    throw new BadRequestException('No piece on source square.');
  }
  const mine = state.players[0] === context.userId ? ['b', 'B'] : ['r', 'R'];
  if (!mine.includes(piece)) {
    throw new BadRequestException('You can only move your own pieces.');
  }
  if (state.board[tr]?.[tc] != null) {
    throw new BadRequestException('Target square is occupied.');
  }
  const dir = mine[0] === 'b' ? 1 : -1;
  const rowDelta = tr - fr;
  const colDelta = tc - fc;
  const absRow = Math.abs(rowDelta);
  const absCol = Math.abs(colDelta);
  const isKing = piece === 'B' || piece === 'R';
  const canForward = isKing || rowDelta === dir || rowDelta === dir * 2;
  if (!canForward || absCol !== absRow || (absRow !== 1 && absRow !== 2)) {
    throw new BadRequestException('Illegal checkers move.');
  }

  const board = state.board.map((row) => [...row]);
  board[fr][fc] = null;
  if (absRow === 2) {
    const mr = fr + rowDelta / 2;
    const mc = fc + colDelta / 2;
    const jumped = board[mr]?.[mc] ?? null;
    if (!jumped || mine.includes(jumped)) {
      throw new BadRequestException('Capture move requires opponent piece in between.');
    }
    board[mr][mc] = null;
  }
  let placed = piece;
  if (piece === 'b' && tr === 7) placed = 'B';
  if (piece === 'r' && tr === 0) placed = 'R';
  board[tr][tc] = placed;

  const nextTurn = state.players.find((id) => id !== context.userId) ?? context.userId;
  const next: CheckersState = { ...state, board, turnUserId: nextTurn };
  const flat = board.flat();
  const blackLeft = flat.some((p) => p === 'b' || p === 'B');
  const redLeft = flat.some((p) => p === 'r' || p === 'R');
  if (!blackLeft || !redLeft) {
    next.status = 'finished';
    next.winnerUserId = blackLeft ? state.players[0] : state.players[1];
    return { state: next, status: 'finished', winnerUserId: next.winnerUserId };
  }
  return { state: next };
}
