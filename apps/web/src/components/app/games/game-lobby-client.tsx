"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { gameMeta, gameTypeToId } from "@/components/app/games/game-meta";
import { Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { explorePeople, getFriendsSummary, type FriendSummaryUser } from "@/lib/friends-client";
import {
  createGameLobby,
  inviteToGameLobby,
  joinGameLobby,
  listGameLobbies,
  startGameSession,
  type ApiGameLobby,
  type ApiGameType,
} from "@/lib/games-client";
import { getStoredAuthSession } from "@/lib/auth-client";
import { openGamesSocket, subscribeGameLobbyListChannel } from "@/lib/games-realtime";

export function GameLobbyClient({ gameId }: { gameId: string }) {
  const game = gameMeta.find((entry) => entry.id === gameId) ?? gameMeta[0];
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
    socket.on("connect", onConnect);
    socket.on("game:lobbies:update", onLobbiesUpdate);
    if (socket.connected) onConnect();
    return () => {
      socket.off("connect", onConnect);
      socket.off("game:lobbies:update", onLobbiesUpdate);
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
      await createGameLobby(auth.accessToken, {
        gameType: game.type as ApiGameType,
        title: `${game.name} Public Lobby`,
      });
      await refresh();
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
      await joinGameLobby(auth.accessToken, lobbyId, seatIndex);
      await refresh();
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
      const session = await startGameSession(auth.accessToken, lobbyId);
      window.location.href = `/app/games/${gameTypeToId(session.gameType)}/session/${session.id}`;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not start session.");
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
      await inviteToGameLobby(auth.accessToken, lobbyId, target);
      setInviteQuery("");
      setSelectedInviteUser(null);
      setInviteSuggestions([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invite failed.");
    } finally {
      setBusyLobbyId(null);
    }
  }

  return (
    <section className="suzi-app-frame-fill">
      <div className="suzi-app-frame-scroll suzi-scrollbar pr-1">
        <Panel className="p-6 sm:p-7">
          <SectionHeader
            eyebrow="Game Lobby"
            title={`${game.name} tables`}
            copy="Join an open seat, invite friends, then start a synchronized multiplayer session."
          />
          <div className="mt-4 flex items-center gap-3">
            <Link href="/app/games" className="suzi-secondary-btn px-4 py-2 text-sm">
              Back to games
            </Link>
            <button type="button" disabled={creating} className="suzi-primary-btn px-4 py-2 text-sm disabled:opacity-60" onClick={() => void onCreateLobby()}>
              {creating ? "Creating..." : "Create lobby"}
            </button>
          </div>
          {error ? <p className="mt-4 rounded-lg border border-pink-400/35 bg-pink-500/10 px-3 py-2 text-sm text-pink-100">{error}</p> : null}
        </Panel>

        <div className="mt-5 grid gap-4">
          {loading ? <p className="text-sm text-cyan-100/70">Loading lobbies...</p> : null}
          {!loading && rows.length === 0 ? (
            <Panel className="p-5">
              <p className="text-sm text-cyan-100/78">No active lobbies for this game yet. Create the first table.</p>
            </Panel>
          ) : null}
          {rows.map((lobby) => {
            const seatedMine = lobby.seats.find((seat) => seat.userId === me);
            const session = lobby.sessions[0];
            return (
              <Panel key={lobby.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{lobby.title}</h3>
                    <p className="mt-1 text-sm text-cyan-100/66">
                      {lobby.isPrivate ? "Private" : "Public"} • {lobby.seats.filter((seat) => seat.userId).length}/{lobby.maxSeats} seats occupied
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {session?.status === "ACTIVE" ? (
                      <Link href={`/app/games/${gameTypeToId(lobby.gameType)}/session/${session.id}`} className="suzi-primary-btn px-3 py-2 text-xs">
                        Open session
                      </Link>
                    ) : null}
                    {lobby.ownerId === me ? (
                      <button type="button" disabled={busyLobbyId === lobby.id} className="suzi-secondary-btn px-3 py-2 text-xs disabled:opacity-60" onClick={() => void onStart(lobby.id)}>
                        Start session
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {lobby.seats.map((seat) => (
                    <button
                      key={seat.id}
                      type="button"
                      disabled={Boolean(seat.userId) || busyLobbyId === lobby.id}
                      onClick={() => void onJoin(lobby.id, seat.seatIndex)}
                      className="rounded-xl border border-cyan-300/24 bg-[rgba(20,13,62,0.55)] px-3 py-2 text-left transition hover:border-cyan-300/45 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/60">Seat {seat.seatIndex + 1}</p>
                      <p className="mt-1 text-sm font-medium text-white">{seat.user?.displayName || seat.user?.username || "Open seat"}</p>
                      {seatedMine?.id === seat.id ? <p className="mt-0.5 text-xs text-emerald-100">You</p> : null}
                    </button>
                  ))}
                </div>
                {lobby.ownerId === me || Boolean(seatedMine) ? (
                  <div className="mt-4 flex flex-wrap items-start gap-2">
                    <div className="relative w-72 max-w-full">
                      <input
                        value={inviteQuery}
                        onChange={(e) => {
                          setInviteQuery(e.target.value);
                          setSelectedInviteUser(null);
                        }}
                        placeholder="Friends first — search username or name..."
                        className="suzi-input h-9 w-full px-3 text-sm"
                      />
                      {(inviteLoading || inviteSuggestions.length > 0) && !selectedInviteUser ? (
                        <div className="absolute left-0 right-0 top-[calc(100%+0.3rem)] z-30 max-h-56 overflow-y-auto rounded-lg border border-cyan-300/24 bg-[linear-gradient(160deg,rgba(28,16,84,0.96),rgba(18,12,58,0.95))] p-1 shadow-[0_10px_30px_rgba(7,9,25,0.5)]">
                          {inviteLoading ? (
                            <p className="px-2 py-2 text-xs text-cyan-100/72">Searching...</p>
                          ) : inviteSuggestions.length === 0 ? (
                            <p className="px-2 py-2 text-xs text-cyan-100/62">No users found.</p>
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
                                className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition hover:bg-cyan-300/12"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-white">
                                    {user.displayName?.trim() || user.username}
                                  </p>
                                  <p className="truncate text-xs text-cyan-100/68">@{user.username}</p>
                                </div>
                                <span className="shrink-0 text-[0.65rem] text-cyan-100/55">
                                  {user.country || "—"}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}
                      {selectedInviteUser ? (
                        <p className="mt-1 text-[0.72rem] text-emerald-100/88">
                          Selected: {selectedInviteUser.displayName?.trim() || selectedInviteUser.username}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      disabled={busyLobbyId === lobby.id || !selectedInviteUser}
                      onClick={() => void onInvite(lobby.id)}
                      className="suzi-secondary-btn px-3 py-2 text-xs disabled:opacity-60"
                    >
                      Send invite
                    </button>
                  </div>
                ) : null}
              </Panel>
            );
          })}
        </div>
      </div>
    </section>
  );
}
