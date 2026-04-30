import { applyConnect4Action, buildInitialConnect4State } from './connect4.engine';

describe('connect4.engine', () => {
  it('detects a vertical win', () => {
    let state = buildInitialConnect4State({
      gameType: 'CONNECT4' as never,
      seats: [
        { seatIndex: 0, userId: 'a' },
        { seatIndex: 1, userId: 'b' },
      ],
    });
    const moves = [0, 1, 0, 1, 0, 1, 0];
    const users = ['a', 'b', 'a', 'b', 'a', 'b', 'a'];
    for (let i = 0; i < moves.length; i += 1) {
      const out = applyConnect4Action(state as Record<string, unknown>, { userId: users[i]!, payload: { column: moves[i] } });
      state = out.state;
      if (i === moves.length - 1) {
        expect(out.status).toBe('finished');
        expect(out.winnerUserId).toBe('a');
      }
    }
  });
});
