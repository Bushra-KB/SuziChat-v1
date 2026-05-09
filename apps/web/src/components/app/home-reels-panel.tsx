"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Panel } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import { listMyPosts, listPosts } from "@/lib/posts-client";
import { apiPostToReel } from "@/lib/post-ui-mappers";
import type { Reel } from "@/lib/v1-mock-data";

function formatCompact(value: number) {
  if (value >= 1000) {
    const compact = value / 1000;
    return `${compact % 1 === 0 ? compact.toFixed(0) : compact.toFixed(1)}K`;
  }

  return String(value);
}

function getViews(reel: Reel) {
  return reel.views ?? reel.likes + reel.comments * 4;
}

function fillToCount(items: Reel[], count: number): Reel[] {
  if (items.length === 0) {
    return [];
  }
  if (items.length >= count) {
    return items.slice(0, count);
  }
  const next = [...items];
  let i = 0;
  while (next.length < count) {
    next.push(items[i % items.length] as Reel);
    i += 1;
  }
  return next;
}

export function HomeReelsPanel() {
  const [catalog, setCatalog] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const session = getStoredAuthSession();
    const loader = session?.accessToken ? listMyPosts(session.accessToken, "REEL", 40) : listPosts("REEL", 40);
    void loader
      .then((rows) => {
        if (cancelled) {
          return;
        }
        setCatalog(rows.map(apiPostToReel));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tileCount = 4;
  const reelSlots = useMemo(() => {
    if (loading && catalog.length === 0) {
      return Array.from({ length: tileCount }, (_, index) => ({ kind: "skeleton" as const, key: `reel-sk-${index}` }));
    }
    if (!loading && catalog.length === 0) {
      return Array.from({ length: tileCount }, (_, index) => ({ kind: "empty" as const, key: `reel-empty-${index}` }));
    }
    const ranked = [...catalog].sort((left, right) => getViews(right) - getViews(left));
    return fillToCount(ranked, tileCount).map((reel, index) => ({ kind: "reel" as const, reel, key: `reel-${reel.id}-${index}` }));
  }, [catalog, loading]);

  return (
    <Panel className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden p-[var(--panel-pad)]">
      <div className="flex shrink-0 items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-[0.7rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-fuchsia-100/92 shadow-[0_0_12px_rgba(157,78,221,0.28)]">
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
          <h2 className="whitespace-nowrap text-[var(--fs-xl)] font-bold tracking-tight text-white">
            Suzi Reels
          </h2>
        </div>

        <Link
          href="/app/reels"
          className="shrink-0 whitespace-nowrap text-[var(--fs-2xs)] font-medium text-fuchsia-200/90 transition hover:text-fuchsia-100"
        >
          Open feed
        </Link>
      </div>

      <div className="mt-3 grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 overflow-hidden">
        {reelSlots.map((slot) => {
          if (slot.kind === "skeleton") {
            return (
              <div
                key={slot.key}
                className="relative min-h-0 overflow-hidden rounded-[0.78rem] border border-fuchsia-300/16 bg-[rgba(28,16,72,0.45)]"
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
                className="relative min-h-0 overflow-hidden rounded-[0.78rem] border border-dashed border-cyan-300/22 bg-[rgba(20,13,62,0.35)]"
              >
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-[var(--fs-2xs)] text-cyan-100/55">No reel</span>
                </div>
                <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between text-[var(--fs-2xs)] font-medium text-cyan-100/40">
                  <span>—</span>
                  <span>—</span>
                </div>
              </div>
            );
          }
          const { reel } = slot;
          return (
            <Link
              key={slot.key}
              href={`/app/reels?focus=${encodeURIComponent(reel.id)}`}
              className="group relative min-h-0 overflow-hidden rounded-[0.78rem] border border-fuchsia-300/24 bg-[rgba(28,16,72,0.7)]"
            >
              <video
                src={reel.video}
                className="absolute inset-0 h-full w-full object-cover transition duration-200 group-hover:scale-[1.04]"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-label={`${reel.title} preview`}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,26,0.12),rgba(4,8,26,0.66))]" />
              <span className="pointer-events-none absolute left-1.5 top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/24 bg-black/40 text-white/92">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="currentColor">
                  <path d="m8 6.5 9 5.5-9 5.5v-11Z" />
                </svg>
              </span>
              <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between text-[var(--fs-2xs)] font-semibold text-white">
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
                <span className="inline-flex items-center gap-1 text-pink-100">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-3 w-3"
                    fill="currentColor"
                  >
                    <path d="M12 21s-7-4.7-9.5-8c-2-2.7-.7-7 3-7 2 0 3.3 1 4.5 2.5C11.2 7 12.5 6 14.5 6c3.7 0 5 4.3 3 7C19 16.3 12 21 12 21Z" />
                  </svg>
                  {formatCompact(reel.likes)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}
