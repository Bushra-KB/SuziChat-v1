"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Panel } from "@/components/ui/suzi-primitives";
import { listRooms, type ApiRoom } from "@/lib/rooms-client";

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listRooms()
      .then((rows) => {
        if (!cancelled) {
          setRooms(rows);
          setError("");
        }
      })
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
  }, []);

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
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/66">Rooms</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Browse all chat rooms</h1>
            <p className="mt-2 text-sm text-cyan-100/74">
              Join existing rooms or create your own community space.
            </p>
          </div>
          <Link href="/app/rooms/create" className="suzi-primary-btn px-4 py-2.5 text-sm">
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
        {error ? <p className="mt-3 text-sm text-amber-100">{error}</p> : null}
      </Panel>

      <Panel className="p-5">
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading rooms…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No rooms match this search.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {filtered.map((room) => (
              <article
                key={room.id}
                className="rounded-[1rem] border border-cyan-300/16 bg-[linear-gradient(160deg,rgba(29,17,88,0.72),rgba(17,12,58,0.6))] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/app/rooms/${encodeURIComponent(room.slug)}`}
                      className="truncate text-xl font-semibold text-white transition hover:text-cyan-100"
                    >
                      {room.name}
                    </Link>
                    <p className="mt-1 text-sm text-cyan-100/74">{room.description ?? "No description"}</p>
                  </div>
                  <span className="rounded-full border border-cyan-300/24 bg-cyan-400/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-50">
                    {formatPrivacyLabel(room.privacy)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-cyan-100/66">
                  <span className="rounded-full border border-white/14 bg-white/8 px-2 py-1">
                    {room.category}
                  </span>
                  <span>Owner: @{room.owner.username}</span>
                  <span>Messages: {room._count?.messages ?? 0}</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Link
                    href={`/app/rooms/${encodeURIComponent(room.slug)}`}
                    className="suzi-primary-btn px-3 py-2 text-xs"
                  >
                    Join room
                  </Link>
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
