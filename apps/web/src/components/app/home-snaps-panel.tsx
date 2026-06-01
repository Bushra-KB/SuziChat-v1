"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, cx } from "@/components/ui/suzi-primitives";
import {
  homePanelHeader,
  homePanelIcon,
  homeSnapTile,
  homeStatPill,
  listEmpty,
  listL3,
  panelLink,
  panelTitle,
} from "@/components/app/home-typography";
import { getStoredAuthSession } from "@/lib/auth-client";
import { listMyPosts, listPosts } from "@/lib/posts-client";
import { resolveUserAvatarUrl } from "@/lib/avatar-url";
import { subscribePostsFeedChannel, subscribeUserProfileUpdates, watchPostsEngagement } from "@/lib/realtime-feed";
import { apiPostToSnap } from "@/lib/post-ui-mappers";
import { useI18n } from "@/lib/i18n";
import type { Snap } from "@/lib/v1-mock-data";

function SnapTileMedia({ src, alt }: { src: string; alt: string }) {
  const local = src.startsWith("/");
  if (!local) {
    return (
      // Remote URLs may not be configured in next/image domains.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover transition duration-200 group-hover:scale-[1.04]"
      />
    );
  }
  return (
    <Image src={src} alt={alt} fill sizes="(min-width: 1280px) 10vw, 45vw" className="object-cover transition duration-200 group-hover:scale-[1.04]" />
  );
}

export type HomeSnapsPanelLayout = "default" | "dashboard";

const DASHBOARD_SNAP_COUNT = 6;

function getViews(snap: Snap) {
  return snap.views ?? snap.likes + snap.comments * 4;
}

function fillToCount(items: Snap[], count: number): Snap[] {
  if (items.length === 0) {
    return [];
  }
  if (items.length >= count) {
    return items.slice(0, count);
  }
  const next = [...items];
  let i = 0;
  while (next.length < count) {
    next.push(items[i % items.length] as Snap);
    i += 1;
  }
  return next;
}

