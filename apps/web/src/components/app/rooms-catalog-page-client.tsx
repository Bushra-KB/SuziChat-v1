"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listEmpty,
  listMeta,
  listSubtitle,
  listTitleLink,
  pageEyebrow,
  pageLead,
  pageTitle,
} from "@/components/app/app-typography";
import { Panel, cx } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import { getRealtimeSocket } from "@/lib/realtime-client";
import { subscribeRoomsCatalog } from "@/lib/realtime-feed";
import { joinRoom, listRooms, listRoomsForMe, requestRoomAccess, type ApiRoom } from "@/lib/rooms-client";

const DEFAULT_ROOM_COVER = "/logo/logo.png";

function formatPrivacyLabel(privacy: string) {
  if (privacy.toLowerCase() === "friends") {
    return "Friends";
  }
  if (privacy.toLowerCase() === "private") {
    return "Private";
  }
  return "Public";
}

export function RoomsCatalogPageClient() {
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [onlineBySlug, setOnlineBySlug] = useState<Record<string, number>>({});
  const [actingSlug, setActingSlug] = useState<string | null>(null);

  const reloadRooms = useCallback(async () => {
    const session = getStoredAuthSession();
    const loader = session?.accessToken ? listRoomsForMe(session.accessToken) : listRooms();
    const rows = await loader;
    setRooms(rows);
    setError("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void reloadRooms()
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load rooms.");
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
  }, [reloadRooms]);

  useEffect(() => {
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      return;
    }
    return subscribeRoomsCatalog(session.accessToken, () => {
      void reloadRooms().catch(() => {});
    });
  }, [reloadRooms]);

  useEffect(() => {
    const session = getStoredAuthSession();
    if (!session?.accessToken || rooms.length === 0) {
      return;
    }
    const socket = getRealtimeSocket(session.accessToken);
    const watch = () => {
      for (const room of rooms) {
        socket.emit("room:watch", { roomSlug: room.slug });
      }
    };
    const onStats = (payload: { roomSlug?: string; onlineUsers?: number }) => {
      if (!payload.roomSlug || typeof payload.onlineUsers !== "number") {
        return;
      }
      setOnlineBySlug((prev) => ({ ...prev, [payload.roomSlug as string]: payload.onlineUsers as number }));
    };
    socket.on("connect", watch);
    socket.on("room:stats", onStats);
    if (socket.connected) {
      watch();
    }
    return () => {
      socket.off("connect", watch);
      socket.off("room:stats", onStats);
    };
  }, [rooms]);

  async function handleAction(room: ApiRoom) {
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      return;
    }
    const action = room.actor?.action ?? (room.privacy.toLowerCase() === "public" ? "join" : "request");
    if (action === "open") {
      window.location.href = `/app/rooms/${encodeURIComponent(room.slug)}`;
      return;
    }
    if (action === "requested") {
      return;
    }
    setActingSlug(room.slug);
    try {
      if (action === "join") {
        await joinRoom(session.accessToken, room.slug);
        setRooms((prev) =>
          prev.map((row) =>
            row.slug === room.slug
              ? {
                  ...row,
                  actor: { isMember: true, hasPendingRequest: false, action: "open" },
                  _count: { messages: row._count?.messages ?? 0, memberships: (row._count?.memberships ?? 0) + 1 },
                }
              : row,
          ),
        );
      } else {
        await requestRoomAccess(session.accessToken, room.slug);
        setRooms((prev) =>
          prev.map((row) =>
            row.slug === room.slug
              ? {
                  ...row,
                  actor: { isMember: false, hasPendingRequest: true, action: "requested" },
                }
              : row,
          ),
        );
      }
    } finally {
      setActingSlug(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return rooms;
    }
    return rooms.filter((room) =>
      `${room.name} ${room.category} ${room.description ?? ""}`.toLowerCase().includes(q),
    );
  }, [query, rooms]);

  return (
    <section className="space-y-6">
      <Panel className="p-6 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={pageEyebrow}>Rooms</p>
            <h1 className={cx(pageTitle, "mt-2")}>Browse all chat rooms</h1>
            <p className={cx(pageLead, "mt-1.5")}>
              Join existing rooms or create your own community space.
            </p>
          </div>
          <Link href="/app/rooms/create" className="suzi-primary-btn px-3 py-1.5">
            Create room
          </Link>
        </div>
        <div className="mt-5">
          <input
            className="suzi-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search rooms by name/category"
          />
        </div>
        {error ? <p className={cx(listMeta, "mt-3 text-amber-100")}>{error}</p> : null}
      </Panel>

      <Panel className="p-5">
        {loading ? (
          <p className={listEmpty}>Loading rooms…</p>
        ) : filtered.length === 0 ? (
          <p className={listEmpty}>No rooms match this search.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {filtered.map((room) => (
              <article
                key={room.id}
                className="rounded-[1rem] border border-cyan-300/16 bg-[linear-gradient(160deg,rgba(29,17,88,0.72),rgba(17,12,58,0.6))] p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[0.7rem] border border-cyan-300/20">
                    <img
                      src={room.imageUrl?.trim() || DEFAULT_ROOM_COVER}
                      alt={`${room.name} cover`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/app/rooms/${encodeURIComponent(room.slug)}`}
                      className={listTitleLink}
                    >
                      {room.name}
                    </Link>
                    <div className={cx(listMeta, "mt-1 flex items-center gap-2")}>
                      <span className="rounded-full border border-white/14 bg-white/8 px-2 py-0.5">
                        {room.category}
                      </span>
                      <span>
                        {room.privacy.toLowerCase() === "public" ? "🌐" : "🔒"} {formatPrivacyLabel(room.privacy)}
                      </span>
                    </div>
                    <p className={cx(listSubtitle, "mt-1")}>{room.description ?? "No description"}</p>
                  </div>
                </div>
                <div className={cx(listMeta, "mt-4 flex flex-wrap items-center gap-2")}>
                  <span>Owner: @{room.owner.username}</span>
                  <span>{room._count?.memberships ?? 0} members</span>
                  <span>{onlineBySlug[room.slug] ?? 0} online</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actingSlug === room.slug || room.actor?.action === "requested"}
                    onClick={() => void handleAction(room)}
                    className="suzi-primary-btn px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {room.actor?.action === "open"
                      ? "Open room"
                      : room.actor?.action === "requested"
                        ? "Requested"
                        : room.actor?.action === "request"
                          ? "Request access"
                          : "Join room"}
                  </button>
                  <Link
                    href={`/app/rooms/${encodeURIComponent(room.slug)}/edit`}
                    className="suzi-secondary-btn px-3 py-2 text-xs"
                  >
                    Edit
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </section>
  );
}
