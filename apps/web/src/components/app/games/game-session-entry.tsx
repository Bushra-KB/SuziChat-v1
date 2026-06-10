"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GameSessionClient } from "@/components/app/games/game-session-client";

function GameSessionEntryInner({ gameRouteId }: { gameRouteId: string }) {
  const sessionId = useSearchParams().get("s") ?? "";
  return <GameSessionClient sessionId={sessionId} gameRouteId={gameRouteId} />;
}

// Reads the `?s=` session id on the client so the page is statically exportable.
export function GameSessionEntry({ gameRouteId }: { gameRouteId: string }) {
  return (
    <Suspense fallback={null}>
      <GameSessionEntryInner gameRouteId={gameRouteId} />
    </Suspense>
  );
}
