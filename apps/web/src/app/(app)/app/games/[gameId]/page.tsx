import { GameLobbyClient } from "@/components/app/games/game-lobby-client";

export default async function GameLobbyPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return <GameLobbyClient gameId={gameId} />;
}
