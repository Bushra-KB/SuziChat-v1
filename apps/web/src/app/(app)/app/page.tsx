"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { gameMeta } from "@/components/app/games/game-meta";
import { HomeChatRoomsPanel } from "@/components/app/home-chat-rooms-panel";
import { HomeDatingPanel } from "@/components/app/home-dating-panel";
import { HomeFriendsPanel } from "@/components/app/home-friends-panel";
import { HomeReelsPanel } from "@/components/app/home-reels-panel";
import { HomeSnapsPanel } from "@/components/app/home-snaps-panel";
import { Panel } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import { listGameLobbies, type ApiGameLobby } from "@/lib/games-client";
import { openGamesSocket, subscribeGameLobbyListChannel } from "@/lib/games-realtime";
import { games } from "@/lib/v1-mock-data";

/*
 * Home dashboard — desktop SPA grid, fits 100dvh without page scroll.
 *
 *   ┌──────────────┬──────────────────────────┬────────────────┐
 *   │              │                          │                │
 *   │  Friends     │  Suzi Chat Rooms         │  Suzi Snaps    │
 *   │  (large)     │  (large)                 │  (50%)         │
 *   │              │                          │                │
 *   │              ├──────────────────────────┼────────────────┤
 *   │              │  Suzi Games (compact)    │                │
 *   │              │   – name + CTA overlay   │  Suzi Reels    │
 *   │  Dating      │     on image             │  (50%, 2-col)  │
 *   └──────────────┴──────────────────────────┴────────────────┘
 *
 * Each cell is `minmax(0, 1fr)`-sized so internal panels can scroll
 * without the dashboard expanding beyond the viewport.
 */
export default function AppHomePage() {
  const [lobbies, setLobbies] = useState<ApiGameLobby[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void listGameLobbies()
        .then((rows) => {
          if (!cancelled) setLobbies(rows);
        })
        .catch(() => {
          if (!cancelled) setLobbies([]);
        });
    };
    load();

    const auth = getStoredAuthSession();
    if (!auth?.accessToken) {
      return () => {
        cancelled = true;
      };
    }

    const socket = openGamesSocket(auth.accessToken);
    const onConnect = () => subscribeGameLobbyListChannel(socket);
    const onLobbiesUpdate = () => load();
    socket.on("connect", onConnect);
    socket.on("game:lobbies:update", onLobbiesUpdate);
    if (socket.connected) onConnect();
    return () => {
      cancelled = true;
      socket.off("connect", onConnect);
      socket.off("game:lobbies:update", onLobbiesUpdate);
    };
  }, []);

  const playingByGameType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lobby of lobbies) {
      if (lobby.sessions[0]?.status !== "ACTIVE") continue;
      const occupied = lobby.seats.filter((seat) => seat.userId).length;
      counts.set(lobby.gameType, (counts.get(lobby.gameType) ?? 0) + occupied);
    }
    return counts;
  }, [lobbies]);

  return (
    <section className="suzi-app-frame-fill">
      <div className="suzi-home-grid">
        {/* LEFT RAIL — Friends (tall) + Dating (compact banner) */}
        <div className="suzi-col-stack">
          <div className="flex min-h-0 flex-[5_1_0%] flex-col overflow-hidden">
            <HomeFriendsPanel />
          </div>
          <div className="flex min-h-0 flex-[1_1_0%] flex-col overflow-hidden">
            <HomeDatingPanel />
          </div>
        </div>

        {/* MIDDLE — Chat Rooms (tall) + Games (compact, overlay cards) */}
        <div className="suzi-col-stack">
          <div className="flex min-h-0 flex-[7_1_0%] flex-col overflow-hidden">
            <HomeChatRoomsPanel variant="dashboard" />
          </div>

          <div className="flex min-h-0 flex-[3_1_0%] flex-col overflow-hidden">
            <Panel className="flex h-full min-h-0 flex-col overflow-hidden p-[var(--panel-pad)]">
              <div className="flex shrink-0 items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-[0.7rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-fuchsia-100/92 shadow-[0_0_12px_rgba(157,78,221,0.28)]">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="4" y="8" width="16" height="9" rx="4.5" />
                      <path d="M8 12h3M9.5 10.5v3" />
                      <circle cx="15.5" cy="11.5" r=".8" fill="currentColor" stroke="none" />
                      <circle cx="17.5" cy="13.5" r=".8" fill="currentColor" stroke="none" />
                    </svg>
                  </span>
                  <h2 className="whitespace-nowrap text-[var(--fs-xl)] font-bold tracking-tight text-white">
                    Suzi Games
                  </h2>
                </div>

                <span className="shrink-0 whitespace-nowrap text-[var(--fs-2xs)] font-medium text-cyan-100/62">
                  Live lobbies
                </span>
              </div>

              <div className="mt-2.5 min-h-0 flex-1 overflow-hidden">
                <div className="grid h-full grid-cols-2 gap-2 sm:grid-cols-4">
                  {games.map((game) => {
                    const meta = gameMeta.find((entry) => entry.id === game.id);
                    const playing = meta ? (playingByGameType.get(meta.type) ?? 0) : 0;
                    return (
                    <article
                      key={game.id}
                      className="group relative min-h-0 overflow-hidden rounded-[0.85rem] border border-cyan-300/22 bg-[rgba(20,12,72,0.6)] shadow-[0_0_18px_rgba(157,78,221,0.16)]"
                    >
                      <Image
                        src={game.icon}
                        alt={game.name}
                        fill
                        sizes="(min-width: 1280px) 14vw, 32vw"
                        className="object-cover transition duration-200 group-hover:scale-[1.04]"
                      />

                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,26,0)_42%,rgba(4,8,26,0.55)_70%,rgba(4,8,26,0.94)_100%)]" />

                      <span className="absolute left-1.5 top-1.5 inline-flex items-center rounded-full border border-white/16 bg-black/42 px-1.5 py-0.5 text-[var(--fs-2xs)] font-medium text-white/92 backdrop-blur-sm">
                        {playing} playing
                      </span>

                      <div className="absolute inset-x-1.5 bottom-1.5 flex flex-col items-stretch gap-1">
                        <p className="truncate text-center text-[var(--fs-xs)] font-bold leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                          {game.name}
                        </p>
                        <Link
                          href={`/app/games/${game.id}`}
                          className="inline-flex w-full items-center justify-center rounded-full border border-fuchsia-300/55 bg-[linear-gradient(90deg,rgba(157,78,221,0.92),rgba(255,32,121,0.88))] px-2 text-[var(--fs-2xs)] font-semibold text-white shadow-[0_0_10px_rgba(255,45,167,0.45)] transition hover:brightness-110"
                          style={{ height: "var(--btn-h-sm)" }}
                        >
                          Open lobby
                        </Link>
                      </div>
                    </article>
                  );
                  })}
                </div>
              </div>
            </Panel>
          </div>
        </div>

        {/* RIGHT RAIL — Snaps (50%) + Reels (50%) */}
        <div className="suzi-col-stack">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <HomeSnapsPanel layout="dashboard" />
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <HomeReelsPanel />
          </div>
        </div>
      </div>
    </section>
  );
}
