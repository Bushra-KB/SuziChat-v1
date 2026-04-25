"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, cx } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import {
  acceptFriendRequest,
  blockPerson,
  cancelOutgoingFriendRequest,
  declineFriendRequest,
  explorePeople,
  getFriendsSummary,
  getSuggestedPeople,
  listBlockedPeople,
  sendFriendRequest,
  unblockPerson,
  unfriend,
  type BlockedUserRow,
  type FriendSummaryUser,
  type FriendsSummary,
} from "@/lib/friends-client";
import { getRealtimeSocket } from "@/lib/realtime-client";

const defaultAvatar = "/ppic/ppic1.jpeg";
type FriendsTab = "friends" | "connect" | "explore" | "blocked";

function displayName(u: FriendSummaryUser) {
  return u.displayName?.trim() || u.username;
}

function getTopTabClasses(active: boolean) {
  return cx(
    "relative inline-flex items-center rounded-[0.8rem] px-3 py-2 text-sm font-semibold transition",
    active
      ? "bg-[linear-gradient(180deg,rgba(20,74,141,0.6),rgba(31,21,92,0.54))] text-white shadow-[0_0_0_1px_rgba(122,204,255,0.3),0_0_16px_rgba(255,32,121,0.28)]"
      : "text-cyan-100/78 hover:bg-cyan-400/10 hover:text-white",
  );
}

function TabGlowUnderline({ active }: { active: boolean }) {
  return (
    <span
      className={cx(
        "pointer-events-none absolute inset-x-1 -bottom-[3px] h-[3px] rounded-full transition-all duration-200",
        active
          ? "bg-[linear-gradient(90deg,rgba(255,32,121,0.95),rgba(0,229,255,0.92))] shadow-[0_0_10px_rgba(255,32,121,0.75),0_0_16px_rgba(0,229,255,0.45)] opacity-100"
          : "opacity-0",
      )}
      aria-hidden="true"
    />
  );
}

function FriendRow({
  user,
  isOnline = false,
  controls,
}: {
  user: FriendSummaryUser;
  isOnline?: boolean;
  controls?: React.ReactNode;
}) {
  return (
    <article className="rounded-[0.95rem] border border-cyan-300/18 bg-[linear-gradient(160deg,rgba(30,26,101,0.72),rgba(21,17,83,0.6))] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex items-center gap-3">
        <img
          src={defaultAvatar}
          alt={displayName(user)}
          className="h-11 w-11 rounded-full border border-cyan-200/26 object-cover"
        />
        <span
          className={cx(
            "ml-[-1.2rem] mt-6 inline-flex h-2.5 w-2.5 rounded-full border border-[rgba(7,10,28,0.85)]",
            isOnline ? "bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.82)]" : "bg-slate-500/70",
          )}
          title={isOnline ? "Online" : "Offline"}
          aria-label={isOnline ? "Online" : "Offline"}
        />
        <div className="min-w-0 flex-1 leading-tight">
          <Link
            href={`/app/profile/${encodeURIComponent(user.username)}`}
            className="block truncate text-[1.02rem] font-semibold text-white transition hover:text-cyan-100"
          >
            {displayName(user)}
          </Link>
          <p className="mt-0.5 truncate text-sm text-cyan-100/66">@{user.username}</p>
        </div>
        {controls}
      </div>
    </article>
  );
}

