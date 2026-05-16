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
import {
  homeBtnPrimary,
  homeGameCard,
  homePanelHeader,
  homePanelIcon,
  homeStatPill,
  homeStatPillLive,
  listActionPrimary,
  listL1,
  listL3,
  listMeta,
  listTitle,
  panelMeta,
  panelTitle,
} from "@/components/app/home-typography";
import { Panel, cx } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import { listGameLobbies, type ApiGameLobby } from "@/lib/games-client";
import { openGamesSocket, subscribeGameLobbyListChannel } from "@/lib/games-realtime";
import { MQ_HOME_COMPACT } from "@/lib/breakpoints";
import { useIsMobile } from "@/lib/use-is-mobile";
import { games } from "@/lib/v1-mock-data";

/*
 * Home dashboard — at >=1280px (xl): 6-panel SPA grid in 100dvh, no page scroll.
 * Below 1280px: stacked sections in `.suzi-home-mobile-stack` (see MQ_HOME_COMPACT).
 *
 *   ┌──────────────┬──────────────────────────┬────────────────┐
 *   │  Friends     │  Suzi Chat Rooms         │  Suzi Snaps    │
 *   ├──────────────┼──────────────────────────┼────────────────┤
 *   │  Reels       │  Suzi Games              │  Suzi Dating   │
 *   └──────────────┴──────────────────────────┴────────────────┘
 */
