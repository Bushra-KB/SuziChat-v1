import { BadRequestException } from '@nestjs/common';
import { Chess } from 'chess.js';
import type {
  EngineApplyContext,
  EngineContext,
  EngineResult,
} from './game-engine.types';

type ChessState = {
  gameType: 'CHESS';
  fen: string;
  whitePlayerId: string;
  blackPlayerId: string;
  turnUserId: string;
  moveHistory: string[];
  status: 'active' | 'finished';
  winnerUserId: string | null;
};

function playerForColor(
  color: 'w' | 'b',
  whitePlayerId: string,
  blackPlayerId: string,
): string {
  return color === 'w' ? whitePlayerId : blackPlayerId;
}

export function buildInitialChessState(
  context: EngineContext,
): Record<string, unknown> {
  if (context.seats.length < 2) {
    throw new BadRequestException('Chess requires two seated players.');
  }
  const whitePlayerId = context.seats[0]?.userId ?? '';
  const blackPlayerId = context.seats[1]?.userId ?? '';
  const chess = new Chess();
  return {
    gameType: 'CHESS',
    fen: chess.fen(),
    whitePlayerId,
    blackPlayerId,
    turnUserId: whitePlayerId,
    moveHistory: [],
    status: 'active',
    winnerUserId: null,
  } satisfies ChessState;
}

export function applyChessAction(
  stateRaw: Record<string, unknown>,
  context: EngineApplyContext,
  seatUserIds: string[],
): EngineResult {
  const state = stateRaw as ChessState;
  if (state.status !== 'active') {
    throw new BadRequestException('Chess session is already finished.');
  }

  const whitePlayerId = state.whitePlayerId ?? seatUserIds[0] ?? '';
  const blackPlayerId = state.blackPlayerId ?? seatUserIds[1] ?? '';

  const actionType = String(context.payload.type ?? '').toLowerCase();
  if (actionType === 'resign') {
    if (!seatUserIds.includes(context.userId)) {
      throw new BadRequestException('Only seated players can resign.');
    }
    const opponent = seatUserIds.find((id) => id !== context.userId);
    if (!opponent) {
      throw new BadRequestException('Opponent not found.');
    }
    const next: ChessState = {
      ...state,
      whitePlayerId,
      blackPlayerId,
      status: 'finished',
      winnerUserId: opponent,
    };
    return { state: next, status: 'finished', winnerUserId: opponent };
  }

  if (context.userId !== state.turnUserId) {
    throw new BadRequestException('It is not your turn.');
  }

  const move = String(context.payload.move ?? '').trim();
  if (!move) {
    throw new BadRequestException('move is required (UCI, e.g. e2e4).');
  }

  const chess = new Chess(state.fen);
  const from = move.slice(0, 2);
  const to = move.slice(2, 4);
  const promotion = move.slice(4, 5);
  const parsed = chess.move(
    promotion
      ? { from, to, promotion: promotion as 'q' | 'r' | 'b' | 'n' }
      : { from, to },
  );
  if (!parsed) {
    throw new BadRequestException('Illegal move.');
  }

  const nextTurn = playerForColor(chess.turn(), whitePlayerId, blackPlayerId);
  const next: ChessState = {
    ...state,
    whitePlayerId,
    blackPlayerId,
    fen: chess.fen(),
    moveHistory: [...state.moveHistory, parsed.san],
    turnUserId: nextTurn || state.turnUserId,
  };

  if (chess.isCheckmate()) {
    next.status = 'finished';
    next.winnerUserId = context.userId;
    return { state: next, status: 'finished', winnerUserId: context.userId };
  }
  if (chess.isGameOver()) {
    next.status = 'finished';
    next.winnerUserId = null;
    return { state: next, status: 'finished', winnerUserId: null };
  }
  return { state: next };
}
