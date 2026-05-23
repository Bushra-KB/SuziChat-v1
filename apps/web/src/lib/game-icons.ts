/** Small icons for home dashboard tiles (`public/games/*_icon.*`). */
export const gameIcons = {
  chess: "/games/Chess_icon.jpg",
  checkers: "/games/Checker_icon.jpg",
  gomoku: "/games/Gomoku.png",
  dotsandboxes: "/games/Dots_and_Boxes.png",
  connect4: "/games/Connect4_icon.jpg",
} as const;

/** Table artwork for game lobby cards (`public/games/*_table.png`). */
export const gameLobbyArt = {
  chess: "/games/table-chess.png",
  checkers: "/games/checker_table.png",
  gomoku: "/games/Gomoku_table.png",
  dotsandboxes: "/games/Dots_and_Boxes_table.png",
  connect4: "/games/connect4_table.png",
} as const;

export type GameIconId = keyof typeof gameIcons;

export function gameIconForId(gameId: string): string {
  return gameIcons[gameId as GameIconId] ?? gameIcons.chess;
}

export function gameLobbyArtForId(gameId: string): string {
  return gameLobbyArt[gameId as GameIconId] ?? gameLobbyArt.chess;
}
