"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { gameMeta, gameTypeToId } from "@/components/app/games/game-meta";
import { Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { createGameLobby, listGameLobbies, type ApiGameLobby } from "@/lib/games-client";
import { getStoredAuthSession } from "@/lib/auth-client";
import { openGamesSocket, subscribeGameLobbyListChannel } from "@/lib/games-realtime";

export function GamesHubClient() {
  const [lobbies, setLobbies] = useState<ApiGameLobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  useEffect(() => {
    void listGameLobbies()
      .then(setLobbies)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load lobbies."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const auth = getStoredAuthSession();
    if (!auth?.accessToken) return;
    const socket = openGamesSocket(auth.accessToken);
    const onConnect = () => {
      subscribeGameLobbyListChannel(socket);
    };
    const onLobbiesUpdate = () => {
      void listGameLobbies()
        .then(setLobbies)
        .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load lobbies."));
    };
    socket.on("connect", onConnect);
    socket.on("game:lobbies:update", onLobbiesUpdate);
    if (socket.connected) onConnect();
    return () => {
      socket.off("connect", onConnect);
      socket.off("game:lobbies:update", onLobbiesUpdate);
    };
  }, []);

  const openCountByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const lobby of lobbies) {
      map.set(lobby.gameType, (map.get(lobby.gameType) ?? 0) + 1);
    }
    return map;
  }, [lobbies]);

  async function createQuickLobby(gameType: "CHESS" | "CHECKERS" | "CONNECT4" | "POKER_HOLDEM", gameName: string) {
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      setError("Login required to create a lobby.");
      return;
    }
    setCreatingFor(gameType);
    setError("");
    try {
      const lobby = await createGameLobby(session.accessToken, {
        gameType,
        title: `${gameName} Quick Table`,
      });
      window.location.href = `/app/games/${gameTypeToId(lobby.gameType)}`;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not create lobby.");
    } finally {
      setCreatingFor(null);
    }
  }

  return (
    <section className="suzi-app-frame-fill">
      <div className="suzi-app-frame-scroll suzi-scrollbar space-y-6 pr-1">
        <Panel className="p-6 sm:p-7">
          <SectionHeader
            eyebrow="Suzi Games"
            title="Realtime multiplayer game hub"
            copy="Create or join game lobbies, invite friends, and play in synced sessions with authoritative server state."
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {gameMeta.map((game) => (
              <article key={game.id} className="rounded-[1.4rem] border border-white/10 bg-white/4 p-4">
                <p className="text-2xl font-semibold text-white">{game.name}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300/78">{game.copy}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-cyan-100/66">
                  {openCountByType.get(game.type) ?? 0} open lobbies
                </p>
                <div className="mt-4 grid gap-2">
                  <Link href={`/app/games/${game.id}`} className="suzi-primary-btn block px-4 py-2.5 text-center text-sm">
                    Open lobby
                  </Link>
                  <button
                    type="button"
                    disabled={creatingFor === game.type}
                    onClick={() => void createQuickLobby(game.type, game.name)}
                    className="suzi-secondary-btn px-4 py-2.5 text-sm disabled:opacity-60"
                  >
                    {creatingFor === game.type ? "Creating..." : "Quick create"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </Panel>
        {loading ? <p className="px-1 text-sm text-cyan-100/70">Loading active lobbies...</p> : null}
        {error ? <p className="rounded-xl border border-pink-400/30 bg-pink-500/10 px-4 py-3 text-sm text-pink-100">{error}</p> : null}
      </div>
    </section>
  );
}
