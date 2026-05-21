import { BadRequestException } from '@nestjs/common';
import {
  applyCheckersAction,
  buildInitialCheckersState,
} from './checkers.engine';

describe('checkers.engine', () => {
  const seats = [
    { seatIndex: 0, userId: 'black-user' },
    { seatIndex: 1, userId: 'red-user' },
  ];

  it('buildInitialCheckersState places black on top rows and red on bottom', () => {
    const state = buildInitialCheckersState({
      gameType: 'CHECKERS',
      seats,
    }) as { board: (string | null)[][]; players: string[] };
    expect(state.players).toEqual(['black-user', 'red-user']);
    expect(state.board[0][1]).toBe('b');
    expect(state.board[7][0]).toBe('r');
  });

  it('allows a simple forward move for black', () => {
    const state = buildInitialCheckersState({
      gameType: 'CHECKERS',
      seats,
    }) as Record<string, unknown>;
    const result = applyCheckersAction(state, {
      userId: 'black-user',
      payload: { from: '2,1', to: '3,0' },
    });
    const next = result.state as { board: (string | null)[][]; turnUserId: string };
    expect(next.board[2][1]).toBeNull();
    expect(next.board[3][0]).toBe('b');
    expect(next.turnUserId).toBe('red-user');
  });

  it('rejects moves on light squares', () => {
    const state = buildInitialCheckersState({
      gameType: 'CHECKERS',
      seats,
    }) as Record<string, unknown>;
    expect(() =>
      applyCheckersAction(state, {
        userId: 'black-user',
        payload: { from: '2,0', to: '3,1' },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects backward non-king moves for red', () => {
    const state = buildInitialCheckersState({
      gameType: 'CHECKERS',
      seats,
    }) as Record<string, unknown>;
    expect(() =>
      applyCheckersAction(state, {
        userId: 'red-user',
        payload: { from: '5,0', to: '6,1' },
      }),
    ).toThrow(BadRequestException);
  });

  it('keeps the turn on the same piece when another capture is available', () => {
    const board = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null as string | null));
    board[2][1] = 'b';
    board[3][2] = 'r';
    board[5][4] = 'r';
    const state = {
      gameType: 'CHECKERS',
      board,
      turnUserId: 'black-user',
      players: ['black-user', 'red-user'],
      status: 'active',
      winnerUserId: null,
      mustContinueFrom: null,
    };

    const first = applyCheckersAction(state as Record<string, unknown>, {
      userId: 'black-user',
      payload: { from: '2,1', to: '4,3' },
    }).state as { turnUserId: string; mustContinueFrom: string | null };

    expect(first.turnUserId).toBe('black-user');
    expect(first.mustContinueFrom).toBe('4,3');

    const second = applyCheckersAction(first as unknown as Record<string, unknown>, {
      userId: 'black-user',
      payload: { from: '4,3', to: '6,5' },
    }).state as { turnUserId: string; mustContinueFrom: string | null };

    expect(second.turnUserId).toBe('red-user');
    expect(second.mustContinueFrom).toBeNull();
  });
});
