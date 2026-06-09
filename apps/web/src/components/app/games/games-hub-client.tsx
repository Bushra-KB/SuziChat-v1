"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { gameMeta, gameTypeToId } from "@/components/app/games/game-meta";
import { Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { createGameLobby, listGameLobbies, type ApiGameLobby, type ApiGameType } from "@/lib/games-client";
import { getStoredAuthSession } from "@/lib/auth-client";
import { gameIconForId } from "@/lib/game-icons";
import { openGamesSocket, subscribeGameLobbyListChannel } from "@/lib/games-realtime";
import { useI18n } from "@/lib/i18n";

export function GamesHubClient() {
  const router = useRouter();
  const { t } = useI18n();
  const [lobbies, setLobbies] = useState<ApiGameLobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  useEffect(() => {
    void listGameLobbies()
      .then(setLobbies)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("games.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

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
        .catch((e: unknown) => setError(e instanceof Error ? e.message : t("games.loadError")));
    };
    socket.on("connect", onConnect);
    socket.on("game:lobbies:update", onLobbiesUpdate);
    if (socket.connected) onConnect();
    return () => {
      socket.off("connect", onConnect);
      socket.off("game:lobbies:update", onLobbiesUpdate);
    };
  }, [t]);

  const openCountByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const lobby of lobbies) {
      map.set(lobby.gameType, (map.get(lobby.gameType) ?? 0) + 1);
    }
    return map;
  }, [lobbies]);

  async function createQuickLobby(gameType: ApiGameType, gameName: string) {
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      setError(t("games.loginRequired"));
      return;
    }
    setCreatingFor(gameType);
    setError("");
    try {
      const lobby = await createGameLobby(session.accessToken, {
        gameType,
        title: `${gameName} ${t("games.quickTable")}`,
      });
      router.push(`/app/games/${gameTypeToId(lobby.gameType)}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("games.createError"));
    } finally {
      setCreatingFor(null);
    }
  }

  return (
    <section className="suzi-app-frame-fill">
      <div className="suzi-app-frame-scroll suzi-scrollbar space-y-6 pr-1">
        <Panel className="p-6 sm:p-7">
          <SectionHeader
            eyebrow={t("games.eyebrow")}
            title={t("games.title")}
            copy={t("games.copy")}
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {gameMeta.map((game) => (
              <article key={game.id} className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/4 p-3">
                <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-[1rem] border border-white/10 bg-[#120b3d]">
                  <Image
                    src={gameIconForId(game.id)}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 50vw, 220px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#11072f]/80 via-transparent to-transparent" />
                </div>
                <p className="text-2xl font-semibold text-white">{game.name}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300/78">{game.copy}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-cyan-100/66">
                  {openCountByType.get(game.type) ?? 0} {t("games.openLobbies")}
                </p>
                <div className="mt-4 grid gap-2">
                  <Link href={`/app/games/${game.id}`} className="suzi-primary-btn block px-4 py-2.5 text-center text-sm">
                    {t("games.openLobby")}
                  </Link>
                  <button
                    type="button"
                    disabled={creatingFor === game.type}
                    onClick={() => void createQuickLobby(game.type, game.name)}
                    className="suzi-secondary-btn px-4 py-2.5 text-sm disabled:opacity-60"
                  >
                    {creatingFor === game.type ? t("games.creating") : t("games.quickCreate")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </Panel>
        {loading ? <p className="px-1 text-sm text-cyan-100/70">{t("games.loadingLobbies")}</p> : null}
        {error ? <p className="rounded-xl border border-pink-400/30 bg-pink-500/10 px-4 py-3 text-sm text-pink-100">{error}</p> : null}
      </div>
    </section>
  );
}
