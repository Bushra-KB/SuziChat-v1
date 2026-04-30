"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cx } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import {
  getFriendsSummary,
  unfriend,
  type FriendSummaryUser,
  type FriendsSummary,
} from "@/lib/friends-client";
import { getRealtimeSocket } from "@/lib/realtime-client";

const defaultAvatar = "/ppic/ppic1.jpeg";

type Presence = "online" | "away" | "offline";

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

type FriendEntry = FriendsSummary["friends"][0];

function sortFriendsForDisplay(
  list: FriendEntry[],
  presenceById: Record<string, Presence>,
): FriendEntry[] {
  const rank = (id: string) => {
    const s = presenceById[id] ?? "offline";
    if (s === "online") {
      return 0;
    }
    if (s === "away") {
      return 1;
    }
    return 2;
  };
  return [...list].sort((a, b) => {
    const d = rank(a.id) - rank(b.id);
    if (d !== 0) {
      return d;
    }
    return displayName(a).localeCompare(displayName(b));
  });
}

export function ProfilePageFriendsSection({
  initialFriends,
  accessToken,
}: {
  initialFriends: FriendsSummary | null;
  accessToken: string | null;
}) {
  const [friends, setFriends] = useState<FriendsSummary | null>(initialFriends);
  const [presenceById, setPresenceById] = useState<Record<string, Presence>>({});
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const s = getStoredAuthSession();
    if (!s) {
      setFriends(null);
      return;
    }
    const data = await getFriendsSummary(s.accessToken);
    setFriends(data);
  }, []);

  useEffect(() => {
    setFriends(initialFriends);
  }, [initialFriends]);

  const friendIds = useMemo(
    () => friends?.friends.map((f) => f.id) ?? [],
    [friends],
  );

  useEffect(() => {
    if (!accessToken || friendIds.length === 0) {
      return;
    }
    const socket = getRealtimeSocket(accessToken);
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
  }, [accessToken, friendIds.length, refresh]);

  useEffect(() => {
    if (!accessToken || friendIds.length === 0) {
      return;
    }
    const socket = getRealtimeSocket(accessToken);
    socket.emit(
      "presence:watch",
      { userIds: friendIds },
      (ack?: { ok?: boolean; statuses?: Record<string, Presence> }) => {
        if (!ack?.ok || !ack.statuses) {
          return;
        }
        setPresenceById((prev) => ({ ...prev, ...ack.statuses }));
      },
    );
  }, [accessToken, friendIds]);

  const sortedFriends = useMemo(() => {
    if (!friends?.friends.length) {
      return [];
    }
    return sortFriendsForDisplay(friends.friends, presenceById);
  }, [friends, presenceById]);

  async function runAction(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {!friends ? (
        <p className="text-sm text-[var(--text-muted)]">Loading friends…</p>
      ) : sortedFriends.length === 0 ? (
        <div className="rounded-[0.85rem] border border-cyan-300/14 bg-[rgba(18,13,65,0.45)] px-3 py-3 text-sm text-cyan-100/56">
          You have no friends yet. Explore people from{" "}
          <Link href="/app/friends" className="font-semibold text-cyan-200 underline-offset-2 hover:underline">
            Friends
          </Link>
          .
        </div>
      ) : (
        <div className="suzi-scrollbar max-h-[22rem] space-y-2 overflow-y-auto pr-1">
          {sortedFriends.map((friend) => {
            const status = presenceById[friend.id] ?? "offline";
            return (
              <div
                key={friend.id}
                className="flex items-center gap-3 rounded-[1rem] border border-cyan-300/18 bg-[linear-gradient(160deg,rgba(32,20,89,0.72),rgba(18,13,65,0.56))] px-3 py-2.5"
              >
                <div className="relative h-11 w-11 shrink-0">
                  <Image
                    src={defaultAvatar}
                    alt={displayName(friend)}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full border border-white/14 object-cover"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[rgba(24,16,82,0.95)] bg-[rgba(24,16,82,0.95)]">
                    <span className={cx("block h-full w-full rounded-full", presenceDotClass(status))} />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/app/profile/${encodeURIComponent(friend.username)}`}
                    className="block truncate text-[1.05rem] font-semibold leading-tight text-white hover:text-cyan-100"
                  >
                    {displayName(friend)}
                  </Link>
                  <p className="mt-1 truncate text-[0.86rem] leading-none text-cyan-100/66">@{friend.username}</p>
                </div>
                <Link
                  href={`/app/messages?with=${encodeURIComponent(friend.id)}`}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.8rem] border border-fuchsia-300/22 bg-[linear-gradient(150deg,rgba(86,30,173,0.54),rgba(46,17,111,0.74))] text-cyan-100/88 transition hover:border-fuchsia-300/42 hover:text-white"
                  aria-label={`Message ${displayName(friend)}`}
                >
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
                    <path d="M4 6h16v10H8l-4 4V6Z" />
                  </svg>
                </Link>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void runAction(async () => {
                      const s = getStoredAuthSession();
                      if (!s) {
                        return;
                      }
                      await unfriend(s.accessToken, friend.id);
                    })
                  }
                  className="shrink-0 rounded-full border border-fuchsia-300/30 bg-fuchsia-500/16 px-2 py-1 text-[0.66rem] font-semibold text-pink-100"
                >
                  Unfriend
                </button>
              </div>
            );
          })}
        </div>
      )}
      <Link
        href="/app/friends"
        className="inline-flex items-center justify-center rounded-full border border-cyan-300/22 bg-white/6 px-4 py-2.5 text-sm font-semibold text-cyan-100/88 transition hover:border-cyan-300/38 hover:bg-white/10"
      >
        Friends hub
      </Link>
    </div>
  );
}
