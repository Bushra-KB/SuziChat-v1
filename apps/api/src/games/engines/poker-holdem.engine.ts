import { BadRequestException } from '@nestjs/common';
import { GameType, PokerActionKind, PokerRound } from '@prisma/client';
import type { EngineApplyContext, EngineContext, EngineResult, PokerPlayerState, PokerState } from './game-engine.types';

type RuntimePokerPlayer = PokerPlayerState & {
  acted: boolean;
};

type RuntimePokerState = Omit<PokerState, 'players'> & {
  players: RuntimePokerPlayer[];
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
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck;
}

function nextAliveSeat(state: RuntimePokerState, startSeatIndex: number): number {
  const ordered = [...state.players].sort((a, b) => a.seatIndex - b.seatIndex);
  const startPos = ordered.findIndex((player) => player.seatIndex === startSeatIndex);
  for (let step = 1; step <= ordered.length; step += 1) {
    const row = ordered[(startPos + step) % ordered.length]!;
    if (!row.folded && row.stack > 0) {
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
  state.minRaise = Math.max(state.minRaise, 1);
}

type EvalRank = [number, number, number, number, number, number];
const rankValue = (card: string) => RANKS.indexOf(card[0] ?? '2') + 2;

function evaluate5(cards: string[]): EvalRank {
  const values = cards.map(rankValue).sort((a, b) => b - a);
  const suits = cards.map((c) => c[1]);
  const flush = suits.every((s) => s === suits[0]);
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const unique = [...new Set(values)];
  const wheel = [14, 5, 4, 3, 2];
  const straight = unique.length === 5 && (unique[0]! - unique[4]! === 4 || wheel.every((v, i) => unique[i] === v));
  const sortedGroups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  if (straight && flush) return [8, unique[0] === 14 && unique[1] === 5 ? 5 : unique[0]!, 0, 0, 0, 0];
  if (sortedGroups[0]?.[1] === 4) return [7, sortedGroups[0][0], sortedGroups[1]?.[0] ?? 0, 0, 0, 0];
  if (sortedGroups[0]?.[1] === 3 && sortedGroups[1]?.[1] === 2) return [6, sortedGroups[0][0], sortedGroups[1][0], 0, 0, 0];
  if (flush) return [5, values[0]!, values[1]!, values[2]!, values[3]!, values[4]!];
  if (straight) return [4, unique[0] === 14 && unique[1] === 5 ? 5 : unique[0]!, 0, 0, 0, 0];
  if (sortedGroups[0]?.[1] === 3) {
    const kickers = sortedGroups.filter((g) => g[1] === 1).map((g) => g[0]).sort((a, b) => b - a);
    return [3, sortedGroups[0][0], kickers[0] ?? 0, kickers[1] ?? 0, 0, 0];
  }
  if (sortedGroups[0]?.[1] === 2 && sortedGroups[1]?.[1] === 2) {
    const highPair = Math.max(sortedGroups[0][0], sortedGroups[1][0]);
    const lowPair = Math.min(sortedGroups[0][0], sortedGroups[1][0]);
    const kicker = sortedGroups.find((g) => g[1] === 1)?.[0] ?? 0;
    return [2, highPair, lowPair, kicker, 0, 0];
  }
  if (sortedGroups[0]?.[1] === 2) {
    const kickers = sortedGroups.filter((g) => g[1] === 1).map((g) => g[0]).sort((a, b) => b - a);
    return [1, sortedGroups[0][0], kickers[0] ?? 0, kickers[1] ?? 0, kickers[2] ?? 0, 0];
  }
  return [0, values[0]!, values[1]!, values[2]!, values[3]!, values[4]!];
}

function evaluateBestOf7(cards: string[]): EvalRank {
  let best: EvalRank = [0, 0, 0, 0, 0, 0];
  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            const rank = evaluate5([cards[a]!, cards[b]!, cards[c]!, cards[d]!, cards[e]!]);
            if (rank.join(',') > best.join(',')) best = rank;
          }
        }
      }
    }
  }
  return best;
}

