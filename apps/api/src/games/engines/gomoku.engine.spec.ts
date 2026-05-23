import { applyGomokuAction, buildInitialGomokuState } from './gomoku.engine';

describe('gomoku.engine', () => {
  it('detects five stones in a row', () => {
    let state = buildInitialGomokuState({
      gameType: 'GOMOKU' as never,
      seats: [
        { seatIndex: 0, userId: 'a' },
        { seatIndex: 1, userId: 'b' },
      ],
    });
    const moves = [
      [7, 3],
      [8, 3],
      [7, 4],
      [8, 4],
      [7, 5],
      [8, 5],
      [7, 6],
      [8, 6],
      [7, 7],
    ];
    const users = ['a', 'b', 'a', 'b', 'a', 'b', 'a', 'b', 'a'];

    for (let i = 0; i < moves.length; i += 1) {
      const out = applyGomokuAction(state, {
        userId: users[i],
        payload: { row: moves[i][0], col: moves[i][1] },
      });
      state = out.state;
      if (i === moves.length - 1) {
        expect(out.status).toBe('finished');
        expect(out.winnerUserId).toBe('a');
      }
    }
  });
});
