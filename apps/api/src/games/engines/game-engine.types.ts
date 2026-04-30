import { GameType, PokerActionKind, PokerRound } from '@prisma/client';

export type SeatSnapshot = {
  seatIndex: number;
  userId: string;
};

export type EngineContext = {
  gameType: GameType;
  seats: SeatSnapshot[];
  options?: Record<string, unknown>;
};

export type EngineApplyContext = {
  userId: string;
  payload: Record<string, unknown>;
};

export type EngineResult = {
  state: Record<string, unknown>;
  status?: 'active' | 'finished';
  winnerUserId?: string | null;
};

export type PokerPlayerState = {
  userId: string;
  seatIndex: number;
  cards: string[];
  stack: number;
  committed: number;
  folded: boolean;
  allIn: boolean;
};

export type PokerState = {
  gameType: 'POKER_HOLDEM';
  phase: PokerRound;
  buttonSeatIndex: number;
  smallBlindSeatIndex: number;
  bigBlindSeatIndex: number;
  currentTurnSeatIndex: number;
  currentBet: number;
  minRaise: number;
  pot: number;
  board: string[];
  deck: string[];
  players: PokerPlayerState[];
  handLog: Array<{
    kind: PokerActionKind;
    seatIndex: number;
    amount: number;
    timestamp: string;
  }>;
};
