import { BadRequestException } from '@nestjs/common';
import { GameType, PokerActionKind, PokerRound } from '@prisma/client';
import type {
  EngineApplyContext,
  EngineContext,
  EngineResult,
  PokerPlayerState,
  PokerState,
} from './game-engine.types';

type RuntimePokerPlayer = PokerPlayerState & {
  acted: boolean;
  /** Cumulative chips put in the pot this hand (all streets). */
  totalCommitted: number;
};

type RuntimePokerState = Omit<PokerState, 'players'> & {
  players: RuntimePokerPlayer[];
  winners?: Array<{ userId: string; rankName: string; amount: number }>;
  handNumber?: number;
  bigBlind?: number;
};

const RANKS = '23456789TJQKA'.split('');
const SUITS = 'cdhs'.split('');

function buildDeck(seed = Date.now()): string[] {
  const deck: string[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push(`${rank}${suit}`);
    }
  }
  let x = seed | 0;
  for (let i = deck.length - 1; i > 0; i -= 1) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    const j = Math.abs(x) % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function orderedPlayers(state: RuntimePokerState) {
  return [...state.players].sort((a, b) => a.seatIndex - b.seatIndex);
}

function nextAliveSeat(
  state: RuntimePokerState,
  startSeatIndex: number,
): number {
  const ordered = orderedPlayers(state);
  const startPos = ordered.findIndex(
    (player) => player.seatIndex === startSeatIndex,
  );
  for (let step = 1; step <= ordered.length; step += 1) {
    const row = ordered[(startPos + step) % ordered.length];
    if (!row.folded && !row.allIn && row.stack > 0) {
      return row.seatIndex;
    }
  }
  return startSeatIndex;
}

function getPlayer(state: RuntimePokerState, userId: string) {
  const player = state.players.find((row) => row.userId === userId);
  if (!player) {
    throw new BadRequestException('You are not seated at this table.');
  }
  return player;
}

function jsonPhaseIsRiver(phase: PokerRound) {
  return String(phase) === PokerRound.RIVER;
}

function canAdvanceRound(state: RuntimePokerState) {
  const live = state.players.filter((p) => !p.folded);
  if (live.length <= 1) return true;
  const target = Math.max(...live.map((p) => p.committed));
  return live.every((p) => p.allIn || (p.committed === target && p.acted));
}

function burn(state: RuntimePokerState) {
  state.deck.shift();
}

function dealBoard(state: RuntimePokerState, amount: number) {
  for (let i = 0; i < amount; i += 1) {
    const card = state.deck.shift();
    if (card) state.board.push(card);
  }
}

function normalizeRound(state: RuntimePokerState) {
  for (const player of state.players) {
    player.committed = 0;
    player.acted = false;
  }
  state.currentBet = 0;
  state.minRaise = Math.max(state.bigBlind ?? 20, 1);
}

type EvalRank = [number, number, number, number, number, number];
const rankValue = (card: string) => RANKS.indexOf(card[0] ?? '2') + 2;

function rankName(rank: EvalRank): string {
  const names = [
    'High card',
    'Pair',
    'Two pair',
    'Three of a kind',
    'Straight',
    'Flush',
    'Full house',
    'Four of a kind',
    'Straight flush',
  ];
  return names[rank[0]] ?? 'High card';
}