export default function AppHomePage() {
  const [lobbies, setLobbies] = useState<ApiGameLobby[]>([]);
  const [mobileGamesOpen, setMobileGamesOpen] = useState(false);
  const { isMobile: isCompactHome } = useIsMobile(MQ_HOME_COMPACT);

  // Lock body scroll while the games bottom-sheet is open on mobile.
  useEffect(() => {
    if (!mobileGamesOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileGamesOpen]);

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

  if (isCompactHome) {
    const totalPlaying = Array.from(playingByGameType.values()).reduce(
      (acc, value) => acc + value,
      0,
    );

    const mobileGamesCard = (
      <button
        type="button"
        onClick={() => setMobileGamesOpen(true)}
        aria-label="Browse Suzi Games lobbies"
        className="suzi-home-mobile-games-card group relative flex h-full w-full flex-col overflow-hidden rounded-[var(--panel-radius)] border p-[var(--panel-pad)] text-left transition active:scale-[0.985]"
      >
        <div className="flex shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-[0.7rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-fuchsia-100/92 shadow-[0_0_12px_rgba(157,78,221,0.28)]">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="8" width="16" height="9" rx="4.5" />
                <path d="M8 12h3M9.5 10.5v3" />
                <circle cx="15.5" cy="11.5" r=".8" fill="currentColor" stroke="none" />
                <circle cx="17.5" cy="13.5" r=".8" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <h2 className={panelTitle}>Suzi Games</h2>
          </div>
          <span className={cx(homeStatPillLive, listL3, "px-2 py-0.5 font-semibold text-fuchsia-100/92")}>
            {totalPlaying} live
          </span>
        </div>

        <div className="mt-3 grid min-h-0 flex-1 grid-cols-2 gap-2">
          {games.map((game) => {
            const meta = gameMeta.find((entry) => entry.id === game.id);
            const playing = meta ? (playingByGameType.get(meta.type) ?? 0) : 0;
            return (
              <div
                key={game.id}
                className={cx(homeGameCard, "relative min-h-0 overflow-hidden rounded-[0.75rem] border")}
              >
                <Image
                  src={game.icon}
                  alt={game.name}
                  fill
                  sizes="46vw"
                  className="object-cover"
                />
                <div className="suzi-home-game-scrim absolute inset-0" />
                <span className={cx(homeStatPill, listL3, "absolute left-1.5 top-1.5 px-1.5 py-0.5 font-medium text-white/90")}>
                  {playing} playing
                </span>
                <p className={cx(listL1, "absolute inset-x-1.5 bottom-1.5 truncate text-center font-bold leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]")}>
                  {game.name}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-2.5 flex shrink-0 items-center justify-between gap-2">
          <span className={cx(listMeta, "text-cyan-100/72")}>
            Tap to browse all tables
          </span>
          <span className={cx(homeBtnPrimary, listActionPrimary, "gap-1 px-2.5 py-1")}>
            Open
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </button>
    );

    return (
      <>
        <section className="suzi-app-frame-fill">
          <div className="suzi-home-mobile-stack flex flex-col">
            <div className="h-[44rem]">
              <HomeChatRoomsPanel variant="dashboard" />
            </div>
            <div className="h-[18rem]">{mobileGamesCard}</div>
            <div id="friends" className="h-[44rem] scroll-mt-20">
              <HomeFriendsPanel />
            </div>
            <div className="h-[44rem]">
              <HomeSnapsPanel layout="dashboard" />
            </div>
            <div className="h-[20rem]">
              <HomeReelsPanel />
            </div>
            <div className="h-[7rem]">
              <HomeDatingPanel />
            </div>
          </div>
        </section>

        {/* Bottom sheet — full game list on mobile only. */}
        {mobileGamesOpen ? (
          <>
            <button
              type="button"
              aria-label="Close games"
              className="suzi-m-drawer-backdrop"
              onClick={() => setMobileGamesOpen(false)}
            />
            <div
              className="suzi-m-sheet"
              data-open="true"
              role="dialog"
              aria-modal="true"
              aria-label="Suzi Games"
            >
              <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-[0.7rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-fuchsia-100/92 shadow-[0_0_12px_rgba(157,78,221,0.28)]">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="8" width="16" height="9" rx="4.5" />
                      <path d="M8 12h3M9.5 10.5v3" />
                      <circle cx="15.5" cy="11.5" r=".8" fill="currentColor" stroke="none" />
                      <circle cx="17.5" cy="13.5" r=".8" fill="currentColor" stroke="none" />
                    </svg>
                  </span>
                  <h3 className={panelTitle}>Suzi Games</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileGamesOpen(false)}
                  aria-label="Close"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/24 bg-[rgba(20,12,72,0.6)] text-cyan-50/90"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
              <div className="max-h-[68vh] overflow-y-auto px-3 pb-2">
                <ul className="flex flex-col gap-2">
                  {games.map((game) => {
                    const meta = gameMeta.find((entry) => entry.id === game.id);
                    const playing = meta ? (playingByGameType.get(meta.type) ?? 0) : 0;
                    return (
                      <li key={game.id}>
                        <Link
                          href={`/app/games/${game.id}`}
                          onClick={() => setMobileGamesOpen(false)}
                          className="suzi-tap-row group flex items-center gap-3 overflow-hidden rounded-[0.95rem] border border-cyan-300/22 bg-[linear-gradient(165deg,rgba(42,26,108,0.55),rgba(18,11,46,0.55))] p-2 transition active:scale-[0.99]"
                        >
                          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[0.75rem] border border-cyan-300/22">
                            <Image src={game.icon} alt={game.name} fill sizes="56px" className="object-cover" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={cx(listTitle, "truncate")}>
                              {game.name}
                            </p>
                            <p className={cx(listMeta, "mt-0.5 inline-flex items-center gap-1.5 text-cyan-100/76")}>
                              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(92,255,190,0.85)]" />
                              {playing} playing now
                            </p>
                          </div>
                          <span className={cx(listActionPrimary, "gap-1 rounded-full border border-fuchsia-300/55 bg-[linear-gradient(90deg,rgba(157,78,221,0.92),rgba(255,32,121,0.88))] px-3 py-1.5 text-white shadow-[0_0_10px_rgba(255,45,167,0.45)]")}>
                            Open
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </>
        ) : null}
      </>
    );
  }

  return (
    <section className="suzi-app-frame-fill">
      <div className="suzi-home-grid">
        <div className="suzi-home-area suzi-home-area-friends">
          <HomeFriendsPanel />
        </div>

        <div className="suzi-home-area suzi-home-area-reels">
          <HomeReelsPanel />
        </div>

        <div className="suzi-home-area suzi-home-area-dating">
          <HomeDatingPanel />
        </div>

        <div className="suzi-home-area suzi-home-area-chat">
          <HomeChatRoomsPanel variant="dashboard" />
        </div>

        <div className="suzi-home-area suzi-home-area-games">
            <Panel className="suzi-panel--home flex h-full min-h-0 flex-col overflow-hidden p-[var(--panel-pad)]">
              <div className={cx(homePanelHeader, "flex shrink-0 items-center justify-between gap-3")}>
                <div className="flex items-center gap-2.5">
                  <span className={homePanelIcon}>
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
                  <h2 className={panelTitle}>Suzi Games</h2>
                </div>

                <span className={cx(panelMeta, "shrink-0 whitespace-nowrap font-medium")}>
                  Live lobbies
                </span>
              </div>

              <div className="mt-2.5 min-h-0 flex-1">
                <div className="suzi-home-games-grid grid h-full min-h-0 grid-cols-5 gap-1.5">
                  {games.map((game) => {
                    const meta = gameMeta.find((entry) => entry.id === game.id);
                    const playing = meta ? (playingByGameType.get(meta.type) ?? 0) : 0;
                    return (
                    <article
                      key={game.id}
                      className={cx(homeGameCard, "group relative h-full min-h-0 min-w-0 overflow-hidden rounded-[0.75rem] border")}
                    >
                      <Image
                        src={game.icon}
                        alt={game.name}
                        fill
                        sizes="(min-width: 1280px) 11vw, 32vw"
                        className="object-cover transition duration-200 group-hover:scale-[1.04]"
                      />

                      <div className="suzi-home-game-scrim absolute inset-0" />

                      <span className={cx(homeStatPill, listL3, "absolute left-1.5 top-1.5 px-1.5 py-0.5 font-medium text-white/92")}>
                        {playing} playing
                      </span>

                      <div className="absolute inset-x-1 bottom-1 flex min-w-0 flex-col items-stretch gap-0.5">
                        <p className={cx(listL1, "truncate text-center font-bold leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]")}>
                          {game.name}
                        </p>
                        <Link
                          href={`/app/games/${game.id}`}
                          className={cx(homeBtnPrimary, listActionPrimary, "w-full min-w-0 justify-center rounded-full px-1.5")}
                          style={{ height: "var(--btn-h-sm)" }}
                        >
                          <span className="truncate">Open lobby</span>
                        </Link>
                      </div>
                    </article>
                  );
                  })}
                </div>
              </div>
            </Panel>
        </div>

        <div className="suzi-home-area suzi-home-area-snaps">
          <HomeSnapsPanel layout="dashboard" />
        </div>
      </div>
    </section>
  );
}
