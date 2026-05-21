import { GameType } from '@prisma/client';
import {
  applyNeonHockeyAction,
  buildInitialNeonHockeyState,
} from './neon-hockey.engine';

describe('neon hockey engine', () => {
  it('creates a two-player realtime hockey state and clamps paddles', () => {
    const state = buildInitialNeonHockeyState({
      gameType: GameType.NEON_HOCKEY,
      seats: [
        { seatIndex: 0, userId: 'p1' },
        { seatIndex: 1, userId: 'p2' },
      ],
    });

    const next = applyNeonHockeyAction(state, {
      userId: 'p1',
      payload: { x: 99, y: -20 },
    }).state as { players: Array<{ paddle: { x: number; y: number } }> };

    expect(next.players[0].paddle.x).toBeLessThanOrEqual(44);
    expect(next.players[0].paddle.y).toBeGreaterThanOrEqual(7);
  });

  it('finishes when a player resigns', () => {
    const state = buildInitialNeonHockeyState({
      gameType: GameType.NEON_HOCKEY,
      seats: [
        { seatIndex: 0, userId: 'p1' },
        { seatIndex: 1, userId: 'p2' },
      ],
    });

    const result = applyNeonHockeyAction(state, {
      userId: 'p1',
      payload: { type: 'resign' },
    });

    expect(result.status).toBe('finished');
    expect(result.winnerUserId).toBe('p2');
  });
});
