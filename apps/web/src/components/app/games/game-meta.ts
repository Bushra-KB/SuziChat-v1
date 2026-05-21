import type { ApiGameType } from "@/lib/games-client";

export const gameMeta = [
  { id: "chess", type: "CHESS", name: "Chess", copy: "Classic tactical duel with move validation and checkmate detection." },
  { id: "checkers", type: "CHECKERS", name: "Checkers", copy: "Turn-based board strategy with captures and king promotion." },
  { id: "neonhockey", type: "NEON_HOCKEY", name: "Suzi Neon Hockey", copy: "Fast 2-player realtime air hockey with glowing paddles, puck trails, and arcade audio." },
  { id: "tankduel", type: "TANK_DUEL", name: "Suzi Cosmic Tank Duel", copy: "Realtime 2-player arena duel with hover tanks, laser shots, obstacles, and explosive SFX." },
  { id: "connect4", type: "CONNECT4", name: "Connect 4", copy: "Fast multiplayer drop-grid game with realtime turns." },
] as const satisfies ReadonlyArray<{ id: string; type: ApiGameType; name: string; copy: string }>;

export function gameIdToType(gameId: string): ApiGameType {
  return gameMeta.find((entry) => entry.id === gameId)?.type ?? "CHESS";
}

export function gameTypeToId(gameType: ApiGameType): string {
  return gameMeta.find((entry) => entry.type === gameType)?.id ?? "chess";
}
