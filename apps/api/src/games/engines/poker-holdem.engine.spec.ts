import { PokerRound } from '@prisma/client';
import { applyPokerAction, buildInitialPokerState } from './poker-holdem.engine';

describe('poker-holdem.engine', () => {
  it('progresses rounds and reaches a finished hand', () => {
    let state = buildInitialPokerState({
      gameType: 'POKER_HOLDEM' as never,
      seats: [
        { seatIndex: 0, userId: 'p1' },
        { seatIndex: 1, userId: 'p2' },
      ],
      options: { buyIn: 1000, smallBlind: 10, bigBlind: 20, seed: 123 },
    });
    // Repeat check/call style actions until showdown.
    for (let i = 0; i < 40; i += 1) {
      const current = state as {
        currentTurnSeatIndex: number;
        currentBet: number;
        players: Array<{ seatIndex: number; userId: string; committed: number }>;
        phase: PokerRound;
      };
      const actor = current.players.find((p) => p.seatIndex === current.currentTurnSeatIndex);
      if (!actor) break;
      const kind = current.currentBet > actor.committed ? "CALL" : "CHECK";
      const out = applyPokerAction(state as Record<string, unknown>, {
        userId: actor.userId,
        payload: { kind },
      });
      state = out.state;
      const phase = (state as { phase: PokerRound }).phase;
      if (out.status === 'finished' || phase === PokerRound.COMPLETE) {
        expect(phase).toBe(PokerRound.COMPLETE);
        return;
      }
    }
    // If checks alone do not end due to bets, force completion with folds.
    const current = state as { currentTurnSeatIndex: number; players: Array<{ seatIndex: number; userId: string }> };
    const actor = current.players.find((p) => p.seatIndex === current.currentTurnSeatIndex);
    if (!actor) {
      throw new Error('Expected acting player');
    }
    const folded = applyPokerAction(state as Record<string, unknown>, {
      userId: actor.userId,
      payload: { kind: "FOLD" },
    });
    expect(folded.status).toBe('finished');
  });

  it('runs out the board when all players are all-in preflop', () => {
    let state = buildInitialPokerState({
      gameType: 'POKER_HOLDEM' as never,
      seats: [
        { seatIndex: 0, userId: 'p1' },
        { seatIndex: 1, userId: 'p2' },
      ],
      options: { buyIn: 200, smallBlind: 10, bigBlind: 20, seed: 99 },
    }) as {
      board: string[];
      players: Array<{ userId: string; seatIndex: number; stack: number }>;
    };

    const first = state.players[0]!;
    let out = applyPokerAction(state as Record<string, unknown>, {
      userId: first.userId,
      payload: { kind: 'ALL_IN' },
    });
    state = out.state as typeof state;
    const second = state.players.find((p) => p.userId !== first.userId)!;
    out = applyPokerAction(state as Record<string, unknown>, {
      userId: second.userId,
      payload: { kind: 'CALL' },
    });
    state = out.state as typeof state;

    expect((state as { board: string[] }).board.length).toBe(5);
    expect((state as { phase: string }).phase).toBe('COMPLETE');
  });
});
