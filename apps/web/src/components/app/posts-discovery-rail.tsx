"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { listSection, panelTitle } from "@/components/app/app-typography";
import { Panel, cx } from "@/components/ui/suzi-primitives";
import type { PostKind } from "@/lib/posts-client";

export type PostsDiscoveryItem = {
  id: string;
  mediaUrl: string;
  title: string;
  author: string;
  authorId?: string;
  views: number;
  likes: number;
  kind: "video" | "image";
};

function formatCompact(value: number) {
  if (value >= 1_000_000) {
    const compact = value / 1_000_000;
    return `${compact % 1 === 0 ? compact.toFixed(0) : compact.toFixed(1)}M`;
  }
  if (value >= 1000) {
    const compact = value / 1000;
    return `${compact % 1 === 0 ? compact.toFixed(0) : compact.toFixed(1)}K`;
  }
  return String(value);
}

function engagementScore(item: PostsDiscoveryItem) {
  return item.views + item.likes * 4;
}

function RailCard({
  item,
  active,
  onSelect,
  focusHref,
}: {
  item: PostsDiscoveryItem;
  active: boolean;
  onSelect: (id: string) => void;
  focusHref: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={cx(
        "suzi-feed-rail-card group flex w-full gap-2 rounded-[0.75rem] border p-1.5 text-left transition",
        active
          ? "border-fuchsia-300/45 bg-fuchsia-500/14 shadow-[0_0_12px_rgba(255,45,167,0.18)]"
          : "border-cyan-300/18 bg-[rgba(36,56,112,0.28)] hover:border-cyan-300/32 hover:bg-[rgba(48,72,140,0.38)]",
      )}
    >
      <span className="relative block h-[3.25rem] w-[2.4rem] shrink-0 overflow-hidden rounded-[0.55rem] border border-cyan-300/22 bg-[rgba(24,40,88,0.5)]">
        {item.kind === "video" ? (
          <video
            src={item.mediaUrl}
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
            aria-hidden
          />
        ) : (
          <Image src={item.mediaUrl} alt="" fill sizes="40px" className="object-cover" />
        )}
        {item.kind === "video" ? (
          <span
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[rgba(8,12,32,0.28)]"
            aria-hidden
          >
            <span className="rounded-full border border-white/35 bg-black/35 px-1 py-0.5 text-[0.45rem] font-semibold uppercase tracking-[0.08em] text-white">
              Reel
            </span>
          </span>
        ) : null}
      </span>
      <span className="min-w-0 flex-1 py-0.5">
        <span className="suzi-home-list-l1 block truncate font-semibold text-white">{item.title}</span>
        <span className="suzi-home-list-l2 mt-0.5 block truncate">{item.author}</span>
        <span className="suzi-home-list-l3 mt-0.5 flex items-center gap-1.5">
          <span>{formatCompact(item.views)} views</span>
          <span aria-hidden>·</span>
          <span>{formatCompact(item.likes)} likes</span>
        </span>
      </span>
      <Link
        href={focusHref}
        onClick={(event) => event.stopPropagation()}
        className="suzi-home-list-l3 shrink-0 self-center px-1 opacity-0 transition group-hover:opacity-100 hover:text-cyan-100"
        aria-label={`Open ${item.title}`}
      >
        ↗
      </Link>
    </button>
  );
}

function RailSection({
  label,
  items,
  activeId,
  basePath,
  onSelect,
}: {
  label: string;
  items: PostsDiscoveryItem[];
  activeId: string | null;
  basePath: string;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className={cx(listSection, "px-0.5 tracking-[0.14em]")}>{label}</p>
      <div className="space-y-1.5">
        {items.map((item) => (
          <RailCard
            key={item.id}
            item={item}
            active={item.id === activeId}
            onSelect={onSelect}
            focusHref={`${basePath}?focus=${encodeURIComponent(item.id)}`}
          />
        ))}
      </div>
    </div>
  );
}

export function PostsDiscoveryRail({
  kind,
  items,
  activeId,
  activeAuthorId,
  basePath,
  onSelect,
  className,
}: {
  kind: PostKind;
  items: PostsDiscoveryItem[];
  activeId: string | null;
  activeAuthorId?: string | null;
  basePath: "/app/reels" | "/app/snaps";
  onSelect: (id: string) => void;
  className?: string;
}) {
  const label = kind === "REEL" ? "Reels" : "Snaps";

  const { trending, related } = useMemo(() => {
    const scored = [...items].sort((a, b) => engagementScore(b) - engagementScore(a));
    const trendingList = scored.filter((row) => row.id !== activeId).slice(0, 8);

    let relatedList: PostsDiscoveryItem[] = [];
    if (activeId && activeAuthorId) {
      relatedList = items
        .filter((row) => row.id !== activeId && row.authorId === activeAuthorId)
        .sort((a, b) => engagementScore(b) - engagementScore(a))
        .slice(0, 5);
    }
    if (relatedList.length < 4 && activeId) {
      const relatedByEngagement = scored
        .filter(
          (row) =>
            row.id !== activeId &&
            !relatedList.some((picked) => picked.id === row.id),
        )
        .slice(0, 6 - relatedList.length);
      relatedList = [...relatedList, ...relatedByEngagement];
    }

    return { trending: trendingList, related: relatedList };
  }, [activeAuthorId, activeId, items]);

  return (
    <aside
      className={cx(
        "suzi-feed-discovery-rail flex min-h-0 w-[min(100%,15.5rem)] shrink-0 flex-col",
        className,
      )}
    >
      <Panel className="suzi-panel--home flex h-full min-h-0 flex-col overflow-hidden p-[var(--panel-pad)]">
        <div className="shrink-0 border-b border-cyan-300/14 pb-2">
          <p className={cx(listSection, "tracking-[0.18em]")}>Discover</p>
          <h2 className={cx(panelTitle, "mt-1")}>Popular {label}</h2>
        </div>
        <div className="suzi-thin-scroll mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto pr-0.5">
          {items.length === 0 ? (
            <p className="suzi-home-list-empty text-cyan-100/70">No {label.toLowerCase()} yet.</p>
          ) : (
            <>
              <RailSection
                label="Trending"
                items={trending}
                activeId={activeId}
                basePath={basePath}
                onSelect={onSelect}
              />
              {activeId ? (
                <RailSection
                  label="Related"
                  items={related}
                  activeId={activeId}
                  basePath={basePath}
                  onSelect={onSelect}
                />
              ) : null}
            </>
          )}
        </div>
      </Panel>
    </aside>
  );
}
