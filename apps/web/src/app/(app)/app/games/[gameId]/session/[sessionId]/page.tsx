import { GameSessionClient } from "@/components/app/games/game-session-client";

export default async function GameSessionPage({
  params,
}: {
  params: Promise<{ gameId: string; sessionId: string }>;
}) {
  const { sessionId, gameId } = await params;
  return <GameSessionClient sessionId={sessionId} gameRouteId={gameId} />;
}
