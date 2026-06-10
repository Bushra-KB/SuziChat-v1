import type { ReactNode } from "react";
import { gameMeta } from "@/components/app/games/game-meta";

// `gameId` is a fixed game-type id (chess, checkers, gomoku, ...), so the route
// can be fully pre-rendered for static export. Declaring it on the layout covers
// every page under [gameId] (the lobby page and the session page).
export function generateStaticParams() {
  return gameMeta.map((game) => ({ gameId: game.id }));
}

export default function GameIdLayout({ children }: { children: ReactNode }) {
  return children;
}
