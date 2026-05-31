import { GameLobbyClient } from "@/components/app/games/game-lobby-client";

export default async function GameLobbyPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ lobby?: string }>;
}) {
  const { gameId } = await params;
  const { lobby } = await searchParams;
  return <GameLobbyClient gameId={gameId} invitedLobbyId={lobby ?? ""} />;
}