function evaluate5(cards: string[]): EvalRank {
  const values = cards.map(rankValue).sort((a, b) => b - a);
  const suits = cards.map((c) => c[1]);
  const flush = suits.every((s) => s === suits[0]);
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const unique = [...new Set(values)];
  const wheel = [14, 5, 4, 3, 2];
  const straight =
    unique.length === 5 &&
    (unique[0] - unique[4] === 4 || wheel.every((v, i) => unique[i] === v));
  const sortedGroups = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || b[0] - a[0],
  );
  if (straight && flush)
    return [8, unique[0] === 14 && unique[1] === 5 ? 5 : unique[0], 0, 0, 0, 0];
  if (sortedGroups[0]?.[1] === 4)
    return [7, sortedGroups[0][0], sortedGroups[1]?.[0] ?? 0, 0, 0, 0];
  if (sortedGroups[0]?.[1] === 3 && sortedGroups[1]?.[1] === 2)
    return [6, sortedGroups[0][0], sortedGroups[1][0], 0, 0, 0];
  if (flush) return [5, values[0], values[1], values[2], values[3], values[4]];
  if (straight)
    return [4, unique[0] === 14 && unique[1] === 5 ? 5 : unique[0], 0, 0, 0, 0];
  if (sortedGroups[0]?.[1] === 3) {
    const kickers = sortedGroups
      .filter((g) => g[1] === 1)
      .map((g) => g[0])
      .sort((a, b) => b - a);
    return [3, sortedGroups[0][0], kickers[0] ?? 0, kickers[1] ?? 0, 0, 0];
  }
  if (sortedGroups[0]?.[1] === 2 && sortedGroups[1]?.[1] === 2) {
    const highPair = Math.max(sortedGroups[0][0], sortedGroups[1][0]);
    const lowPair = Math.min(sortedGroups[0][0], sortedGroups[1][0]);
    const kicker = sortedGroups.find((g) => g[1] === 1)?.[0] ?? 0;
    return [2, highPair, lowPair, kicker, 0, 0];
  }
  if (sortedGroups[0]?.[1] === 2) {
    const kickers = sortedGroups
      .filter((g) => g[1] === 1)
      .map((g) => g[0])
      .sort((a, b) => b - a);
    return [
      1,
      sortedGroups[0][0],
      kickers[0] ?? 0,
      kickers[1] ?? 0,
      kickers[2] ?? 0,
      0,
    ];
  }
  return [0, values[0], values[1], values[2], values[3], values[4]];
}

function evaluateBestOf7(cards: string[]): EvalRank {
  let best: EvalRank = [0, 0, 0, 0, 0, 0];
  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            const rank = evaluate5([
              cards[a],
              cards[b],
              cards[c],
              cards[d],
              cards[e],
            ]);
            if (rank.join(',') > best.join(',')) best = rank;
          }
        }
      }
    }
  }
  return best;
}

function assignBlindSeats(
  ordered: Array<{ seatIndex: number }>,
  buttonSeatIndex: number,
) {
  const n = ordered.length;
  const pos = ordered.findIndex((s) => s.seatIndex === buttonSeatIndex);
  if (pos < 0) {
    throw new BadRequestException('Invalid dealer seat.');
  }
  if (n === 2) {
    return {
      buttonSeatIndex,
      smallBlindSeatIndex: buttonSeatIndex,
      bigBlindSeatIndex: ordered[(pos + 1) % n].seatIndex,
    };
  }
  return {
    buttonSeatIndex,
    smallBlindSeatIndex: ordered[(pos + 1) % n].seatIndex,
    bigBlindSeatIndex: ordered[(pos + 2) % n].seatIndex,
  };
}

function nextButtonSeat(
  ordered: Array<{ seatIndex: number; stack: number }>,
  currentButton: number,
): number {
  const active = ordered.filter((s) => s.stack > 0);
  if (active.length < 2) {
    throw new BadRequestException(
      'Not enough players with chips for another hand.',
    );
  }
  const pos = active.findIndex((s) => s.seatIndex === currentButton);
  const start = pos >= 0 ? pos : 0;
  for (let step = 1; step <= active.length; step += 1) {
    const seat = active[(start + step) % active.length];
    if (seat && seat.stack > 0) return seat.seatIndex;
  }
  return active[0].seatIndex;
}

function playersWithChips(state: RuntimePokerState) {
  return state.players.filter((p) => p.stack > 0);
}

function finishHandResult(
  state: RuntimePokerState,
  winnerUserId: string | null,
): EngineResult {
  const remaining = playersWithChips(state);
  if (remaining.length >= 2) {
    return { state, status: 'active', winnerUserId };
  }
  return { state, status: 'finished', winnerUserId };
}

