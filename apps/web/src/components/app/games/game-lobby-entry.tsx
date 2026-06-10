"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GameLobbyClient } from "@/components/app/games/game-lobby-client";

function GameLobbyEntryInner({ gameId }: { gameId: string }) {
  const invitedLobbyId = useSearchParams().get("lobby") ?? "";
  return <GameLobbyClient gameId={gameId} invitedLobbyId={invitedLobbyId} />;
}

// Reads the optional `?lobby=` invite param on the client so the lobby page
// needs no server-side searchParams (required for static export).
export function GameLobbyEntry({ gameId }: { gameId: string }) {
  return (
    <Suspense fallback={null}>
      <GameLobbyEntryInner gameId={gameId} />
    </Suspense>
  );
}
