"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/suzi-primitives";
import { listPosts } from "@/lib/posts-client";
import { apiPostToReel } from "@/lib/post-ui-mappers";
import { reels as mockReels } from "@/lib/v1-mock-data";
import type { Reel } from "@/lib/v1-mock-data";

function formatCompact(value: number) {
  if (value >= 1000) {
    const compact = value / 1000;
    return `${compact % 1 === 0 ? compact.toFixed(0) : compact.toFixed(1)}K`;
  }

  return String(value);
}

export function HomeReelsPanel() {
  const [rows, setRows] = useState<Reel[]>(() => mockReels);

  useEffect(() => {
    let cancelled = false;
    void listPosts("REEL", 30)
      .then((posts) => {
        if (cancelled || posts.length === 0) {
          return;
        }
        setRows(posts.map(apiPostToReel));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.75rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-fuchsia-100/92 shadow-[0_0_12px_rgba(157,78,221,0.28)]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4.5 w-4.5"
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
          <h2 className="whitespace-nowrap text-[1.35rem] font-bold tracking-tight text-white sm:text-[1.65rem]">
            Suzi Reels
          </h2>
        </div>

        <Link
          href="/app/reels"
          className="shrink-0 whitespace-nowrap text-[0.95rem] font-medium text-fuchsia-200/90 transition hover:text-fuchsia-100 sm:text-[1.05rem]"
        >
          Open feed
        </Link>
      </div>

      <div className="suzi-scrollbar mt-4 h-[22rem] space-y-2 overflow-y-auto pr-1">
        {rows.map((reel) => (
          <Link
            key={reel.id}
            href={`/app/reels?focus=${reel.id}`}
            className="group flex items-center gap-2.5 rounded-[0.95rem] border border-cyan-300/18 bg-[linear-gradient(155deg,rgba(35,20,94,0.72),rgba(18,12,60,0.58))] p-2 transition hover:border-cyan-300/36 hover:bg-[linear-gradient(155deg,rgba(54,33,124,0.76),rgba(22,15,72,0.66))]"
          >
            <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-[0.68rem] border border-cyan-300/20">
              <video
                src={reel.video}
                className="h-full w-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-label={`${reel.title} preview`}
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,30,0.1),rgba(7,10,30,0.36))]" />
              <span className="pointer-events-none absolute inset-0 m-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/24 bg-black/28 text-white/90">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="currentColor"
                >
                  <path d="m8 6.5 9 5.5-9 5.5v-11Z" />
                </svg>
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[1.1rem] font-semibold leading-tight text-white">{reel.title}</p>
              <div className="mt-0.5 flex items-center gap-2 text-[0.96rem] text-cyan-100/72">
                <span className="truncate">{reel.handle}</span>
                <span className="h-1 w-1 rounded-full bg-cyan-100/44" />
                <span className="inline-flex items-center gap-1">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                  {formatCompact(reel.views)}
                </span>
                <span className="inline-flex items-center gap-1 text-pink-100">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="currentColor"
                  >
                    <path d="M12 21s-7-4.7-9.5-8c-2-2.7-.7-7 3-7 2 0 3.3 1 4.5 2.5C11.2 7 12.5 6 14.5 6c3.7 0 5 4.3 3 7C19 16.3 12 21 12 21Z" />
                  </svg>
                  {formatCompact(reel.likes)}
                </span>
              </div>
            </div>

            <span className="inline-flex shrink-0 text-fuchsia-100/62 transition group-hover:text-fuchsia-100/92">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="currentColor"
              >
                <circle cx="12" cy="5" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="12" cy="19" r="1.8" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </Panel>
  );
}
