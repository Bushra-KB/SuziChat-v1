import {
  applyDotsAndBoxesAction,
  buildInitialDotsAndBoxesState,
} from './dots-and-boxes.engine';

describe('dots-and-boxes.engine', () => {
  it('awards completed boxes and keeps the turn', () => {
    let state = buildInitialDotsAndBoxesState({
      gameType: 'DOTS_AND_BOXES' as never,
      seats: [
        { seatIndex: 0, userId: 'a' },
        { seatIndex: 1, userId: 'b' },
      ],
    });

    for (const [userId, payload] of [
      ['a', { orientation: 'h', row: 0, col: 0 }],
      ['b', { orientation: 'h', row: 1, col: 0 }],
      ['a', { orientation: 'v', row: 0, col: 0 }],
    ] as const) {
      state = applyDotsAndBoxesAction(state, { userId, payload }).state;
    }

    const out = applyDotsAndBoxesAction(state, {
      userId: 'b',
      payload: { orientation: 'v', row: 0, col: 1 },
    });

    expect((out.state.scores as number[])[1]).toBe(1);
    expect(out.state.turnUserId).toBe('b');
  });
});
