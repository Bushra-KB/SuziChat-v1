/** Small icons for home dashboard tiles (`public/games/*_icon.*`). */
export const gameIcons = {
  chess: "/games/Chess_icon.jpg",
  checkers: "/games/Checker_icon.jpg",
  neonhockey: "/games/Suzi_Neon_Hockey.png",
  tankduel: "/games/Suzi_Cosmic_Tank_Duel.png",
  connect4: "/games/Connect4_icon.jpg",
} as const;

/** Table artwork for game lobby cards (`public/games/*_table.png`). */
export const gameLobbyArt = {
  chess: "/games/table-chess.png",
  checkers: "/games/checker_table.png",
  neonhockey: "/games/Suzi_Neon_Hockey._lobby_table.png",
  tankduel: "/games/Suzi_Cosmic_Tank_Duel_lobby_table.png",
  connect4: "/games/connect4_table.png",
} as const;

export type GameIconId = keyof typeof gameIcons;

export function gameIconForId(gameId: string): string {
  return gameIcons[gameId as GameIconId] ?? gameIcons.chess;
}

export function gameLobbyArtForId(gameId: string): string {
  return gameLobbyArt[gameId as GameIconId] ?? gameLobbyArt.chess;
}
