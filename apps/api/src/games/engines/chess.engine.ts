import { BadRequestException } from '@nestjs/common';
import { Chess } from 'chess.js';
import type { EngineApplyContext, EngineContext, EngineResult } from './game-engine.types';

type ChessState = {
  gameType: 'CHESS';
  fen: string;
  turnUserId: string;
  moveHistory: string[];
  status: 'active' | 'finished';
  winnerUserId: string | null;
};

export function buildInitialChessState(context: EngineContext): Record<string, unknown> {
  if (context.seats.length < 2) {
    throw new BadRequestException('Chess requires two seated players.');
  }
  const chess = new Chess();
  return {
    gameType: 'CHESS',
    fen: chess.fen(),
    turnUserId: context.seats[0]?.userId ?? '',
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
  if (context.userId !== state.turnUserId) {
    throw new BadRequestException('It is not your turn.');
  }
  const move = String(context.payload.move ?? '').trim();
  if (!move) {
    throw new BadRequestException('move is required (UCI, e.g. e2e4).');
  }

  const chess = new Chess(state.fen);
  const parsed = chess.move({
    from: move.slice(0, 2),
    to: move.slice(2, 4),
    promotion: move.slice(4, 5) || 'q',
  });
  if (!parsed) {
    throw new BadRequestException('Illegal move.');
  }

  const nextTurn = chess.turn() === 'w' ? seatUserIds[0] : seatUserIds[1];
  const next: ChessState = {
    ...state,
    fen: chess.fen(),
    moveHistory: [...state.moveHistory, parsed.san],
    turnUserId: nextTurn ?? state.turnUserId,
  };

  if (chess.isCheckmate()) {
    next.status = 'finished';
    next.winnerUserId = context.userId;
    return { state: next, status: 'finished', winnerUserId: context.userId };
  }
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) {
    next.status = 'finished';
    next.winnerUserId = null;
    return { state: next, status: 'finished', winnerUserId: null };
  }
  return { state: next };
}
