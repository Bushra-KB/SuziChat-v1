import { GameLobbyEntry } from "@/components/app/games/game-lobby-entry";

export default async function GameLobbyPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return <GameLobbyEntry gameId={gameId} />;
}
