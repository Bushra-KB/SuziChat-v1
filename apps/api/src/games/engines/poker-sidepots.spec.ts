import { GameType, PokerRound } from '@prisma/client';
import { runShowdownForTest } from './poker-holdem.engine';

describe('poker side pots (uneven stacks)', () => {
  it('conserves chips across multi-level pots', () => {
    const totalPot = 600;
    const state: Record<string, unknown> = {
      gameType: GameType.POKER_HOLDEM,
      phase: PokerRound.RIVER,
      board: ['2c', '3d', '4h', '5s', '7c'],
      pot: totalPot,
      players: [
        {
          userId: 'short',
          seatIndex: 0,
          cards: ['Ah', 'Kh'],
          stack: 0,
          committed: 100,
          folded: false,
          allIn: true,
          acted: true,
        },
        {
          userId: 'mid',
          seatIndex: 1,
          cards: ['Qh', 'Qd'],
          stack: 0,
          committed: 200,
          folded: false,
          allIn: true,
          acted: true,
        },
        {
          userId: 'big',
          seatIndex: 2,
          cards: ['Jh', 'Jd'],
          stack: 0,
          committed: 300,
          folded: false,
          allIn: true,
          acted: true,
        },
      ],
      deck: [],
      currentBet: 0,
      minRaise: 0,
      currentTurnSeatIndex: 0,
      buttonSeatIndex: 0,
      smallBlindSeatIndex: 1,
      bigBlindSeatIndex: 2,
      handLog: [],
    };
    runShowdownForTest(state);
    const players = state.players as Array<{ userId: string; stack: number }>;
    const stacksTotal = players.reduce((sum, p) => sum + p.stack, 0);
    expect(stacksTotal).toBe(totalPot);
    expect(Number(state.pot ?? 0)).toBe(0);
  });
});