function showdown(state: RuntimePokerState): { winnerUserId: string | null } {
  const alive = state.players.filter((p) => !p.folded);
  if (alive.length === 1) {
    alive[0]!.stack += state.pot;
    state.pot = 0;
    return { winnerUserId: alive[0]!.userId };
  }
  const contenders = alive.map((player) => ({
    player,
    rank: evaluateBestOf7([...player.cards, ...state.board]),
  }));

  const levels = [...new Set(state.players.map((p) => p.committed).filter((c) => c > 0))].sort((a, b) => a - b);
  let awarded = 0;
  let prev = 0;
  for (const level of levels) {
    const eligibleContrib = state.players.filter((p) => p.committed >= level);
    const potSize = (level - prev) * eligibleContrib.length;
    const eligibleWinners = contenders.filter((c) => c.player.committed >= level && !c.player.folded);
    if (eligibleWinners.length === 0) continue;
    const top = [...eligibleWinners].sort((a, b) => (b.rank.join(',') > a.rank.join(',') ? 1 : -1))[0]!;
    const best = eligibleWinners.filter((c) => c.rank.join(',') === top.rank.join(','));
    const share = Math.floor(potSize / best.length);
    let remainder = potSize % best.length;
    for (const entry of best) {
      entry.player.stack += share + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
    }
    awarded += potSize;
    prev = level;
  }
  state.pot = Math.max(0, state.pot - awarded);
  const leader = [...contenders].sort((a, b) => b.player.stack - a.player.stack)[0]?.player ?? null;
  return { winnerUserId: leader?.userId ?? null };
}

export function buildInitialPokerState(context: EngineContext): Record<string, unknown> {
  if (context.seats.length < 2) {
    throw new BadRequestException('Poker requires at least 2 seated players.');
  }
  const buyIn = Math.max(1000, Number(context.options?.buyIn ?? 2000));
  const blindSmall = Math.max(5, Number(context.options?.smallBlind ?? 10));
  const blindBig = Math.max(blindSmall * 2, Number(context.options?.bigBlind ?? blindSmall * 2));
  const ordered = [...context.seats].sort((a, b) => a.seatIndex - b.seatIndex);
  const deck = buildDeck(Number(context.options?.seed ?? Date.now()));
  const players: RuntimePokerPlayer[] = ordered.map((seat) => ({
    userId: seat.userId,
    seatIndex: seat.seatIndex,
    cards: [deck.shift() ?? '', deck.shift() ?? ''],
    stack: buyIn,
    committed: 0,
    folded: false,
    allIn: false,
    acted: false,
  }));
  const button = ordered[0]?.seatIndex ?? 0;
  const smallSeat = ordered[1 % ordered.length]?.seatIndex ?? button;
  const bigSeat = ordered[2 % ordered.length]?.seatIndex ?? smallSeat;
  const state: RuntimePokerState = {
    gameType: GameType.POKER_HOLDEM,
    phase: PokerRound.PREFLOP,
    buttonSeatIndex: button,
    smallBlindSeatIndex: smallSeat,
    bigBlindSeatIndex: bigSeat,
    currentTurnSeatIndex: nextAliveSeat(
      {
        phase: PokerRound.PREFLOP,
        buttonSeatIndex: button,
        smallBlindSeatIndex: smallSeat,
        bigBlindSeatIndex: bigSeat,
        currentTurnSeatIndex: bigSeat,
        currentBet: blindBig,
        minRaise: blindBig,
        pot: blindSmall + blindBig,
        board: [],
        deck,
        players,
        handLog: [],
        gameType: GameType.POKER_HOLDEM,
      },
      bigSeat,
    ),
    currentBet: blindBig,
    minRaise: blindBig,
    pot: blindSmall + blindBig,
    board: [],
    deck,
    players,
    handLog: [],
  };
  const sb = state.players.find((p) => p.seatIndex === smallSeat);
  const bb = state.players.find((p) => p.seatIndex === bigSeat);
  if (!sb || !bb) throw new BadRequestException('Could not initialize blinds.');
  sb.committed = Math.min(sb.stack, blindSmall);
  sb.stack -= sb.committed;
  bb.committed = Math.min(bb.stack, blindBig);
  bb.stack -= bb.committed;
  sb.acted = true;
  bb.acted = true;
  return state;
}