export function FriendsPageClient() {
  const [summary, setSummary] = useState<FriendsSummary | null>(null);
  const [suggested, setSuggested] = useState<FriendSummaryUser[]>([]);
  const [exploreRows, setExploreRows] = useState<FriendSummaryUser[]>([]);
  const [blockedRows, setBlockedRows] = useState<BlockedUserRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [inviteTarget, setInviteTarget] = useState("");
  const [friendFilter, setFriendFilter] = useState("");
  const [exploreQuery, setExploreQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<FriendsTab>("friends");
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const s = getStoredAuthSession();
    if (!s) {
      setError("Not signed in.");
      return;
    }
    setError("");
    const [data, suggestions, blocked] = await Promise.all([
      getFriendsSummary(s.accessToken),
      getSuggestedPeople(s.accessToken, 12),
      listBlockedPeople(s.accessToken),
    ]);
    setSummary(data);
    setSuggested(suggestions);
    setBlockedRows(blocked);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void refresh()
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load friends.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    const s = getStoredAuthSession();
    if (!s) {
      return;
    }
    const socket = getRealtimeSocket(s.accessToken);
    const onFriendsUpdate = () => {
      void refresh().catch(() => {});
    };
    socket.on("friends:update", onFriendsUpdate);
    return () => {
      socket.off("friends:update", onFriendsUpdate);
    };
  }, [refresh]);

  useEffect(() => {
    const s = getStoredAuthSession();
    if (!s) {
      return;
    }
    const socket = getRealtimeSocket(s.accessToken);
    const watchedIds = new Set<string>([
      ...(summary?.friends.map((f) => f.id) ?? []),
      ...(summary?.incomingRequests.map((r) => r.user.id) ?? []),
      ...(summary?.outgoingRequests.map((r) => r.user.id) ?? []),
    ]);
    const ids = [...watchedIds];
    if (ids.length === 0) {
      setOnlineIds(new Set());
      return;
    }
    socket.emit("presence:watch", { userIds: ids }, (ack?: { ok?: boolean; onlineIds?: string[] }) => {
      if (!ack?.ok) {
        return;
      }
      setOnlineIds(new Set(ack.onlineIds ?? []));
    });
    const onPresenceUpdate = (payload: { userId?: string; online?: boolean }) => {
      if (!payload?.userId) {
        return;
      }
      setOnlineIds((prev) => {
        const next = new Set(prev);
        if (payload.online) {
          next.add(payload.userId as string);
        } else {
          next.delete(payload.userId as string);
        }
        return next;
      });
    };
    socket.on("presence:update", onPresenceUpdate);
    return () => {
      socket.off("presence:update", onPresenceUpdate);
    };
  }, [summary]);

  async function handleInviteByIdentifier(e: React.FormEvent) {
    e.preventDefault();
    const s = getStoredAuthSession();
    if (!s || !inviteTarget.trim()) {
      return;
    }
    setBusy(true);
    try {
      await sendFriendRequest(s.accessToken, inviteTarget.trim());
      setInviteTarget("");
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runExploreSearch() {
    const s = getStoredAuthSession();
    if (!s) {
      return;
    }
    setBusy(true);
    try {
      const rows = await explorePeople(s.accessToken, exploreQuery.trim(), 30);
      setExploreRows(rows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not search users.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (activeTab !== "explore") {
      return;
    }
    void runExploreSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const filteredFriends = useMemo(() => {
    const rows = summary?.friends ?? [];
    const q = friendFilter.trim().toLowerCase();
    if (!q) {
      return rows;
    }
    return rows.filter((f) =>
      `${displayName(f)} ${f.username} ${f.email} ${f.country ?? ""}`.toLowerCase().includes(q),
    );
  }, [summary, friendFilter]);

  const connectCount =
    (summary?.incomingRequests.length ?? 0) + (summary?.outgoingRequests.length ?? 0);

  function ActionButton({
    children,
    onClick,
    tone = "default",
    disabled = false,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    tone?: "default" | "primary" | "danger";
    disabled?: boolean;
  }) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cx(
          "inline-flex items-center justify-center rounded-full border px-2.5 py-1.5 text-[11px] font-semibold leading-none transition disabled:cursor-not-allowed disabled:opacity-60",
          tone === "primary"
            ? "border-emerald-300/38 bg-emerald-400/22 text-emerald-50 hover:bg-emerald-400/30"
            : tone === "danger"
              ? "border-fuchsia-300/30 bg-fuchsia-500/20 text-pink-100 hover:bg-fuchsia-500/30"
              : "border-cyan-300/20 bg-cyan-400/12 text-cyan-50 hover:bg-cyan-400/20",
        )}
      >
        {children}
      </button>
    );
  }

  return (
    <section>
      <Panel className="flex h-[calc(100vh-9.5rem)] min-h-[42rem] flex-col overflow-hidden p-0">
        <div className="border-b border-cyan-300/18 bg-[linear-gradient(180deg,rgba(36,70,146,0.62),rgba(25,45,112,0.54))] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white">Friends &amp; Network</h2>
              <p className="mt-1 text-sm text-cyan-100/78">
                Manage your friends, requests, and discovery in one live, unified network hub.
              </p>
            </div>
            <form onSubmit={handleInviteByIdentifier} className="flex w-full max-w-[28rem] items-center gap-2">
              <input
                className="h-10 min-w-0 flex-1 rounded-[0.75rem] border border-cyan-300/26 bg-[rgba(30,24,96,0.62)] px-3 text-sm text-white placeholder:text-cyan-100/52 focus:border-cyan-200/42 focus:outline-none"
                value={inviteTarget}
                onChange={(ev) => setInviteTarget(ev.target.value)}
                placeholder="Add by username or email"
                disabled={busy}
              />
              <button
                type="submit"
                disabled={busy || !inviteTarget.trim()}
                className="h-10 rounded-[0.75rem] border border-fuchsia-300/35 bg-[linear-gradient(90deg,rgba(157,78,221,0.95),rgba(255,32,121,0.86))] px-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                Add
              </button>
            </form>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-cyan-300/18 pt-2.5">
            <button type="button" onClick={() => setActiveTab("friends")} className={getTopTabClasses(activeTab === "friends")}>
              All Friends ({summary?.friends.length ?? 0})
              <TabGlowUnderline active={activeTab === "friends"} />
            </button>
            <button type="button" onClick={() => setActiveTab("connect")} className={getTopTabClasses(activeTab === "connect")}>
              Connect ({connectCount})
              {connectCount > 0 ? (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-fuchsia-500 px-1 text-[10px] font-bold text-white">
                  {connectCount}
                </span>
              ) : null}
              <TabGlowUnderline active={activeTab === "connect"} />
            </button>
            <button type="button" onClick={() => setActiveTab("explore")} className={getTopTabClasses(activeTab === "explore")}>
              Search &amp; Explore
              <TabGlowUnderline active={activeTab === "explore"} />
            </button>
            <button type="button" onClick={() => setActiveTab("blocked")} className={getTopTabClasses(activeTab === "blocked")}>
              Blocked People
              <TabGlowUnderline active={activeTab === "blocked"} />
            </button>
          </div>
        </div>

        {error ? (
          <div className="border-b border-cyan-300/12 bg-pink-500/10 px-4 py-2 text-sm text-pink-100 sm:px-5">
            {error}
          </div>
        ) : null}

        <div className="suzi-scrollbar min-h-0 flex-1 overflow-y-auto">
          {activeTab === "friends" ? (
            <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="rounded-[1rem] border border-cyan-300/14 bg-[linear-gradient(180deg,rgba(35,20,112,0.55),rgba(24,14,82,0.6))] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/72">All friends</p>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-400/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-50">
                  {summary?.friends.length ?? 0} total
                </span>
              </div>
              <input
                className="mt-3 h-10 w-full rounded-[0.72rem] border border-cyan-300/22 bg-[rgba(22,14,72,0.68)] px-3 text-sm text-white placeholder:text-cyan-100/46 focus:border-cyan-200/46 focus:outline-none"
                placeholder="Search your friends..."
                value={friendFilter}
                onChange={(event) => setFriendFilter(event.target.value)}
              />
              <div className="suzi-scrollbar mt-3 max-h-[31rem] space-y-2 overflow-y-auto pr-0.5">
                {loading ? (
                  <p className="text-sm text-cyan-100/70">Loading friends...</p>
                ) : filteredFriends.length === 0 ? (
                  <p className="text-sm text-cyan-100/70">No friends match this search.</p>
                ) : (
                  filteredFriends.map((friend) => (
                    <FriendRow
                      key={friend.friendshipId}
                      user={friend}
                      isOnline={onlineIds.has(friend.id)}
                      controls={
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/app/messages?with=${encodeURIComponent(friend.id)}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[0.6rem] border border-cyan-300/20 bg-cyan-400/12 text-cyan-100 hover:bg-cyan-400/22"
                            aria-label={`Message ${displayName(friend)}`}
                          >
                            ✉
                          </Link>
                          <Link
                            href={`/app/profile/${encodeURIComponent(friend.username)}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[0.6rem] border border-cyan-300/20 bg-cyan-400/12 text-cyan-100 hover:bg-cyan-400/22"
                            aria-label={`Profile ${displayName(friend)}`}
                          >
                            ⌾
                          </Link>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[0.6rem] border border-fuchsia-300/24 bg-fuchsia-500/16 text-pink-100 hover:bg-fuchsia-500/28"
                            aria-label={`Unfriend ${displayName(friend)}`}
                            onClick={() =>
                              void (async () => {
                                const s = getStoredAuthSession();
                                if (!s) return;
                                await unfriend(s.accessToken, friend.id);
                                await refresh();
                              })()
                            }
                          >
                            ⋯
                          </button>
                        </div>
                      }
                    />
                  ))
                )}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[1rem] border border-cyan-300/14 bg-[linear-gradient(180deg,rgba(35,20,112,0.55),rgba(24,14,82,0.6))] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/72">Incoming Requests</p>
                <div className="suzi-scrollbar mt-3 max-h-[13rem] space-y-2 overflow-y-auto pr-0.5">
                  {summary?.incomingRequests.length ? (
                    summary.incomingRequests.map((req) => (
                      <FriendRow
                        key={req.id}
                        user={req.user}
                        isOnline={onlineIds.has(req.user.id)}
                        controls={
                          <div className="flex items-center gap-1.5">
                            <ActionButton
                              tone="primary"
                              onClick={() =>
                                void (async () => {
                                  const s = getStoredAuthSession();
                                  if (!s) return;
                                  await acceptFriendRequest(s.accessToken, req.id);
                                  await refresh();
                                })()
                              }
                            >
                              Accept
                            </ActionButton>
                            <ActionButton
                              onClick={() =>
                                void (async () => {
                                  const s = getStoredAuthSession();
                                  if (!s) return;
                                  await declineFriendRequest(s.accessToken, req.id);
                                  await refresh();
                                })()
                              }
                            >
                              Decline
                            </ActionButton>
                          </div>
                        }
                      />
                    ))
                  ) : (
                    <p className="text-sm text-cyan-100/66">No incoming requests.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[1rem] border border-cyan-300/14 bg-[linear-gradient(180deg,rgba(35,20,112,0.55),rgba(24,14,82,0.6))] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/72">Sent Requests</p>
                <div className="suzi-scrollbar mt-3 max-h-[13rem] space-y-2 overflow-y-auto pr-0.5">
                  {summary?.outgoingRequests.length ? (
                    summary.outgoingRequests.map((req) => (
                      <FriendRow
                        key={req.id}
                        user={req.user}
                        isOnline={onlineIds.has(req.user.id)}
                        controls={
                          <ActionButton
                            onClick={() =>
                              void (async () => {
                                const s = getStoredAuthSession();
                                if (!s) return;
                                await cancelOutgoingFriendRequest(s.accessToken, req.id);
                                await refresh();
                              })()
                            }
                          >
                            Cancel
                          </ActionButton>
                        }
                      />
                    ))
                  ) : (
                    <p className="text-sm text-cyan-100/66">No sent requests.</p>
                  )}
                </div>
              </div>
            </div>
            </div>
          ) : null}

          {activeTab === "connect" ? (
            <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-2">
            <div className="rounded-[1rem] border border-cyan-300/14 bg-[linear-gradient(180deg,rgba(35,20,112,0.55),rgba(24,14,82,0.6))] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/72">Incoming Requests</p>
              <div className="mt-3 space-y-2">
                {summary?.incomingRequests.length ? (
                  summary.incomingRequests.map((req) => (
                    <FriendRow
                      key={req.id}
                      user={req.user}
                      isOnline={onlineIds.has(req.user.id)}
                      controls={
                        <div className="flex items-center gap-1.5">
                          <ActionButton
                            tone="primary"
                            onClick={() =>
                              void (async () => {
                                const s = getStoredAuthSession();
                                if (!s) return;
                                await acceptFriendRequest(s.accessToken, req.id);
                                await refresh();
                              })()
                            }
                          >
                            Accept
                          </ActionButton>
                          <ActionButton
                            onClick={() =>
                              void (async () => {
                                const s = getStoredAuthSession();
                                if (!s) return;
                                await declineFriendRequest(s.accessToken, req.id);
                                await refresh();
                              })()
                            }
                          >
                            Decline
                          </ActionButton>
                          <ActionButton
                            tone="danger"
                            onClick={() =>
                              void (async () => {
                                const s = getStoredAuthSession();
                                if (!s) return;
                                await blockPerson(s.accessToken, req.user.id);
                                await refresh();
                              })()
                            }
                          >
                            Block
                          </ActionButton>
                        </div>
                      }
                    />
                  ))
                ) : (
                  <p className="text-sm text-cyan-100/66">No incoming requests.</p>
                )}
              </div>
            </div>
            <div className="rounded-[1rem] border border-cyan-300/14 bg-[linear-gradient(180deg,rgba(35,20,112,0.55),rgba(24,14,82,0.6))] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/72">Sent Requests</p>
              <div className="mt-3 space-y-2">
                {summary?.outgoingRequests.length ? (
                  summary.outgoingRequests.map((req) => (
                    <FriendRow
                      key={req.id}
                      user={req.user}
                      isOnline={onlineIds.has(req.user.id)}
                      controls={
                        <ActionButton
                          onClick={() =>
                            void (async () => {
                              const s = getStoredAuthSession();
                              if (!s) return;
                              await cancelOutgoingFriendRequest(s.accessToken, req.id);
                              await refresh();
                            })()
                          }
                        >
                          Cancel request
                        </ActionButton>
                      }
                    />
                  ))
                ) : (
                  <p className="text-sm text-cyan-100/66">No sent requests.</p>
                )}
              </div>
            </div>
            </div>
          ) : null}

          {activeTab === "explore" ? (
            <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
            <div className="rounded-[1rem] border border-cyan-300/14 bg-[linear-gradient(180deg,rgba(35,20,112,0.55),rgba(24,14,82,0.6))] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="h-10 min-w-[12rem] flex-1 rounded-[0.72rem] border border-cyan-300/22 bg-[rgba(22,14,72,0.68)] px-3 text-sm text-white placeholder:text-cyan-100/46 focus:border-cyan-200/46 focus:outline-none"
                  placeholder="Find by name, email, or country"
                  value={exploreQuery}
                  onChange={(event) => setExploreQuery(event.target.value)}
                />
                <button
                  type="button"
                  className="h-10 rounded-[0.72rem] border border-cyan-300/24 bg-cyan-400/18 px-3 text-sm font-semibold text-cyan-50"
                  onClick={() => void runExploreSearch()}
                  disabled={busy}
                >
                  Search
                </button>
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/72">
                Browse all users
              </p>
              <div className="suzi-scrollbar mt-3 max-h-[32rem] space-y-2 overflow-y-auto pr-0.5">
                {exploreRows.length ? (
                  exploreRows.map((user) => (
                    <FriendRow
                      key={user.id}
                      user={user}
                      controls={
                        <div className="flex items-center gap-1.5">
                          <ActionButton
                            tone="primary"
                            onClick={() =>
                              void (async () => {
                                const s = getStoredAuthSession();
                                if (!s) return;
                                await sendFriendRequest(s.accessToken, user.username);
                                await refresh();
                                await runExploreSearch();
                              })()
                            }
                          >
                            Add friend
                          </ActionButton>
                          <ActionButton
                            tone="danger"
                            onClick={() =>
                              void (async () => {
                                const s = getStoredAuthSession();
                                if (!s) return;
                                await blockPerson(s.accessToken, user.id);
                                await refresh();
                                await runExploreSearch();
                              })()
                            }
                          >
                            Ignore
                          </ActionButton>
                        </div>
                      }
                    />
                  ))
                ) : (
                  <p className="text-sm text-cyan-100/66">No users found for this search.</p>
                )}
              </div>
            </div>

            <div className="rounded-[1rem] border border-cyan-300/14 bg-[linear-gradient(180deg,rgba(35,20,112,0.55),rgba(24,14,82,0.6))] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/72">
                People You May Know / Suggestions
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {suggested.length ? (
                  suggested.slice(0, 8).map((user) => (
                    <article
                      key={user.id}
                      className="rounded-[0.95rem] border border-cyan-300/16 bg-[rgba(41,26,116,0.62)] p-3"
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={defaultAvatar}
                          alt={displayName(user)}
                          className="h-10 w-10 rounded-full border border-cyan-200/24 object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{displayName(user)}</p>
                          <p className="truncate text-xs text-cyan-100/64">@{user.username}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <ActionButton
                          tone="primary"
                          onClick={() =>
                            void (async () => {
                              const s = getStoredAuthSession();
                              if (!s) return;
                              await sendFriendRequest(s.accessToken, user.username);
                              await refresh();
                            })()
                          }
                        >
                          Add Friend
                        </ActionButton>
                        <ActionButton
                          tone="danger"
                          onClick={() =>
                            void (async () => {
                              const s = getStoredAuthSession();
                              if (!s) return;
                              await blockPerson(s.accessToken, user.id);
                              await refresh();
                            })()
                          }
                        >
                          Ignore
                        </ActionButton>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-cyan-100/66">No suggestions available.</p>
                )}
              </div>
            </div>
            </div>
          ) : null}

          {activeTab === "blocked" ? (
            <div className="p-4 sm:p-5">
            <div className="rounded-[1rem] border border-cyan-300/14 bg-[linear-gradient(180deg,rgba(35,20,112,0.55),rgba(24,14,82,0.6))] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/72">Blocked people</p>
              <div className="suzi-scrollbar mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-0.5">
                {blockedRows.length ? (
                  blockedRows.map((row) => (
                    <FriendRow
                      key={row.id}
                      user={row.user}
                      controls={
                        <ActionButton
                          onClick={() =>
                            void (async () => {
                              const s = getStoredAuthSession();
                              if (!s) return;
                              await unblockPerson(s.accessToken, row.user.id);
                              await refresh();
                            })()
                          }
                        >
                          Unblock
                        </ActionButton>
                      }
                    />
                  ))
                ) : (
                  <p className="text-sm text-cyan-100/66">No blocked users.</p>
                )}
              </div>
            </div>
            </div>
          ) : null}
        </div>
      </Panel>
    </section>
  );
}
