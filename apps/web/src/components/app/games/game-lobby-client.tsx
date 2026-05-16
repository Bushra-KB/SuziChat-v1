"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { gameMeta, gameTypeToId } from "@/components/app/games/game-meta";
import { gameIconForId } from "@/lib/game-icons";
import { HomeFriendsPanel } from "@/components/app/home-friends-panel";
import { Panel } from "@/components/ui/suzi-primitives";
import { explorePeople, getFriendsSummary, type FriendSummaryUser } from "@/lib/friends-client";
import { MQ_HOME_COMPACT } from "@/lib/breakpoints";
import { useIsMobile } from "@/lib/use-is-mobile";
import {
  createGameLobby,
  deleteGameLobby,
  inviteToGameLobby,
  joinGameLobby,
  listGameLobbies,
  startGameSession,
  type ApiGameLobby,
  type ApiGameType,
} from "@/lib/games-client";
import { getStoredAuthSession } from "@/lib/auth-client";
import {
  openGamesSocket,
  postGameLobbyCreate,
  postGameLobbyDelete,
  postGameLobbyInvite,
  postGameLobbySeat,
  postGameLobbyStart,
  subscribeGameLobbyListChannel,
} from "@/lib/games-realtime";

export function GameLobbyClient({ gameId }: { gameId: string }) {
  const game = gameMeta.find((entry) => entry.id === gameId) ?? gameMeta[0];
  const gameArt = gameIconForId(game.id);
  const [rows, setRows] = useState<ApiGameLobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyLobbyId, setBusyLobbyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteSuggestions, setInviteSuggestions] = useState<FriendSummaryUser[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [selectedInviteUser, setSelectedInviteUser] = useState<FriendSummaryUser | null>(null);
  const [friendDirectory, setFriendDirectory] = useState<FriendSummaryUser[]>([]);
  const [openInviteLobbyId, setOpenInviteLobbyId] = useState<string | null>(null);
  // Friends rail is only shown at xl and above (1280px+). Skip mounting it
  // entirely below that breakpoint so we don't fetch friends data unused.
  const { isMobile: belowXl } = useIsMobile(MQ_HOME_COMPACT);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const all = await listGameLobbies(game.type);
      setRows(all);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load lobbies.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [game.type]);

  useEffect(() => {
    const auth = getStoredAuthSession();
    if (!auth?.accessToken) return;
    const socket = openGamesSocket(auth.accessToken);
    const onConnect = () => {
      subscribeGameLobbyListChannel(socket);
    };
    const onLobbiesUpdate = (payload: { gameType?: string }) => {
      if (payload?.gameType && payload.gameType !== game.type) return;
      void listGameLobbies(game.type)
        .then(setRows)
        .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load lobbies."));
    };
    const onLobbyDeleted = (payload: { lobbyId?: string }) => {
      if (!payload?.lobbyId) return;
      setRows((prev) => prev.filter((row) => row.id !== payload.lobbyId));
    };
    socket.on("connect", onConnect);
    socket.on("game:lobbies:update", onLobbiesUpdate);
    socket.on("game:lobby:deleted", onLobbyDeleted);
    if (socket.connected) onConnect();
    return () => {
      socket.off("connect", onConnect);
      socket.off("game:lobbies:update", onLobbiesUpdate);
      socket.off("game:lobby:deleted", onLobbyDeleted);
    };
  }, [game.type]);

  const me = useMemo(() => getStoredAuthSession()?.user.id ?? "", []);

  useEffect(() => {
    const auth = getStoredAuthSession();
    if (!auth?.accessToken) {
      setFriendDirectory([]);
      return;
    }
    void getFriendsSummary(auth.accessToken)
      .then((summary) => {
        setFriendDirectory(
          summary.friends.map((row) => ({
            id: row.id,
            email: row.email,
            username: row.username,
            displayName: row.displayName,
            country: row.country,
          })),
        );
      })
      .catch(() => setFriendDirectory([]));
  }, []);

  useEffect(() => {
    const auth = getStoredAuthSession();
    if (!auth?.accessToken) {
      setInviteSuggestions([]);
      setInviteLoading(false);
      return;
    }
    const q = inviteQuery.trim().toLowerCase();
    if (q.length < 2) {
      setInviteSuggestions([]);
      setInviteLoading(false);
      return;
    }
    let cancelled = false;
    setInviteLoading(true);
    const timer = window.setTimeout(() => {
      const needle = inviteQuery.trim().toLowerCase();
      const friendMatches = friendDirectory
        .filter((row) => row.id !== me)
        .filter((row) => {
          const label = `${row.username} ${row.displayName ?? ""}`.toLowerCase();
          return label.includes(needle);
        })
        .slice(0, 8);
      const seen = new Set(friendMatches.map((row) => row.id));
      void explorePeople(auth.accessToken, inviteQuery.trim(), 14)
        .then((rows) => {
          if (cancelled) return;
          const rest = rows.filter((row) => row.id !== me && !seen.has(row.id));
          setInviteSuggestions([...friendMatches, ...rest].slice(0, 12));
        })
        .catch(() => {
          if (!cancelled) {
            setInviteSuggestions(friendMatches);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setInviteLoading(false);
          }
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [inviteQuery, me, friendDirectory]);

  async function onCreateLobby() {
    const auth = getStoredAuthSession();
    if (!auth?.accessToken) {
      setError("Login required.");
      return;
    }
    setCreating(true);
    try {
      const payload = {
        gameType: game.type as ApiGameType,
        title: `${game.name} Public Lobby`,
      };
      const socket = openGamesSocket(auth.accessToken);
      const lobby = socket.connected
        ? await postGameLobbyCreate(socket, payload)
        : await createGameLobby(auth.accessToken, payload);
      setRows((prev) => [lobby, ...prev.filter((row) => row.id !== lobby.id)]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not create lobby.");
    } finally {
      setCreating(false);
    }
  }

  async function onJoin(lobbyId: string, seatIndex: number) {
    const auth = getStoredAuthSession();
    if (!auth?.accessToken) {
      setError("Login required.");
      return;
    }
    setBusyLobbyId(lobbyId);
    try {
      const socket = openGamesSocket(auth.accessToken);
      const lobby = socket.connected
        ? await postGameLobbySeat(socket, lobbyId, seatIndex)
        : await joinGameLobby(auth.accessToken, lobbyId, seatIndex);
      setRows((prev) => prev.map((row) => (row.id === lobby.id ? lobby : row)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not join seat.");
    } finally {
      setBusyLobbyId(null);
    }
  }

  async function onStart(lobbyId: string) {
    const auth = getStoredAuthSession();
    if (!auth?.accessToken) {
      setError("Login required.");
      return;
    }
    setBusyLobbyId(lobbyId);
    try {
      const socket = openGamesSocket(auth.accessToken);
      const session = socket.connected
        ? await postGameLobbyStart(socket, lobbyId)
        : await startGameSession(auth.accessToken, lobbyId);
      window.location.href = `/app/games/${gameTypeToId(session.gameType)}/session/${session.id}`;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not start session.");
    } finally {
      setBusyLobbyId(null);
    }
  }

  async function onDelete(lobbyId: string) {
    const auth = getStoredAuthSession();
    if (!auth?.accessToken) {
      setError("Login required.");
      return;
    }
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm("Delete this lobby? This cannot be undone.");
    if (!confirmed) return;
    setBusyLobbyId(lobbyId);
    setError("");
    try {
      const socket = openGamesSocket(auth.accessToken);
      if (socket.connected) {
        await postGameLobbyDelete(socket, lobbyId);
      } else {
        await deleteGameLobby(auth.accessToken, lobbyId);
      }
      setRows((prev) => prev.filter((row) => row.id !== lobbyId));
      setOpenInviteLobbyId((prev) => (prev === lobbyId ? null : prev));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not delete lobby.");
    } finally {
      setBusyLobbyId(null);
    }
  }

  async function onInvite(lobbyId: string) {
    const auth = getStoredAuthSession();
    if (!auth?.accessToken) {
      setError("Login required.");
      return;
    }
    const target = selectedInviteUser?.id;
    if (!target) {
      setError("Select a user from the dropdown to send invite.");
      return;
    }
    setBusyLobbyId(lobbyId);
    try {
      const socket = openGamesSocket(auth.accessToken);
      if (socket.connected) {
        await postGameLobbyInvite(socket, lobbyId, target);
      } else {
        await inviteToGameLobby(auth.accessToken, lobbyId, target);
      }
      setInviteQuery("");
      setSelectedInviteUser(null);
      setInviteSuggestions([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invite failed.");
    } finally {
      setBusyLobbyId(null);
    }
  }

  const totalActivePlayers = rows.reduce((acc, lobby) => acc + lobby.seats.filter((s) => s.userId).length, 0);
  const totalOpenTables = rows.filter((lobby) => lobby.seats.some((s) => !s.userId)).length;

  function seatName(seat: ApiGameLobby["seats"][number] | undefined) {
    return seat?.user?.displayName?.trim() || seat?.user?.username || "(empty)";
  }

  return (
    <section className="suzi-app-frame-fill suzi-lobby-page">
      <div className="suzi-lobby-grid">
        {/* LEFT RAIL — Friends (full height, xl+ only). Below xl we skip
          * mounting the panel entirely so it doesn't fetch friend data. */}
        {!belowXl ? (
          <div className="suzi-col-stack hidden xl:flex">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <HomeFriendsPanel />
            </div>
          </div>
        ) : null}

        {/* MAIN — Lobby tables */}
        <Panel className="suzi-lobby-main flex h-full min-h-0 flex-col overflow-hidden p-[var(--panel-pad)]">
          <div className="suzi-lobby-header flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Link
                href="/app"
                className="suzi-secondary-btn shrink-0 px-2.5 py-1 text-[var(--fs-2xs)]"
              >
                ← Back
              </Link>
              <h1 className="min-w-0 flex-1 truncate text-[var(--fs-xl)] font-bold leading-tight tracking-tight text-white sm:flex-none">
                {game.name} tables
              </h1>
              <span className="shrink-0 rounded-full border border-cyan-300/22 bg-[rgba(20,16,72,0.55)] px-2 py-0.5 text-[var(--fs-2xs)] text-cyan-100/82">
                {totalActivePlayers} active · {totalOpenTables} open
              </span>
            </div>
            <button
              type="button"
              disabled={creating}
              className="suzi-primary-btn suzi-lobby-create shrink-0 px-3 py-1 text-[var(--fs-2xs)] disabled:opacity-60"
              onClick={() => void onCreateLobby()}
            >
              {creating ? "Creating..." : "+ Create lobby"}
            </button>
          </div>
          {error ? (
            <p className="mt-2 shrink-0 rounded-lg border border-pink-400/35 bg-pink-500/10 px-3 py-1.5 text-[var(--fs-2xs)] text-pink-100">
              {error}
            </p>
          ) : null}

          <div className="suzi-thin-scroll mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            {loading ? <p className="text-[var(--fs-sm)] text-cyan-100/70">Loading lobbies...</p> : null}
            {!loading && rows.length === 0 ? (
              <p className="rounded-[var(--panel-radius)] border border-cyan-300/20 bg-[rgba(20,16,72,0.4)] p-3 text-[var(--fs-sm)] text-cyan-100/78">
                No active lobbies for this game yet. Create the first table.
              </p>
            ) : null}
            <div className="grid min-h-0 grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {rows.map((lobby, index) => {
              const seatedMine = lobby.seats.find((seat) => seat.userId === me);
              const session = lobby.sessions[0];
              const occupiedSeats = lobby.seats.filter((seat) => seat.userId);
              const openSeat = lobby.seats.find((seat) => !seat.userId);
              const firstSeat = lobby.seats[0];
              const secondSeat = lobby.seats[1];
              const status =
                session?.status === "ACTIVE"
                  ? "Playing"
                  : occupiedSeats.length === 0
                    ? "Empty"
                    : "Waiting";
              const statusClass =
                session?.status === "ACTIVE"
                  ? "text-emerald-100"
                  : occupiedSeats.length === 0
                    ? "text-fuchsia-100/76"
                    : "text-cyan-100";
              const canManage = lobby.ownerId === me || Boolean(seatedMine);
              const inviteOpen = openInviteLobbyId === lobby.id;

              return (
                <div
                  key={lobby.id}
                  className="suzi-lobby-card relative flex flex-col overflow-hidden rounded-[var(--panel-radius)] border border-fuchsia-300/28 bg-[radial-gradient(circle_at_50%_8%,rgba(255,32,121,0.18),transparent_42%),linear-gradient(180deg,rgba(91,26,151,0.5),rgba(44,12,114,0.82))] p-2 shadow-[0_0_18px_rgba(157,78,221,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)] opacity-40" />

                  <div data-section="header" className="relative z-10 flex items-center justify-between gap-2">
                    <h3 className="text-[var(--fs-sm)] font-bold tracking-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
                      <span className="text-fuchsia-200/80">←</span> Table {index + 1} <span className="text-fuchsia-200/80">→</span>
                    </h3>
                    <span className="shrink-0 rounded-full border border-cyan-300/22 bg-black/22 px-1.5 py-0.5 text-[var(--fs-2xs)] text-cyan-100/72">
                      {lobby.isPrivate ? "Private" : "Public"} · {occupiedSeats.length}/{lobby.maxSeats}
                    </span>
                  </div>

                  <div data-section="image" className="relative z-10 mt-1 flex aspect-[5/3] items-center justify-center overflow-hidden">
                    <Image
                      src={gameArt}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 45vw, 220px"
                      className="object-cover drop-shadow-[0_8px_18px_rgba(8,4,32,0.55)]"
                    />
                  </div>

                  <div data-section="meta" className="relative z-10 mt-1.5 text-center">
                    <p className="truncate text-[var(--fs-xs)] font-bold text-white">
                      {seatName(firstSeat)} <span className="text-cyan-100/58">vs</span> {seatName(secondSeat)}
                    </p>
                    <p className={`mt-1 inline-flex items-center justify-center gap-1 rounded-full bg-black/24 px-2 py-0.5 text-[var(--fs-2xs)] font-semibold ${statusClass}`}>
                      <span aria-hidden="true">{session?.status === "ACTIVE" ? "🏆" : occupiedSeats.length === 0 ? "🪑" : "👀"}</span>
                      {status}
                    </p>
                  </div>

                  <div data-section="actions" className="relative z-10 mt-2 flex shrink-0 items-center justify-center gap-1.5">
                    {session?.status === "ACTIVE" ? (
                      <Link
                        href={`/app/games/${gameTypeToId(lobby.gameType)}/session/${session.id}`}
                        className="suzi-primary-btn flex-1 px-2 py-1 text-center text-[var(--fs-2xs)]"
                      >
                        Open
                      </Link>
                    ) : !seatedMine && openSeat ? (
                      <button
                        type="button"
                        disabled={busyLobbyId === lobby.id}
                        className="suzi-primary-btn flex-1 px-2 py-1 text-[var(--fs-2xs)] disabled:opacity-60"
                        onClick={() => void onJoin(lobby.id, openSeat.seatIndex)}
                      >
                        Join
                      </button>
                    ) : lobby.ownerId === me ? (
                      <button
                        type="button"
                        disabled={busyLobbyId === lobby.id}
                        className="suzi-primary-btn flex-1 px-2 py-1 text-[var(--fs-2xs)] disabled:opacity-60"
                        onClick={() => void onStart(lobby.id)}
                      >
                        Start
                      </button>
                    ) : (
                      <span className="flex-1 rounded-full border border-emerald-300/26 bg-emerald-400/14 px-2 py-1 text-center text-[var(--fs-2xs)] font-semibold text-emerald-100">
                        Seated
                      </span>
                    )}

                    {canManage ? (
                      <button
                        type="button"
                        aria-label="Invite friend"
                        title="Invite friend"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-[rgba(20,13,62,0.66)] text-cyan-100 transition hover:border-cyan-300/55 hover:text-white"
                        onClick={() => {
                          setOpenInviteLobbyId((prev) => (prev === lobby.id ? null : lobby.id));
                          setInviteQuery("");
                          setSelectedInviteUser(null);
                          setInviteSuggestions([]);
                        }}
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5H7a3 3 0 0 0-3 3V20" />
                          <circle cx="9" cy="8" r="3" />
                          <path d="M19 8v6M16 11h6" />
                        </svg>
                      </button>
                    ) : null}

                    {lobby.ownerId === me ? (
                      <button
                        type="button"
                        aria-label="Delete lobby"
                        title="Delete lobby"
                        disabled={busyLobbyId === lobby.id}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-pink-300/35 bg-[rgba(45,12,42,0.62)] text-pink-100 transition hover:border-pink-300/65 hover:text-white disabled:opacity-60"
                        onClick={() => void onDelete(lobby.id)}
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 7h16" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
                          <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    ) : null}
                  </div>

                  {canManage && inviteOpen ? (
                    <div data-section="invite" className="relative z-10 mt-2 rounded-[0.7rem] border border-cyan-300/22 bg-[rgba(20,13,62,0.7)] p-1.5">
                      <div className="relative">
                        <input
                          value={inviteQuery}
                          onChange={(e) => {
                            setInviteQuery(e.target.value);
                            setSelectedInviteUser(null);
                          }}
                          placeholder="Invite friend..."
                          className="suzi-input h-7 w-full px-2 text-[var(--fs-2xs)]"
                        />
                        {(inviteLoading || inviteSuggestions.length > 0) && !selectedInviteUser ? (
                          <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-30 max-h-44 overflow-y-auto rounded-lg border border-cyan-300/24 bg-[linear-gradient(160deg,rgba(28,16,84,0.96),rgba(18,12,58,0.95))] p-1 shadow-[0_10px_30px_rgba(7,9,25,0.5)]">
                            {inviteLoading ? (
                              <p className="px-2 py-1.5 text-[var(--fs-2xs)] text-cyan-100/72">Searching...</p>
                            ) : inviteSuggestions.length === 0 ? (
                              <p className="px-2 py-1.5 text-[var(--fs-2xs)] text-cyan-100/62">No users found.</p>
                            ) : (
                              inviteSuggestions.map((user) => (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedInviteUser(user);
                                    setInviteQuery(user.displayName?.trim() || user.username);
                                    setInviteSuggestions([]);
                                  }}
                                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-cyan-300/12"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-[var(--fs-2xs)] font-medium text-white">
                                      {user.displayName?.trim() || user.username}
                                    </p>
                                    <p className="truncate text-[var(--fs-2xs)] text-cyan-100/68">@{user.username}</p>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          className="suzi-secondary-btn px-2 py-1 text-[var(--fs-2xs)]"
                          onClick={() => {
                            setOpenInviteLobbyId(null);
                            setInviteQuery("");
                            setSelectedInviteUser(null);
                            setInviteSuggestions([]);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={busyLobbyId === lobby.id || !selectedInviteUser}
                          onClick={async () => {
                            await onInvite(lobby.id);
                            setOpenInviteLobbyId(null);
                          }}
                          className="suzi-primary-btn ml-auto px-2 py-1 text-[var(--fs-2xs)] disabled:opacity-60"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
            </div>
          </div>
        </Panel>
      </div>
    </section>
  );
}
