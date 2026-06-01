"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, cx } from "@/components/ui/suzi-primitives";
import {
  homeInset,
  homePanelHeader,
  homePanelIcon,
  homeRow,
  listEmpty,
  listL1,
  listL3,
  listMeta,
  panelLink,
  panelTitle,
} from "@/components/app/home-typography";
import { getStoredAuthSession } from "@/lib/auth-client";
import { listMyPosts, listPosts } from "@/lib/posts-client";
import { resolveUserAvatarUrl } from "@/lib/avatar-url";
import { subscribePostsFeedChannel, subscribeUserProfileUpdates, watchPostsEngagement } from "@/lib/realtime-feed";
import { apiPostToReel } from "@/lib/post-ui-mappers";
import { useI18n } from "@/lib/i18n";
import type { Reel } from "@/lib/v1-mock-data";

function formatCompact(value: number) {
  if (value >= 1000) {
    const compact = value / 1000;
    return `${compact % 1 === 0 ? compact.toFixed(0) : compact.toFixed(1)}K`;
  }

  return String(value);
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatTimeAgo(iso: string | undefined) {
  if (!iso) {
    return "";
  }
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(diffMs) || diffMs < 0) {
      return "";
    }
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60) {
      return `${Math.max(1, minutes)}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

function reelDurationSeconds(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i)) % 997;
  }
  return 10 + (hash % 31);
}

function getViews(reel: Reel) {
  return reel.views ?? reel.likes + reel.comments * 4;
}

const MAX_REELS = 6;

export function HomeReelsPanel() {
  const { t } = useI18n();
  const [catalog, setCatalog] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCatalog = useCallback(async () => {
    const session = getStoredAuthSession();
    const loader = session?.accessToken ? listMyPosts(session.accessToken, "REEL", 24) : listPosts("REEL", 24);
    const rows = await loader;
    setCatalog(rows.map(apiPostToReel));
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
    const unsubFeed = subscribePostsFeedChannel(session.accessToken, "REEL", () => {
      void loadCatalog().catch(() => {});
    });
    const unsubProfile = subscribeUserProfileUpdates(session.accessToken, (payload) => {
      const user = payload.user;
      if (!user?.id) {
        return;
      }
      setCatalog((prev) =>
        prev.map((reel) =>
          reel.authorId === user.id
            ? {
                ...reel,
                author: user.displayName?.trim() || user.username,
                authorUsername: user.username,
                handle: `@${user.username}`,
                avatar: resolveUserAvatarUrl(user.avatarUrl),
              }
            : reel,
        ),
      );
    });
    const unsubEngagement = watchPostsEngagement(session.accessToken, catalog.map((row) => row.id), (payload) => {
      if (!payload.postId) {
        return;
      }
      setCatalog((prev) =>
        prev.map((reel) =>
          reel.id === payload.postId
            ? {
                ...reel,
                likes: typeof payload.likes === "number" ? payload.likes : reel.likes,
                comments: typeof payload.comments === "number" ? payload.comments : reel.comments,
                views: typeof payload.views === "number" ? payload.views : reel.views,
              }
            : reel,
        ),
      );
    });
    return () => {
      unsubFeed();
      unsubProfile();
      unsubEngagement();
    };
  }, [catalogIdsKey, loadCatalog]);

  const reelRows = useMemo(() => {
    if (loading && catalog.length === 0) {
      return Array.from({ length: MAX_REELS }, (_, index) => ({ kind: "skeleton" as const, key: `reel-sk-${index}` }));
    }
    if (!loading && catalog.length === 0) {
      return [{ kind: "empty" as const, key: "reel-empty" }];
    }
    const ranked = [...catalog].sort((left, right) => getViews(right) - getViews(left));
    return ranked.slice(0, MAX_REELS).map((reel) => ({ kind: "reel" as const, reel, key: reel.id }));
  }, [catalog, loading]);

  return (
    <Panel className="suzi-panel--home flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden p-[var(--panel-pad)]">
      <div className={cx(homePanelHeader, "flex shrink-0 items-center justify-between gap-2.5")}>
        <div className="flex items-center gap-2.5">
          <span className={homePanelIcon}>
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
              <path d="M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
              <path d="m10 9 5 3-5 3V9Z" />
            </svg>
          </span>
          <h2 className={panelTitle}>{t("home.reels")}</h2>
        </div>

        <Link href="/app/reels" className={panelLink}>
          {t("home.openFeed")}
        </Link>
      </div>

      <div className={cx(homeInset, "suzi-scrollbar mt-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-1")}>
        {reelRows.map((row, index) => {
          if (row.kind === "skeleton") {
            return (
              <div
                key={row.key}
                className={cx(homeRow, "flex shrink-0 items-center gap-2.5 px-0.5 py-1")}
              >
                <div className="h-[3.15rem] w-[5.25rem] shrink-0 animate-pulse rounded-[0.65rem] bg-white/10" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
                  <div className="h-2.5 w-32 animate-pulse rounded bg-white/8" />
                </div>
              </div>
            );
          }
          if (row.kind === "empty") {
            return (
              <p key={row.key} className={cx(listEmpty, "px-2 py-6 text-center text-cyan-100/60")}>
                {t("home.noReels")}
              </p>
            );
          }

          const { reel } = row;
          const duration = formatDuration(reelDurationSeconds(reel.id));
          const timeAgo = formatTimeAgo(reel.createdAt);

          return (
            <Link
              key={row.key}
              href={`/app/reels?focus=${encodeURIComponent(reel.id)}`}
              className={cx(homeRow, "group flex shrink-0 items-center gap-2.5 px-0.5 py-1")}
            >
              <span className="suzi-home-reel-thumb relative h-[3.15rem] w-[5.25rem] shrink-0 overflow-hidden rounded-[0.65rem] border">
                <video
                  src={reel.video}
                  className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                  muted
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                />
                <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,26,0.08),rgba(4,8,26,0.55))]" />
                <span className="pointer-events-none absolute left-1/2 top-1/2 inline-flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/28 bg-black/45 text-white">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="ml-0.5 h-2.5 w-2.5" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
                <span className={cx(listMeta, "absolute bottom-1 left-1 rounded bg-black/55 px-1 py-0.5 font-medium text-white")}>
                  {duration}
                </span>
              </span>

              <span className="min-w-0 flex-1">
                <span className={cx(listL1, "block truncate font-semibold text-white")}>{reel.author}</span>
                <span className={cx(listL3, "mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-cyan-100/72")}>
                  <span className="inline-flex items-center gap-1">
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
                    {formatCompact(getViews(reel))}
                  </span>
                  <span className="inline-flex items-center gap-1 text-pink-100/90">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                      <path d="M12 21s-7-4.7-9.5-8c-2-2.7-.7-7 3-7 2 0 3.3 1 4.5 2.5C11.2 7 12.5 6 14.5 6c3.7 0 5 4.3 3 7C19 16.3 12 21 12 21Z" />
                    </svg>
                    {formatCompact(reel.likes)}
                  </span>
                  {timeAgo ? <span>{timeAgo}</span> : null}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}
