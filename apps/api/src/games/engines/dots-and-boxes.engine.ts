import { BadRequestException } from '@nestjs/common';
import type {
  EngineApplyContext,
  EngineContext,
  EngineResult,
} from './game-engine.types';

type PlayerMark = 0 | 1 | 2;
type EdgeOrientation = 'h' | 'v';
type DotsAndBoxesState = {
  gameType: 'DOTS_AND_BOXES';
  size: number;
  horizontalEdges: boolean[][];
  verticalEdges: boolean[][];
  boxes: PlayerMark[][];
  scores: [number, number];
  players: string[];
  turnUserId: string;
  status: 'active' | 'finished';
  winnerUserId: string | null;
};

const DEFAULT_BOX_SIZE = 4;

export function buildInitialDotsAndBoxesState(
  context: EngineContext,
): Record<string, unknown> {
  if (context.seats.length < 2) {
    throw new BadRequestException(
      'Dots and Boxes requires two seated players.',
    );
  }
  const size = DEFAULT_BOX_SIZE;
  return {
    gameType: 'DOTS_AND_BOXES',
    size,
    horizontalEdges: Array.from({ length: size + 1 }, () =>
      Array.from({ length: size }, () => false),
    ),
    verticalEdges: Array.from({ length: size }, () =>
      Array.from({ length: size + 1 }, () => false),
    ),
    boxes: Array.from({ length: size }, () =>
      Array.from({ length: size }, () => 0 as PlayerMark),
    ),
    scores: [0, 0],
    players: [context.seats[0]?.userId ?? '', context.seats[1]?.userId ?? ''],
    turnUserId: context.seats[0]?.userId ?? '',
    status: 'active',
    winnerUserId: null,
  } satisfies DotsAndBoxesState;
}

function isBoxComplete(
  horizontalEdges: boolean[][],
  verticalEdges: boolean[][],
  row: number,
  col: number,
) {
  return Boolean(
    horizontalEdges[row]?.[col] &&
    horizontalEdges[row + 1]?.[col] &&
    verticalEdges[row]?.[col] &&
    verticalEdges[row]?.[col + 1],
  );
}

function normalizeOrientation(value: unknown): EdgeOrientation {
  if (value === 'h' || value === 'horizontal') return 'h';
  if (value === 'v' || value === 'vertical') return 'v';
  throw new BadRequestException('orientation must be h or v.');
}

export function applyDotsAndBoxesAction(
  stateRaw: Record<string, unknown>,
  context: EngineApplyContext,
): EngineResult {
  const state = stateRaw as DotsAndBoxesState;
  if (state.status !== 'active') {
    throw new BadRequestException(
      'Dots and Boxes session is already finished.',
    );
  }
  if (state.turnUserId !== context.userId) {
    throw new BadRequestException('It is not your turn.');
  }

  const orientation = normalizeOrientation(context.payload.orientation);
  const row = Number(context.payload.row);
  const col = Number(context.payload.col);
  const size = Number(state.size || DEFAULT_BOX_SIZE);
  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    throw new BadRequestException('row and col are required.');
  }

  const horizontalEdges = state.horizontalEdges.map((line) => [...line]);
  const verticalEdges = state.verticalEdges.map((line) => [...line]);
  const boxes = state.boxes.map((line) => [...line]);
  const scores: [number, number] = [...state.scores] as [number, number];

  if (orientation === 'h') {
    if (row < 0 || row > size || col < 0 || col >= size) {
      throw new BadRequestException('Horizontal edge is outside the board.');
    }
    if (horizontalEdges[row]?.[col]) {
      throw new BadRequestException('Edge is already claimed.');
    }
    horizontalEdges[row][col] = true;
  } else {
    if (row < 0 || row >= size || col < 0 || col > size) {
      throw new BadRequestException('Vertical edge is outside the board.');
    }
    if (verticalEdges[row]?.[col]) {
      throw new BadRequestException('Edge is already claimed.');
    }
    verticalEdges[row][col] = true;
  }

  const playerMark =
    state.players[0] === context.userId
      ? 1
      : state.players[1] === context.userId
        ? 2
        : 0;
  if (playerMark === 0) {
    throw new BadRequestException('Player is not seated.');
  }

  const adjacentBoxes =
    orientation === 'h'
      ? [
          [row - 1, col],
          [row, col],
        ]
      : [
          [row, col - 1],
          [row, col],
        ];

  let completed = 0;
  for (const [boxRow, boxCol] of adjacentBoxes) {
    if (
      boxRow < 0 ||
      boxCol < 0 ||
      boxRow >= size ||
      boxCol >= size ||
      boxes[boxRow]?.[boxCol] !== 0
    ) {
      continue;
    }
    if (isBoxComplete(horizontalEdges, verticalEdges, boxRow, boxCol)) {
      boxes[boxRow][boxCol] = playerMark as PlayerMark;
      scores[playerMark - 1] += 1;
      completed += 1;
    }
  }

  const allBoxesClaimed = boxes.every((line) => line.every((box) => box !== 0));
  const nextTurn =
    completed > 0
      ? context.userId
      : (state.players.find((id) => id !== context.userId) ?? context.userId);
  const next: DotsAndBoxesState = {
    ...state,
    horizontalEdges,
    verticalEdges,
    boxes,
    scores,
    turnUserId: nextTurn,
  };

  if (allBoxesClaimed) {
    next.status = 'finished';
    next.winnerUserId =
      scores[0] === scores[1]
        ? null
        : scores[0] > scores[1]
          ? state.players[0]
          : state.players[1];
    return {
      state: next,
      status: 'finished',
      winnerUserId: next.winnerUserId,
    };
  }

  return { state: next };
}