function showdown(state: RuntimePokerState): {
  winnerUserId: string | null;
  winners: Array<{ userId: string; rankName: string; amount: number }>;
} {
  const alive = state.players.filter((p) => !p.folded);
  const winners: Array<{ userId: string; rankName: string; amount: number }> =
    [];

  if (alive.length === 1) {
    const winner = alive[0];
    const amount = state.pot;
    winner.stack += amount;
    state.pot = 0;
    winners.push({
      userId: winner.userId,
      rankName: 'Last player standing',
      amount,
    });
    return { winnerUserId: winner.userId, winners };
  }

  const contenders = alive.map((player) => ({
    player,
    rank: evaluateBestOf7([...player.cards, ...state.board]),
  }));

  const levels = [
    ...new Set(state.players.map((p) => p.totalCommitted).filter((c) => c > 0)),
  ].sort((a, b) => a - b);

  let awarded = 0;
  let prev = 0;
  const winTotals = new Map<string, number>();

  for (const level of levels) {
    const eligibleContrib = state.players.filter(
      (p) => p.totalCommitted >= level,
    );
    const potSize = (level - prev) * eligibleContrib.length;
    const eligibleWinners = contenders.filter(
      (c) => c.player.totalCommitted >= level && !c.player.folded,
    );
    if (eligibleWinners.length === 0) continue;
    const top = [...eligibleWinners].sort((a, b) =>
      b.rank.join(',') > a.rank.join(',') ? 1 : -1,
    )[0];
    const best = eligibleWinners.filter(
      (c) => c.rank.join(',') === top.rank.join(','),
    );
    const share = Math.floor(potSize / best.length);
    let remainder = potSize % best.length;
    for (const entry of best) {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      const win = share + extra;
      entry.player.stack += win;
      winTotals.set(
        entry.player.userId,
        (winTotals.get(entry.player.userId) ?? 0) + win,
      );
    }
    awarded += potSize;
    prev = level;
  }

  state.pot = Math.max(0, state.pot - awarded);

  for (const [userId, amount] of winTotals.entries()) {
    const rank = contenders.find((c) => c.player.userId === userId)?.rank;
    winners.push({
      userId,
      rankName: rank ? rankName(rank) : 'Winner',
      amount,
    });
  }

  const leader = [...winTotals.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    winnerUserId: leader?.[0] ?? null,
    winners,
  };
}

/** Exposed for unit tests — matches production showdown (mutates state). */
export function runShowdownForTest(state: Record<string, unknown>): {
  winnerUserId: string | null;
} {
  const runtime = state as RuntimePokerState;
  for (const player of runtime.players) {
    if (typeof player.totalCommitted !== 'number') {
      player.totalCommitted = player.committed;
    }
  }
  return showdown(runtime);
}

function advanceStreet(state: RuntimePokerState) {
  if (state.phase === PokerRound.PREFLOP) {
    burn(state);
    dealBoard(state, 3);
    state.phase = PokerRound.FLOP;
    normalizeRound(state);
    state.currentTurnSeatIndex = nextAliveSeat(state, state.buttonSeatIndex);
    return;
  }
  if (state.phase === PokerRound.FLOP) {
    burn(state);
    dealBoard(state, 1);
    state.phase = PokerRound.TURN;
    normalizeRound(state);
    state.currentTurnSeatIndex = nextAliveSeat(state, state.buttonSeatIndex);
    return;
  }
  if (state.phase === PokerRound.TURN) {
    burn(state);
    dealBoard(state, 1);
    state.phase = PokerRound.RIVER;
    normalizeRound(state);
    state.currentTurnSeatIndex = nextAliveSeat(state, state.buttonSeatIndex);
  }
}

function shouldRunOutBoard(state: RuntimePokerState) {
  const canStillAct = state.players.filter(
    (p) => !p.folded && !p.allIn && p.stack > 0,
  );
  return canStillAct.length <= 1 && state.board.length < 5;
}

function runOutRemainingBoard(state: RuntimePokerState) {
  while (state.board.length < 5) {
    advanceStreet(state);
  }
}

function resolveShowdown(state: RuntimePokerState): EngineResult {
  state.phase = PokerRound.SHOWDOWN;
  const result = showdown(state);
  state.winners = result.winners;
  state.phase = PokerRound.COMPLETE;
  return finishHandResult(state, result.winnerUserId);
}

