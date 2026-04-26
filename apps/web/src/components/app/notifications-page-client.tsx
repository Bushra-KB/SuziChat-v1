"use client";

import { useCallback, useEffect, useState } from "react";
import { Chip, Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
} from "@/lib/notifications-client";
import { getRealtimeSocket } from "@/lib/realtime-client";

export function NotificationsPageClient() {
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "mentions" | "requests" | "social">("all");

  const classify = (item: ApiNotification) => {
    const title = item.title.toLowerCase();
    const body = item.body.toLowerCase();
    if (title.includes("mention") || body.includes("mention")) {
      return "mentions" as const;
    }
    if (title.includes("request") || body.includes("request")) {
      return "requests" as const;
    }
    return "social" as const;
  };

  const unreadCount = items.reduce((sum, item) => sum + (item.read ? 0 : 1), 0);
  const filteredItems = items.filter((item) => {
    if (activeFilter === "all") {
      return true;
    }
    if (activeFilter === "unread") {
      return !item.read;
    }
    return classify(item) === activeFilter;
  });

  const refresh = useCallback(async () => {
    const s = getStoredAuthSession();
    if (!s) {
      setError("Not signed in.");
      return;
    }
    setError("");
    const list = await listNotifications(s.accessToken);
    setItems(list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void refresh()
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load notifications.");
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
    const onNotificationsUpdate = () => {
      void refresh().catch(() => {});
    };
    socket.on("notifications:update", onNotificationsUpdate);
    return () => {
      socket.off("notifications:update", onNotificationsUpdate);
    };
  }, [refresh]);

  async function handleMarkAll() {
    const s = getStoredAuthSession();
    if (!s) {
      return;
    }
    setBusy(true);
    try {
      await markAllNotificationsRead(s.accessToken);
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    } finally {
      setBusy(false);
    }
  }

  async function handleOpen(item: ApiNotification) {
    const s = getStoredAuthSession();
    if (!s || item.read) {
      return;
    }
    setItems((prev) =>
      prev.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)),
    );
    try {
      await markNotificationRead(s.accessToken, item.id);
    } catch {
      setItems((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, read: false } : entry)),
      );
    }
  }

  return (
    <section className="space-y-6">
      <Panel className="p-6 sm:p-7">
        <SectionHeader
          eyebrow="Notifications"
          title="Requests, mentions, and activity"
          action={
            <button
              type="button"
              className="suzi-secondary-btn px-4 py-2.5 text-sm"
              onClick={() => void handleMarkAll()}
              disabled={busy || unreadCount === 0}
            >
              {busy ? "Updating…" : "Mark all read"}
            </button>
          }
        />

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={() => setActiveFilter("all")}>
            <Chip active={activeFilter === "all"} tone="pink">
              All ({items.length})
            </Chip>
          </button>
          <button type="button" onClick={() => setActiveFilter("unread")}>
            <Chip active={activeFilter === "unread"} tone="cyan">
              Unread ({unreadCount})
            </Chip>
          </button>
          <button type="button" onClick={() => setActiveFilter("mentions")}>
            <Chip active={activeFilter === "mentions"}>Mentions</Chip>
          </button>
          <button type="button" onClick={() => setActiveFilter("requests")}>
            <Chip active={activeFilter === "requests"}>Requests</Chip>
          </button>
          <button type="button" onClick={() => setActiveFilter("social")}>
            <Chip active={activeFilter === "social"} tone="cyan">
              Social
            </Chip>
          </button>
        </div>

        {error ? <p className="mt-4 text-sm text-amber-100">{error}</p> : null}

        <div className="mt-6 space-y-4">
          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading…</p>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">You&apos;re all caught up.</p>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void handleOpen(item)}
                className="w-full rounded-[1.2rem] border border-white/8 bg-white/4 px-4 py-4 text-left transition hover:bg-white/8"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium uppercase tracking-[0.24em] text-cyan-100/62">Activity</p>
                      {!item.read ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(232,77,255,0.72)]" />
                      ) : null}
                    </div>
                    <p className="mt-2 text-base font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{item.body}</p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </Panel>
    </section>
  );
}