export function applyPokerAction(stateRaw: Record<string, unknown>, context: EngineApplyContext): EngineResult {
  const state = stateRaw as RuntimePokerState;
  if (state.phase === PokerRound.COMPLETE) {
    throw new BadRequestException('Poker hand is complete.');
  }
  const player = getPlayer(state, context.userId);
  if (player.seatIndex !== state.currentTurnSeatIndex) {
    throw new BadRequestException('It is not your turn.');
  }
  if (player.folded || player.allIn) {
    throw new BadRequestException('Player cannot act in current hand state.');
  }
  const kind = String(context.payload.kind ?? '').toUpperCase() as PokerActionKind;
  const targetAmount = Math.max(0, Number(context.payload.amount ?? 0));
  const toCall = Math.max(0, state.currentBet - player.committed);

  const commit = (amount: number) => {
    const spend = Math.min(player.stack, amount);
    player.stack -= spend;
    player.committed += spend;
    state.pot += spend;
    if (player.stack === 0) player.allIn = true;
    return spend;
  };

  if (kind === PokerActionKind.FOLD) {
    player.folded = true;
    player.acted = true;
  } else if (kind === PokerActionKind.CHECK) {
    if (toCall > 0) throw new BadRequestException('Cannot check when facing a bet.');
    player.acted = true;
  } else if (kind === PokerActionKind.CALL) {
    if (toCall <= 0) throw new BadRequestException('Nothing to call.');
    commit(toCall);
    player.acted = true;
  } else if (kind === PokerActionKind.BET) {
    if (state.currentBet > 0) throw new BadRequestException('Use raise when bet already exists.');
    if (targetAmount <= 0) throw new BadRequestException('Bet amount is required.');
    if (targetAmount < state.minRaise && targetAmount < player.stack) {
      throw new BadRequestException(`Minimum bet is ${state.minRaise}.`);
    }
    const spent = commit(targetAmount);
    state.currentBet = player.committed;
    state.minRaise = Math.max(state.minRaise, spent);
    for (const row of state.players) row.acted = row.userId === player.userId;
  } else if (kind === PokerActionKind.RAISE || kind === PokerActionKind.ALL_IN) {
    const desired = kind === PokerActionKind.ALL_IN ? player.stack + player.committed : targetAmount;
    if (desired <= state.currentBet) throw new BadRequestException('Raise must be above current bet.');
    const raiseBy = desired - state.currentBet;
    if (raiseBy < state.minRaise && desired < player.stack + player.committed) {
      throw new BadRequestException(`Minimum raise increment is ${state.minRaise}.`);
    }
    commit(desired - player.committed);
    state.currentBet = player.committed;
    state.minRaise = Math.max(state.minRaise, raiseBy);
    for (const row of state.players) row.acted = row.userId === player.userId;
  } else {
    throw new BadRequestException('Unsupported poker action.');
  }

  state.handLog.push({
    kind,
    seatIndex: player.seatIndex,
    amount: player.committed,
    timestamp: new Date().toISOString(),
  });

  const alive = state.players.filter((p) => !p.folded);
  if (alive.length <= 1) {
    const winner = alive[0];
    if (winner) winner.stack += state.pot;
    state.pot = 0;
    state.phase = PokerRound.COMPLETE;
    return { state, status: 'finished', winnerUserId: winner?.userId ?? null };
  }

  if (canAdvanceRound(state)) {
    if (state.phase === PokerRound.PREFLOP) {
      burn(state);
      dealBoard(state, 3);
      state.phase = PokerRound.FLOP;
      normalizeRound(state);
      state.currentTurnSeatIndex = nextAliveSeat(state, state.buttonSeatIndex);
    } else if (state.phase === PokerRound.FLOP) {
      burn(state);
      dealBoard(state, 1);
      state.phase = PokerRound.TURN;
      normalizeRound(state);
      state.currentTurnSeatIndex = nextAliveSeat(state, state.buttonSeatIndex);
    } else if (state.phase === PokerRound.TURN) {
      burn(state);
      dealBoard(state, 1);
      state.phase = PokerRound.RIVER;
      normalizeRound(state);
      state.currentTurnSeatIndex = nextAliveSeat(state, state.buttonSeatIndex);
    } else if (state.phase === PokerRound.RIVER || state.players.filter((p) => !p.folded && !p.allIn).length <= 1) {
      state.phase = PokerRound.SHOWDOWN;
      const result = showdown(state);
      state.phase = PokerRound.COMPLETE;
      return { state, status: 'finished', winnerUserId: result.winnerUserId };
    }
    return { state };
  }

  state.currentTurnSeatIndex = nextAliveSeat(state, player.seatIndex);
  return { state };
}
