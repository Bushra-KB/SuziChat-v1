/** Static paths under `public/games/` for home + lobby artwork. */
export const gameIcons = {
  chess: "/games/Chess_icon.jpg",
  checkers: "/games/Checker_icon.jpg",
  poker: "/games/Poker_icon.jpg",
  connect4: "/games/Connect4_icon.jpg",
  texasholdem: "/games/TexasHodem_icon.jpg",
} as const;

export type GameIconId = keyof typeof gameIcons;

export function gameIconForId(gameId: string): string {
  return gameIcons[gameId as GameIconId] ?? gameIcons.chess;
}
