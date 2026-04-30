import { buildInitialChessState, applyChessAction } from './chess.engine';

describe('chess.engine', () => {
  it('applies legal moves and keeps session active', () => {
    const state = buildInitialChessState({
      gameType: 'CHESS' as never,
      seats: [
        { seatIndex: 0, userId: 'u1' },
        { seatIndex: 1, userId: 'u2' },
      ],
    });
    const afterWhite = applyChessAction(state, { userId: 'u1', payload: { move: 'e2e4' } }, ['u1', 'u2']);
    expect((afterWhite.state as { fen: string }).fen).toContain(' b ');
    const afterBlack = applyChessAction(afterWhite.state, { userId: 'u2', payload: { move: 'e7e5' } }, ['u1', 'u2']);
    expect((afterBlack.state as { moveHistory: string[] }).moveHistory.length).toBe(2);
    expect(afterBlack.status).toBeUndefined();
  });
});