function buildPokerStateFromStacks(
  context: EngineContext,
  stacks: Array<{ seatIndex: number; userId: string; stack: number }>,
  buttonSeatIndex: number,
  handNumber: number,
): RuntimePokerState {
  if (stacks.length < 2) {
    throw new BadRequestException(
      'Poker requires at least 2 seated players with chips.',
    );
  }
  const blindSmall = Math.max(5, Number(context.options?.smallBlind ?? 10));
  const blindBig = Math.max(
    blindSmall * 2,
    Number(context.options?.bigBlind ?? blindSmall * 2),
  );
  const ordered = [...stacks].sort((a, b) => a.seatIndex - b.seatIndex);
  const blinds = assignBlindSeats(ordered, buttonSeatIndex);
  const deck = buildDeck(
    Number(context.options?.seed ?? Date.now()) + handNumber,
  );
  const players: RuntimePokerPlayer[] = ordered.map((seat) => ({
    userId: seat.userId,
    seatIndex: seat.seatIndex,
    cards: [deck.shift() ?? '', deck.shift() ?? ''],
    stack: seat.stack,
    committed: 0,
    totalCommitted: 0,
    folded: false,
    allIn: false,
    acted: false,
  }));

  const state: RuntimePokerState = {
    gameType: GameType.POKER_HOLDEM,
    phase: PokerRound.PREFLOP,
    buttonSeatIndex: blinds.buttonSeatIndex,
    smallBlindSeatIndex: blinds.smallBlindSeatIndex,
    bigBlindSeatIndex: blinds.bigBlindSeatIndex,
    currentTurnSeatIndex: blinds.bigBlindSeatIndex,
    currentBet: blindBig,
    minRaise: blindBig,
    pot: 0,
    board: [],
    deck,
    players,
    handLog: [],
    handNumber,
    winners: [],
    bigBlind: blindBig,
  };

  const sb = state.players.find(
    (p) => p.seatIndex === blinds.smallBlindSeatIndex,
  );
  const bb = state.players.find(
    (p) => p.seatIndex === blinds.bigBlindSeatIndex,
  );
  if (!sb || !bb) throw new BadRequestException('Could not initialize blinds.');

  const postBlind = (player: RuntimePokerPlayer, amount: number) => {
    const spend = Math.min(player.stack, amount);
    player.stack -= spend;
    player.committed += spend;
    player.totalCommitted += spend;
    state.pot += spend;
    if (player.stack === 0) player.allIn = true;
    return spend;
  };

  postBlind(sb, blindSmall);
  postBlind(bb, blindBig);
  sb.acted = true;
  bb.acted = true;
  state.currentBet = bb.committed;
  state.currentTurnSeatIndex = nextAliveSeat(state, blinds.bigBlindSeatIndex);

  return state;
}

export function buildInitialPokerState(
  context: EngineContext,
): Record<string, unknown> {
  const buyIn = Math.max(1000, Number(context.options?.buyIn ?? 2000));
  const ordered = [...context.seats].sort((a, b) => a.seatIndex - b.seatIndex);
  const stacks = ordered.map((seat) => ({
    seatIndex: seat.seatIndex,
    userId: seat.userId,
    stack: buyIn,
  }));
  const button = ordered[0]?.seatIndex ?? 0;
  return buildPokerStateFromStacks(context, stacks, button, 1);
}

export function buildNextPokerHand(
  previousRaw: Record<string, unknown>,
  context: EngineContext,
): Record<string, unknown> {
  const previous = previousRaw as RuntimePokerState;
  if (previous.phase !== PokerRound.COMPLETE) {
    throw new BadRequestException('Current hand is not complete.');
  }
  const stacks = context.seats
    .map((seat) => {
      const row = previous.players.find((p) => p.userId === seat.userId);
      return {
        seatIndex: seat.seatIndex,
        userId: seat.userId,
        stack: row?.stack ?? 0,
      };
    })
    .filter((row) => row.stack > 0)
    .sort((a, b) => a.seatIndex - b.seatIndex);
  const nextButton = nextButtonSeat(stacks, previous.buttonSeatIndex);
  const handNumber = (previous.handNumber ?? 1) + 1;
  return buildPokerStateFromStacks(context, stacks, nextButton, handNumber);
}

