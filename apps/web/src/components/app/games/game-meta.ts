import type { ApiGameType } from "@/lib/games-client";

export const gameMeta = [
  { id: "chess", type: "CHESS", name: "Chess", copy: "Classic tactical duel with move validation and checkmate detection." },
  { id: "checkers", type: "CHECKERS", name: "Checkers", copy: "Turn-based board strategy with captures and king promotion." },
  { id: "poker", type: "POKER_HOLDEM", name: "Poker", copy: "Texas Hold'em table with blinds, raises, side pots, and showdown." },
  { id: "connect4", type: "CONNECT4", name: "Connect 4", copy: "Fast multiplayer drop-grid game with realtime turns." },
  {
    id: "texasholdem",
    type: "POKER_HOLDEM",
    name: "Texas Hold'em",
    copy: "Texas Hold'em tables with blinds, raises, side pots, and showdown.",
  },
] as const satisfies ReadonlyArray<{ id: string; type: ApiGameType; name: string; copy: string }>;

export function gameIdToType(gameId: string): ApiGameType {
  return gameMeta.find((entry) => entry.id === gameId)?.type ?? "CHESS";
}

export function gameTypeToId(gameType: ApiGameType): string {
  return gameMeta.find((entry) => entry.type === gameType)?.id ?? "chess";
}
