import { BadRequestException } from '@nestjs/common';
import type {
  EngineApplyContext,
  EngineContext,
  EngineResult,
} from './game-engine.types';

type Piece = 'b' | 'B' | 'r' | 'R' | null;
type CheckersState = {
  gameType: 'CHECKERS';
  board: Piece[][];
  turnUserId: string;
  players: string[];
  status: 'active' | 'finished';
  winnerUserId: string | null;
  mustContinueFrom: string | null;
};

function createBoard(): Piece[][] {
  const board: Piece[][] = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => null),
  );
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if ((row + col) % 2 === 0) continue;
      if (row < 3) board[row][col] = 'b';
      if (row > 4) board[row][col] = 'r';
    }
  }
  return board;
}

export function buildInitialCheckersState(
  context: EngineContext,
): Record<string, unknown> {
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
    mustContinueFrom: null,
  } satisfies CheckersState;
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function pieceSets(piece: Piece) {
  if (!piece) return { mine: [] as Piece[], theirs: [] as Piece[] };
  const black = piece === 'b' || piece === 'B';
  return black
    ? { mine: ['b', 'B'] as Piece[], theirs: ['r', 'R'] as Piece[] }
    : { mine: ['r', 'R'] as Piece[], theirs: ['b', 'B'] as Piece[] };
}

function captureDirections(piece: Piece): Array<[number, number]> {
  if (piece === 'B' || piece === 'R') {
    return [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
  }
  if (piece === 'b')
    return [
      [1, 1],
      [1, -1],
    ];
  if (piece === 'r')
    return [
      [-1, 1],
      [-1, -1],
    ];
  return [];
}

function canCaptureFrom(board: Piece[][], r: number, c: number) {
  const piece = board[r]?.[c] ?? null;
  if (!piece) return false;
  const { theirs } = pieceSets(piece);
  return captureDirections(piece).some(([dr, dc]) => {
    const mr = r + dr;
    const mc = c + dc;
    const tr = r + dr * 2;
    const tc = c + dc * 2;
    return (
      inBounds(tr, tc) &&
      theirs.includes(board[mr]?.[mc] ?? null) &&
      (board[tr]?.[tc] ?? null) === null
    );
  });
}

function playerHasCapture(board: Piece[][], mine: Piece[]) {
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = board[r]?.[c] ?? null;
      if (piece && mine.includes(piece) && canCaptureFrom(board, r, c)) {
        return true;
      }
    }
  }
  return false;
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
  if ((fr + fc) % 2 === 0 || (tr + tc) % 2 === 0) {
    throw new BadRequestException('Checkers moves only on dark squares.');
  }
  if (state.mustContinueFrom && from !== state.mustContinueFrom) {
    throw new BadRequestException(
      'You must continue the capture with the same piece.',
    );
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
  const isCapture = absRow === 2;
  const validStep = isKing
    ? absCol === absRow && (absRow === 1 || absRow === 2)
    : absCol === absRow &&
      (absRow === 1 || absRow === 2) &&
      (rowDelta === dir || rowDelta === dir * 2);
  if (!validStep) {
    throw new BadRequestException('Illegal checkers move.');
  }
  if (!isCapture && playerHasCapture(state.board, mine as Piece[])) {
    throw new BadRequestException('A capture is available and must be taken.');
  }

  const board = state.board.map((row) => [...row]);
  board[fr][fc] = null;
  if (isCapture) {
    const mr = fr + rowDelta / 2;
    const mc = fc + colDelta / 2;
    const jumped = board[mr]?.[mc] ?? null;
    if (!jumped || mine.includes(jumped)) {
      throw new BadRequestException(
        'Capture move requires opponent piece in between.',
      );
    }
    board[mr][mc] = null;
  }
  let placed = piece;
  if (piece === 'b' && tr === 7) placed = 'B';
  if (piece === 'r' && tr === 0) placed = 'R';
  board[tr][tc] = placed;

  const mustContinueFrom =
    isCapture && canCaptureFrom(board, tr, tc) ? `${tr},${tc}` : null;
  const nextTurn = mustContinueFrom
    ? context.userId
    : (state.players.find((id) => id !== context.userId) ?? context.userId);
  const next: CheckersState = {
    ...state,
    board,
    turnUserId: nextTurn,
    mustContinueFrom,
  };
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