export function applyPokerAction(
  stateRaw: Record<string, unknown>,
  context: EngineApplyContext,
): EngineResult {
  const state = stateRaw as RuntimePokerState;
  const rawKind = context.payload.kind;
  const kind = (
    typeof rawKind === 'string'
      ? rawKind
      : typeof rawKind === 'number' || typeof rawKind === 'boolean'
        ? String(rawKind)
        : ''
  ).toUpperCase();

  if (kind === 'NEXT_HAND') {
    throw new BadRequestException('Use the dedicated next-hand flow.');
  }

  if (state.phase === PokerRound.COMPLETE) {
    throw new BadRequestException('Hand is complete. Start the next hand.');
  }

  const player = getPlayer(state, context.userId);
  if (player.seatIndex !== state.currentTurnSeatIndex) {
    throw new BadRequestException('It is not your turn.');
  }
  if (player.folded || player.allIn) {
    throw new BadRequestException('Player cannot act in current hand state.');
  }

  const actionKind = kind as PokerActionKind;
  const targetAmount = Math.max(0, Number(context.payload.amount ?? 0));
  const toCall = Math.max(0, state.currentBet - player.committed);

  const commit = (amount: number) => {
    const spend = Math.min(player.stack, amount);
    player.stack -= spend;
    player.committed += spend;
    player.totalCommitted += spend;
    state.pot += spend;
    if (player.stack === 0) player.allIn = true;
    return spend;
  };

  if (actionKind === PokerActionKind.FOLD) {
    player.folded = true;
    player.acted = true;
  } else if (actionKind === PokerActionKind.CHECK) {
    if (toCall > 0)
      throw new BadRequestException('Cannot check when facing a bet.');
    player.acted = true;
  } else if (actionKind === PokerActionKind.CALL) {
    if (toCall <= 0) throw new BadRequestException('Nothing to call.');
    commit(toCall);
    player.acted = true;
  } else if (actionKind === PokerActionKind.BET) {
    if (state.currentBet > 0)
      throw new BadRequestException('Use raise when bet already exists.');
    if (targetAmount <= 0)
      throw new BadRequestException('Bet amount is required.');
    if (targetAmount < state.minRaise && targetAmount < player.stack) {
      throw new BadRequestException(`Minimum bet is ${state.minRaise}.`);
    }
    const spent = commit(targetAmount);
    state.currentBet = player.committed;
    state.minRaise = Math.max(state.minRaise, spent);
    for (const row of state.players) row.acted = row.userId === player.userId;
  } else if (
    actionKind === PokerActionKind.RAISE ||
    actionKind === PokerActionKind.ALL_IN
  ) {
    const desired =
      actionKind === PokerActionKind.ALL_IN
        ? player.stack + player.committed
        : targetAmount;
    if (desired <= state.currentBet)
      throw new BadRequestException('Raise must be above current bet.');
    const raiseBy = desired - state.currentBet;
    if (raiseBy < state.minRaise && desired < player.stack + player.committed) {
      throw new BadRequestException(
        `Minimum raise increment is ${state.minRaise}.`,
      );
    }
    commit(desired - player.committed);
    state.currentBet = player.committed;
    state.minRaise = Math.max(state.minRaise, raiseBy);
    for (const row of state.players) row.acted = row.userId === player.userId;
  } else {
    throw new BadRequestException('Unsupported poker action.');
  }

  state.handLog.push({
    kind: actionKind,
    seatIndex: player.seatIndex,
    amount: player.committed,
    timestamp: new Date().toISOString(),
  });

  const alive = state.players.filter((p) => !p.folded);
  if (alive.length <= 1) {
    const winner = alive[0];
    if (winner) {
      const amount = state.pot;
      winner.stack += amount;
      state.pot = 0;
      state.winners = [
        { userId: winner.userId, rankName: 'Last player standing', amount },
      ];
    }
    state.phase = PokerRound.COMPLETE;
    return finishHandResult(state, winner?.userId ?? null);
  }

  if (canAdvanceRound(state)) {
    if (shouldRunOutBoard(state)) {
      runOutRemainingBoard(state);
      return resolveShowdown(state);
    }

    if (state.phase === PokerRound.RIVER) {
      return resolveShowdown(state);
    }

    advanceStreet(state);

    if (canAdvanceRound(state) && shouldRunOutBoard(state)) {
      runOutRemainingBoard(state);
      return resolveShowdown(state);
    }

    if (canAdvanceRound(state) && jsonPhaseIsRiver(state.phase)) {
      return resolveShowdown(state);
    }

    return { state };
  }

  state.currentTurnSeatIndex = nextAliveSeat(state, player.seatIndex);
  return { state };
}
