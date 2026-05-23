import type { ApiGameType } from "@/lib/games-client";

export const gameMeta = [
  { id: "chess", type: "CHESS", name: "Chess", copy: "Classic tactical duel with move validation and checkmate detection." },
  { id: "checkers", type: "CHECKERS", name: "Checkers", copy: "Turn-based board strategy with captures and king promotion." },
  { id: "gomoku", type: "GOMOKU", name: "Gomoku", copy: "Elegant five-in-a-row strategy on a polished 15x15 board." },
  { id: "dotsandboxes", type: "DOTS_AND_BOXES", name: "Dots and Boxes", copy: "Claim lines, complete boxes, and chain bonus turns in realtime." },
  { id: "connect4", type: "CONNECT4", name: "Connect 4", copy: "Fast multiplayer drop-grid game with realtime turns." },
] as const satisfies ReadonlyArray<{ id: string; type: ApiGameType; name: string; copy: string }>;

export function gameIdToType(gameId: string): ApiGameType {
  return gameMeta.find((entry) => entry.id === gameId)?.type ?? "CHESS";
}

export function gameTypeToId(gameType: ApiGameType): string {
  return gameMeta.find((entry) => entry.type === gameType)?.id ?? "chess";
}
