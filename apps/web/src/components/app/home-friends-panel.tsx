"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel, StatusDot, cx } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import {
  acceptFriendRequest,
  blockPerson,
  cancelOutgoingFriendRequest,
  declineFriendRequest,
  explorePeople,
  getFriendsSummary,
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
type Presence = "online" | "away" | "offline";
type RelationshipState = "friend" | "incoming" | "outgoing" | "none";
type PersonRow = {
  id: string;
  username: string;
  displayName: string | null;
  country: string | null;
  relationship: RelationshipState;
  requestId?: string;
};
type ProfileUser = {
  id: string;
  username: string;
  displayName: string | null;
  country: string | null;
};

function getTabClasses(active: boolean) {
  return cx(
    "inline-flex shrink-0 items-center gap-1.5 rounded-[0.6rem] border px-2 py-1 text-[var(--fs-2xs)] font-medium leading-none transition",
    active
      ? "border-fuchsia-300/46 bg-[linear-gradient(90deg,rgba(157,78,221,0.86),rgba(255,32,121,0.72))] text-white shadow-[0_0_16px_rgba(255,32,121,0.24)]"
      : "border-cyan-300/22 bg-[rgba(23,16,71,0.62)] text-cyan-100/84 hover:border-cyan-300/38 hover:text-white",
  );
}

function displayName(user: { displayName: string | null; username: string }) {
  return user.displayName?.trim() || user.username;
}

function presenceDotClass(status: Presence) {
  return status === "online"
    ? "bg-emerald-300 shadow-[0_0_10px_rgba(110,255,178,0.75)]"
    : status === "away"
      ? "bg-amber-300 shadow-[0_0_10px_rgba(255,204,110,0.75)]"
      : "bg-slate-500";
}

