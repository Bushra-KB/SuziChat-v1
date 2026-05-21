import { GameType } from '@prisma/client';
import {
  applyTankDuelAction,
  buildInitialTankDuelState,
} from './tank-duel.engine';

describe('tank duel engine', () => {
  it('creates a two-player arena state and accepts drive/fire input', () => {
    const state = buildInitialTankDuelState({
      gameType: GameType.TANK_DUEL,
      seats: [
        { seatIndex: 0, userId: 'p1' },
        { seatIndex: 1, userId: 'p2' },
      ],
    });

    const result = applyTankDuelAction(state, {
      userId: 'p1',
      payload: { dx: 1, dy: 0, angle: 0, fire: true },
    }).state as { players: Array<{ pos: { x: number } }>; shots: unknown[] };

    expect(result.players[0].pos.x).toBeGreaterThan(16);
    expect(result.shots.length).toBe(1);
  });

  it('finishes when a player resigns', () => {
    const state = buildInitialTankDuelState({
      gameType: GameType.TANK_DUEL,
      seats: [
        { seatIndex: 0, userId: 'p1' },
        { seatIndex: 1, userId: 'p2' },
      ],
    });

    const result = applyTankDuelAction(state, {
      userId: 'p2',
      payload: { type: 'resign' },
    });

    expect(result.status).toBe('finished');
    expect(result.winnerUserId).toBe('p1');
  });
});