export function HomeSnapsPanel({
  layout = "default",
}: {
  layout?: HomeSnapsPanelLayout;
}) {
  const { t } = useI18n();
  const [catalog, setCatalog] = useState<Snap[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCatalog = useCallback(async () => {
    const session = getStoredAuthSession();
    const loader = session?.accessToken ? listMyPosts(session.accessToken, "SNAP", 24) : listPosts("SNAP", 24);
    const rows = await loader;
    setCatalog(rows.map(apiPostToSnap));
  }, []);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async feed hydration
    void loadCatalog()
      .catch(() => {
        if (!cancelled) {
          setCatalog([]);
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
  }, [loadCatalog]);

  const catalogIdsKey = useMemo(() => catalog.map((row) => row.id).join("\0"), [catalog]);

  useEffect(() => {
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      return;
    }
    const unsubFeed = subscribePostsFeedChannel(session.accessToken, "SNAP", () => {
      void loadCatalog().catch(() => {});
    });
    const unsubProfile = subscribeUserProfileUpdates(session.accessToken, (payload) => {
      const user = payload.user;
      if (!user?.id) {
        return;
      }
      setCatalog((prev) =>
        prev.map((snap) =>
          snap.authorId === user.id
            ? {
                ...snap,
                author: user.displayName?.trim() || user.username,
                authorUsername: user.username,
                avatar: resolveUserAvatarUrl(user.avatarUrl),
              }
            : snap,
        ),
      );
    });
    const unsubEngagement = watchPostsEngagement(session.accessToken, catalog.map((row) => row.id), (payload) => {
      if (!payload.postId) {
        return;
      }
      setCatalog((prev) =>
        prev.map((snap) =>
          snap.id === payload.postId
            ? {
                ...snap,
                likes: typeof payload.likes === "number" ? payload.likes : snap.likes,
                comments: typeof payload.comments === "number" ? payload.comments : snap.comments,
                views: typeof payload.views === "number" ? payload.views : snap.views,
              }
            : snap,
        ),
      );
    });
    return () => {
      unsubFeed();
      unsubProfile();
      unsubEngagement();
    };
  }, [catalogIdsKey, loadCatalog]);

  const isDashboard = layout === "dashboard";
  const tileCount = isDashboard ? DASHBOARD_SNAP_COUNT : 4;
  const popularSlots = useMemo(() => {
    if (loading && catalog.length === 0) {
      return Array.from({ length: tileCount }, (_, index) => ({ kind: "skeleton" as const, key: `popular-sk-${index}` }));
    }
    if (!loading && catalog.length === 0) {
      return Array.from({ length: tileCount }, (_, index) => ({ kind: "empty" as const, key: `popular-empty-${index}` }));
    }
    const ranked = [...catalog].sort((left, right) => getViews(right) - getViews(left));
    return fillToCount(ranked, tileCount).map((snap, index) => ({ kind: "snap" as const, snap, key: `popular-${snap.id}-${index}` }));
  }, [catalog, loading, tileCount]);

  return (
    <Panel
      className={cx(
        "p-[var(--panel-pad)]",
        isDashboard && "suzi-panel--home suzi-home-row1-panel flex min-h-0 w-full flex-col overflow-hidden",
        !isDashboard && "suzi-panel--home",
      )}
    >
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
              <path d="M4 8a2 2 0 0 1 2-2h2l1.2-1.6A2 2 0 0 1 10.8 4h2.4a2 2 0 0 1 1.6.8L16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
              <circle cx="12" cy="13" r="3.2" />
            </svg>
          </span>
          <h2 className={panelTitle}>{t("home.snaps")}</h2>
        </div>

        <Link href="/app/snaps" className={panelLink}>
          {t("home.openFeed")}
        </Link>
      </div>

      <div
        className={cx(
          "grid gap-2",
          isDashboard
            ? "mt-3 min-h-0 flex-1 grid-cols-2 grid-rows-3 overflow-hidden"
            : "mt-3 min-h-[12rem] shrink-0 grid-cols-2 grid-rows-2",
        )}
      >
        {popularSlots.map((slot) => {
          if (slot.kind === "skeleton") {
            return (
              <div
                key={slot.key}
                className={cx(
                  homeSnapTile,
                  "relative min-h-0 overflow-hidden rounded-[0.78rem] border",
                  isDashboard && "h-full w-full",
                )}
              >
                <div className="absolute inset-0 animate-pulse bg-white/8" />
                <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between">
                  <span className="h-3 w-9 rounded bg-white/10" />
                  <span className="h-3 w-7 rounded bg-white/10" />
                </div>
              </div>
            );
          }
          if (slot.kind === "empty") {
            return (
              <div
                key={slot.key}
                className={cx(
                  homeSnapTile,
                  "relative min-h-0 overflow-hidden rounded-[0.78rem] border border-dashed border-cyan-300/22",
                  isDashboard && "h-full w-full",
                )}
              >
                <div className="flex h-full w-full items-center justify-center">
                  <span className={cx(listEmpty, "text-cyan-100/55")}>{t("home.noSnap")}</span>
                </div>
                <div className={cx(listL3, "absolute inset-x-1.5 bottom-1.5 flex items-center justify-between font-medium text-cyan-100/40")}>
                  <span>—</span>
                  <span>—</span>
                </div>
              </div>
            );
          }
          const { snap } = slot;
          return (
            <Link
              key={slot.key}
              href={`/app/snaps?focus=${encodeURIComponent(snap.id)}`}
              className={cx(
                homeSnapTile,
                "group relative min-h-0 overflow-hidden rounded-[0.78rem] border",
                isDashboard && "h-full w-full",
              )}
            >
              <div className="absolute inset-0">
                <SnapTileMedia src={snap.image} alt={snap.title} />
                <div className="suzi-home-snap-scrim absolute inset-0" />
              </div>
              <div className={cx(listL3, "absolute inset-x-1.5 bottom-1.5 flex items-center justify-between font-semibold text-white")}>
                <span className={cx(homeStatPill, "gap-1 px-1.5 py-0.5")}>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                  {getViews(snap)}
                </span>
                <span className={cx(homeStatPill, "gap-1 px-1.5 py-0.5 text-pink-100")}>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-3 w-3"
                    fill="currentColor"
                  >
                    <path d="M12 21s-7-4.7-9.5-8c-2-2.7-.7-7 3-7 2 0 3.3 1 4.5 2.5C11.2 7 12.5 6 14.5 6c3.7 0 5 4.3 3 7C19 16.3 12 21 12 21Z" />
                  </svg>
                  {snap.likes}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}