export function HomeFriendsPanel() {
  const [summary, setSummary] = useState<FriendsSummary | null>(null);
  const [blockedRows, setBlockedRows] = useState<BlockedUserRow[]>([]);
  const [otherRows, setOtherRows] = useState<FriendSummaryUser[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [isBlockedOpen, setIsBlockedOpen] = useState(false);
  const [presenceById, setPresenceById] = useState<Record<string, Presence>>({});
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const requestsRef = useRef<HTMLDivElement | null>(null);
  const blockedRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    const s = getStoredAuthSession();
    if (!s) {
      setSummary(null);
      setBlockedRows([]);
      setOtherRows([]);
      return;
    }
    const [nextSummary, nextBlocked, nextOthers] = await Promise.all([
      getFriendsSummary(s.accessToken),
      listBlockedPeople(s.accessToken),
      explorePeople(s.accessToken, query.trim(), 60),
    ]);
    setSummary(nextSummary);
    setBlockedRows(nextBlocked);
    setOtherRows(nextOthers);
  }, []);

  useEffect(() => {
    void refresh().catch(() => {
      setError("Could not load friends data.");
    });
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
    const onPresenceUpdate = (payload: {
      userId?: string;
      status?: Presence;
      online?: boolean;
    }) => {
      if (!payload?.userId) {
        return;
      }
      const nextStatus: Presence =
        payload.status ?? (payload.online ? "online" : "offline");
      setPresenceById((prev) => ({ ...prev, [payload.userId as string]: nextStatus }));
    };
    socket.on("friends:update", onFriendsUpdate);
    socket.on("presence:update", onPresenceUpdate);
    return () => {
      socket.off("friends:update", onFriendsUpdate);
      socket.off("presence:update", onPresenceUpdate);
    };
  }, [refresh]);

  const allWatchIds = useMemo(() => {
    const ids = new Set<string>();
    for (const friend of summary?.friends ?? []) {
      ids.add(friend.id);
    }
    for (const row of summary?.incomingRequests ?? []) {
      ids.add(row.user.id);
    }
    for (const row of summary?.outgoingRequests ?? []) {
      ids.add(row.user.id);
    }
    for (const user of otherRows) {
      ids.add(user.id);
    }
    return [...ids];
  }, [otherRows, summary]);

  useEffect(() => {
    const s = getStoredAuthSession();
    if (!s || allWatchIds.length === 0) {
      return;
    }
    const socket = getRealtimeSocket(s.accessToken);
    socket.emit(
      "presence:watch",
      { userIds: allWatchIds },
      (ack?: { ok?: boolean; statuses?: Record<string, Presence> }) => {
        if (!ack?.ok || !ack.statuses) {
          return;
        }
        setPresenceById((prev) => ({ ...prev, ...ack.statuses }));
      },
    );
  }, [allWatchIds]);

  useEffect(() => {
    const onWindowClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (requestsRef.current && !requestsRef.current.contains(target)) {
        setIsRequestsOpen(false);
      }
      if (blockedRef.current && !blockedRef.current.contains(target)) {
        setIsBlockedOpen(false);
      }
    };
    window.addEventListener("click", onWindowClick);
    return () => {
      window.removeEventListener("click", onWindowClick);
    };
  }, []);

  const friendMap = useMemo(() => {
    const map = new Map<string, FriendsSummary["friends"][0]>();
    for (const friend of summary?.friends ?? []) {
      map.set(friend.id, friend);
    }
    return map;
  }, [summary]);
  const incomingMap = useMemo(() => {
    const map = new Map<string, FriendsSummary["incomingRequests"][0]>();
    for (const row of summary?.incomingRequests ?? []) {
      map.set(row.user.id, row);
    }
    return map;
  }, [summary]);
  const outgoingMap = useMemo(() => {
    const map = new Map<string, FriendsSummary["outgoingRequests"][0]>();
    for (const row of summary?.outgoingRequests ?? []) {
      map.set(row.user.id, row);
    }
    return map;
  }, [summary]);

  const allOthers = useMemo<PersonRow[]>(() => {
    const map = new Map<string, PersonRow>();
    for (const row of summary?.incomingRequests ?? []) {
      map.set(row.user.id, {
        ...row.user,
        relationship: "incoming",
        requestId: row.id,
      });
    }
    for (const row of summary?.outgoingRequests ?? []) {
      map.set(row.user.id, {
        ...row.user,
        relationship: "outgoing",
        requestId: row.id,
      });
    }
    for (const row of otherRows) {
      if (map.has(row.id)) {
        continue;
      }
      map.set(row.id, {
        ...row,
        relationship: "none",
      });
    }
    return [...map.values()];
  }, [otherRows, summary]);

  const friendRows = useMemo(() => summary?.friends ?? [], [summary]);
  const filteredFriends = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return friendRows;
    }
    return friendRows.filter((person) =>
      `${displayName(person)} ${person.username} ${person.country ?? ""}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [friendRows, query]);

  const filteredOthers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return allOthers;
    }
    return allOthers.filter((person) =>
      `${displayName(person)} ${person.username} ${person.country ?? ""}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [allOthers, query]);

  const friendsOnline = filteredFriends.filter(
    (f) => (presenceById[f.id] ?? "offline") === "online",
  );
  const friendsAway = filteredFriends.filter(
    (f) => (presenceById[f.id] ?? "offline") === "away",
  );
  const friendsOffline = filteredFriends.filter(
    (f) => (presenceById[f.id] ?? "offline") === "offline",
  );

  async function runAction(task: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await task();
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  function profileFromUser(user: ProfileUser) {
    setProfileUser(user);
  }

  const incomingCount = summary?.incomingRequests.length ?? 0;
  const blockedCount = blockedRows.length;

  return (
    <Panel className="flex h-full min-h-0 flex-col overflow-hidden p-[var(--panel-pad)]">
      <div className="shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(157,78,221,0.26)] text-fuchsia-200/95 shadow-[0_0_14px_rgba(157,78,221,0.3)]">
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
              <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5H7a3 3 0 0 0-3 3V20" />
              <circle cx="9" cy="8" r="3" />
              <path d="M20 20v-1a2.8 2.8 0 0 0-2.1-2.7" />
              <path d="M16.5 5.5a2.5 2.5 0 0 1 0 5" />
            </svg>
          </span>
          <h2 className="text-[var(--fs-xl)] font-bold tracking-tight text-white">Friends</h2>
        </div>
        </div>

      <div className="mt-3 space-y-2.5">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-cyan-100/60">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.85"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.2-3.2" />
            </svg>
          </span>

          <input
            className="h-[var(--btn-h-sm)] w-full rounded-[0.8rem] border border-cyan-300/24 bg-[linear-gradient(95deg,rgba(36,22,101,0.62),rgba(24,14,76,0.7))] py-1.5 pl-9 pr-10 text-[var(--fs-xs)] text-cyan-50/96 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] placeholder:text-cyan-100/48 focus:border-fuchsia-300/52 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/24"
            placeholder="Search friends..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <button
            type="button"
            aria-label="Search friends"
            className="absolute inset-y-0 right-0 inline-flex w-9 items-center justify-center rounded-r-[0.8rem] border-l border-cyan-300/24 text-fuchsia-200/84 transition hover:text-fuchsia-100"
          >
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
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.2-3.2" />
            </svg>
          </button>
        </div>

        <div className="relative z-20 flex flex-wrap items-center gap-1.5 pb-1">
          <button type="button" className={getTabClasses(true)}>
            All
          </button>
          <div ref={requestsRef} className="relative">
            <button
              type="button"
              className={getTabClasses(isRequestsOpen)}
              onClick={() => {
                setIsRequestsOpen((v) => !v);
                setIsBlockedOpen(false);
              }}
            >
              Requests
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 text-[var(--fs-2xs)] font-semibold leading-none text-white">
                {incomingCount}
              </span>
            </button>
            {isRequestsOpen ? (
              <div className="suzi-overlay-panel absolute left-0 top-[calc(100%+0.4rem)] z-30 w-72 rounded-[0.9rem] p-2">
                <p className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/76">
                  Incoming Requests
                </p>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {(summary?.incomingRequests ?? []).map((row) => (
                    <div key={row.id} className="rounded-[0.7rem] border border-cyan-300/20 bg-[rgba(22,14,72,0.66)] p-2">
                      <button
                        type="button"
                        onClick={() => profileFromUser(row.user)}
                        className="truncate text-sm font-semibold text-white hover:text-cyan-100"
                      >
                        {displayName(row.user)}
                      </button>
                      <p className="truncate text-xs text-cyan-100/70">@{row.user.username}</p>
                      <div className="mt-2 flex gap-1.5">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void runAction(async () => {
                            const s = getStoredAuthSession();
                            if (!s) return;
                            await acceptFriendRequest(s.accessToken, row.id);
                          })}
                          className="rounded-full border border-emerald-300/35 bg-emerald-400/20 px-2 py-1 text-[0.68rem] font-semibold text-emerald-50"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void runAction(async () => {
                            const s = getStoredAuthSession();
                            if (!s) return;
                            await declineFriendRequest(s.accessToken, row.id);
                          })}
                          className="rounded-full border border-fuchsia-300/30 bg-fuchsia-500/20 px-2 py-1 text-[0.68rem] font-semibold text-pink-100"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                  {(summary?.incomingRequests.length ?? 0) === 0 ? (
                    <p className="px-2 py-2 text-xs text-cyan-100/66">No incoming requests.</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          <div ref={blockedRef} className="relative">
            <button
              type="button"
              className={getTabClasses(isBlockedOpen)}
              onClick={() => {
                setIsBlockedOpen((v) => !v);
                setIsRequestsOpen(false);
              }}
            >
              Blocked
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-600 px-1 text-[var(--fs-2xs)] font-semibold leading-none text-white">
                {blockedCount}
              </span>
            </button>
            {isBlockedOpen ? (
              <div className="suzi-overlay-panel absolute right-0 top-[calc(100%+0.4rem)] z-30 w-72 rounded-[0.9rem] p-2">
                <p className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/76">
                  Blocked People
                </p>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {blockedRows.map((row) => (
                    <div key={row.id} className="rounded-[0.7rem] border border-cyan-300/20 bg-[rgba(22,14,72,0.66)] p-2">
                      <button
                        type="button"
                        onClick={() => profileFromUser(row.user)}
                        className="truncate text-sm font-semibold text-white hover:text-cyan-100"
                      >
                        {displayName(row.user)}
                      </button>
                      <p className="truncate text-xs text-cyan-100/70">@{row.user.username}</p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction(async () => {
                          const s = getStoredAuthSession();
                          if (!s) return;
                          await unblockPerson(s.accessToken, row.user.id);
                        })}
                        className="mt-2 rounded-full border border-cyan-300/30 bg-cyan-400/16 px-2 py-1 text-[0.68rem] font-semibold text-cyan-50"
                      >
                        Cancel block
                      </button>
                    </div>
                  ))}
                  {blockedRows.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-cyan-100/66">No blocked users.</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      </div>

      <div className="suzi-scrollbar mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden overscroll-contain rounded-[0.95rem] border border-cyan-300/16 p-1.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.32),inset_0_0_0_1px_rgba(255,255,255,0.02)]">
        {error ? (
          <div className="rounded-[0.9rem] border border-pink-400/20 bg-pink-500/10 px-3 py-2 text-[var(--fs-xs)] text-pink-100">
            {error}
          </div>
        ) : null}

        {[...friendsOnline, ...friendsAway, ...friendsOffline].length === 0 ? (
          <div className="rounded-[0.8rem] border border-cyan-300/14 bg-[rgba(18,13,65,0.45)] px-3 py-2 text-[var(--fs-xs)] text-cyan-100/56">
            You have no friends yet. Explore people below and send friend requests.
          </div>
        ) : (
          [...friendsOnline, ...friendsAway, ...friendsOffline].map((friend) => {
            const status = presenceById[friend.id] ?? "offline";
            return (
              <div
                key={friend.id}
                className="flex items-center gap-2.5 rounded-[0.95rem] border border-cyan-300/18 bg-[linear-gradient(160deg,rgba(32,20,89,0.72),rgba(18,13,65,0.56))] px-2.5 py-1.5"
              >
                <div className="relative shrink-0" style={{ width: "var(--avatar-md)", height: "var(--avatar-md)" }}>
                  <Image
                    src={defaultAvatar}
                    alt={displayName(friend)}
                    width={44}
                    height={44}
                    className="h-full w-full rounded-full border border-white/14 object-cover"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[rgba(24,16,82,0.95)] bg-[rgba(24,16,82,0.95)]">
                    <span className={cx("block h-full w-full rounded-full", presenceDotClass(status))} />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => profileFromUser(friend)}
                    className="block w-full truncate text-left text-[var(--fs-xs)] font-semibold leading-tight text-white hover:text-cyan-100"
                  >
                    {displayName(friend)}
                  </button>
                  <p className="mt-0.5 truncate text-[var(--fs-2xs)] leading-none text-cyan-100/66">
                    @{friend.username}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={`/app/messages?with=${encodeURIComponent(friend.id)}`}
                    className="inline-flex items-center justify-center rounded-full border border-fuchsia-300/22 bg-[linear-gradient(150deg,rgba(86,30,173,0.54),rgba(46,17,111,0.74))] text-cyan-100/88 transition hover:border-fuchsia-300/42 hover:text-white"
                    style={{ width: "var(--btn-h-sm)", height: "var(--btn-h-sm)" }}
                    aria-label={`Message ${displayName(friend)}`}
                    title="Message"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.85"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 6h16v10H8l-4 4V6Z" />
                    </svg>
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void runAction(async () => {
                        const s = getStoredAuthSession();
                        if (!s) return;
                        await unfriend(s.accessToken, friend.id);
                      })
                    }
                    className="inline-flex items-center justify-center rounded-full border border-fuchsia-300/30 bg-fuchsia-500/16 text-pink-100"
                    style={{ width: "var(--btn-h-sm)", height: "var(--btn-h-sm)" }}
                    title="Unfriend"
                    aria-label={`Unfriend ${displayName(friend)}`}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5H7a3 3 0 0 0-3 3V20" />
                      <circle cx="9" cy="8" r="3" />
                      <path d="M16 11h6" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}

        <div className="space-y-1.5 pt-1">
          <p
            className="px-1 font-semibold uppercase tracking-[0.1em] text-cyan-100/62"
            style={{ fontSize: "clamp(0.46rem, 0.22vw + 0.34rem, 0.56rem)" }}
          >
            Other People On SuziChat
          </p>
          {filteredOthers.length > 0 ? (
            filteredOthers.map((person) => {
              const status = presenceById[person.id] ?? "offline";
              return (
                <div
                  key={person.id}
                  className="flex items-center gap-2.5 rounded-[0.95rem] border border-cyan-300/18 bg-[linear-gradient(160deg,rgba(32,20,89,0.72),rgba(18,13,65,0.56))] px-2.5 py-1.5"
                >
                  <div className="relative shrink-0" style={{ width: "var(--avatar-md)", height: "var(--avatar-md)" }}>
                    <Image
                      src={defaultAvatar}
                      alt={displayName(person)}
                      width={44}
                      height={44}
                      className="h-full w-full rounded-full border border-white/14 object-cover"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[rgba(24,16,82,0.95)] bg-[rgba(24,16,82,0.95)]">
                      <span className={cx("block h-full w-full rounded-full", presenceDotClass(status))} />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => profileFromUser(person)}
                      className="block w-full truncate text-left text-[var(--fs-xs)] font-semibold leading-tight text-white hover:text-cyan-100"
                    >
                      {displayName(person)}
                    </button>
                    <p className="mt-0.5 truncate text-[var(--fs-2xs)] leading-none text-cyan-100/66">
                      @{person.username}
                    </p>
                  </div>
                  {person.relationship === "incoming" ? (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void runAction(async () => {
                            const s = getStoredAuthSession();
                            if (!s || !person.requestId) return;
                            await acceptFriendRequest(s.accessToken, person.requestId);
                          })
                        }
                        className="rounded-full border border-emerald-300/35 bg-emerald-400/20 px-2 py-1 text-[var(--fs-2xs)] font-semibold text-emerald-50"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void runAction(async () => {
                            const s = getStoredAuthSession();
                            if (!s || !person.requestId) return;
                            await declineFriendRequest(s.accessToken, person.requestId);
                          })
                        }
                        className="rounded-full border border-fuchsia-300/30 bg-fuchsia-500/16 px-2 py-1 text-[var(--fs-2xs)] font-semibold text-pink-100"
                      >
                        Reject
                      </button>
                    </div>
                  ) : person.relationship === "outgoing" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void runAction(async () => {
                          const s = getStoredAuthSession();
                          if (!s || !person.requestId) return;
                          await cancelOutgoingFriendRequest(s.accessToken, person.requestId);
                        })
                      }
                      className="shrink-0 rounded-full border border-cyan-300/30 bg-cyan-400/16 px-2 py-0.5 text-[var(--fs-2xs)] font-semibold text-cyan-50"
                      title="Cancel request"
                    >
                      Cancel
                    </button>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void runAction(async () => {
                            const s = getStoredAuthSession();
                            if (!s) return;
                            await sendFriendRequest(s.accessToken, person.username);
                          })
                        }
                        className="inline-flex items-center justify-center rounded-full border border-emerald-300/35 bg-emerald-400/20 text-[var(--fs-2xs)] font-semibold text-emerald-50"
                        style={{ width: "var(--btn-h-sm)", height: "var(--btn-h-sm)" }}
                        title="Add friend"
                        aria-label={`Add ${displayName(person)} as friend`}
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5H7a3 3 0 0 0-3 3V20" />
                          <circle cx="9" cy="8" r="3" />
                          <path d="M19 8v6M16 11h6" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void runAction(async () => {
                            const s = getStoredAuthSession();
                            if (!s) return;
                            await blockPerson(s.accessToken, person.id);
                          })
                        }
                        className="inline-flex items-center justify-center rounded-full border border-fuchsia-300/30 bg-fuchsia-500/16 text-[var(--fs-2xs)] font-semibold text-pink-100"
                        style={{ width: "var(--btn-h-sm)", height: "var(--btn-h-sm)" }}
                        title="Block"
                        aria-label={`Block ${displayName(person)}`}
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="9" />
                          <path d="m5.5 5.5 13 13" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex h-full items-center rounded-[0.9rem] border border-cyan-300/16 bg-[rgba(17,12,58,0.54)] px-3 py-3 text-[var(--fs-xs)] text-cyan-100/70">
              No users match this search.
            </div>
          )}
        </div>

      </div>

      {profileUser ? (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-[rgba(6,10,28,0.72)] p-4">
          <div className="w-full max-w-md rounded-[1.1rem] border border-cyan-300/24 bg-[linear-gradient(160deg,rgba(34,20,101,0.96),rgba(20,14,76,0.94))] p-4 shadow-[0_20px_60px_rgba(7,11,30,0.62)]">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Profile</h3>
              <button
                type="button"
                onClick={() => setProfileUser(null)}
                className="rounded-full border border-cyan-300/30 bg-cyan-400/16 px-2 py-1 text-xs font-semibold text-cyan-100"
              >
                Close
              </button>
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-[0.9rem] border border-cyan-300/16 bg-[rgba(20,13,62,0.55)] p-3">
              <Image
                src={defaultAvatar}
                alt={displayName(profileUser)}
                width={56}
                height={56}
                className="h-14 w-14 rounded-full border border-white/14 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold text-white">{displayName(profileUser)}</p>
                <p className="truncate text-sm text-cyan-100/74">@{profileUser.username}</p>
                {profileUser.country ? (
                  <p className="truncate text-xs text-cyan-100/62">{profileUser.country}</p>
                ) : null}
              </div>
              <StatusDot status={presenceById[profileUser.id] ?? "offline"} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/app/messages?with=${encodeURIComponent(profileUser.id)}`}
                className="rounded-full border border-cyan-300/30 bg-cyan-400/16 px-3 py-1.5 text-xs font-semibold text-cyan-50"
                onClick={() => setProfileUser(null)}
              >
                DM
              </Link>
              <Link
                href={`/app/profile/u/${encodeURIComponent(profileUser.id)}`}
                className="rounded-full border border-fuchsia-300/30 bg-fuchsia-500/16 px-3 py-1.5 text-xs font-semibold text-pink-100"
                onClick={() => setProfileUser(null)}
              >
                View full profile
              </Link>
            </div>
          </div>
        </div>
        ) : (
          null
        )}
    </Panel>
  );
}
