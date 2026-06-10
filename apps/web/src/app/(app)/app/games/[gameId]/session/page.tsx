import { GameSessionEntry } from "@/components/app/games/game-session-entry";

// Session id travels as `?s=<sessionId>` (read client-side) so the route stays
// statically exportable; `gameId` remains a pre-rendered path segment.
export default async function GameSessionPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return <GameSessionEntry gameRouteId={gameId} />;
}
