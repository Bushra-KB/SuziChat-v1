"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Panel } from "@/components/ui/suzi-primitives";
import { resolvePostMediaUrl } from "@/lib/post-media-url";
import type { ApiPost } from "@/lib/posts-client";

function MediaTile({ post }: { post: ApiPost }) {
  const href = post.kind === "SNAP" ? "/app/snaps" : "/app/reels";
  const src = resolvePostMediaUrl(post.mediaUrl);
  const isVideo = post.kind === "REEL";

  return (
    <Link
      href={href}
      className="group block w-full"
      title={post.caption ?? post.title ?? undefined}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[0.85rem] border border-cyan-300/18 bg-[rgba(18,13,65,0.55)] transition group-hover:border-fuchsia-300/35 group-hover:shadow-[0_0_16px_rgba(255,32,121,0.15)]">
        {isVideo ? (
          <video
            src={src}
            className="absolute inset-0 h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        )}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(8,6,28,0.88)] to-transparent px-2 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-cyan-50/90">
          {post.kind === "SNAP" ? "Snap" : "Reel"}
        </span>
      </div>
    </Link>
  );
}

export function ProfileMediaGallery({
  username,
  snaps,
  reels,
  loading = false,
}: {
  username?: string;
  snaps: ApiPost[];
  reels: ApiPost[];
  loading?: boolean;
}) {
  const preview = useMemo(() => {
    const seen = new Set<string>();
    const merged = [...snaps, ...reels].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const unique: ApiPost[] = [];
    for (const post of merged) {
      if (seen.has(post.id)) {
        continue;
      }
      seen.add(post.id);
      unique.push(post);
      if (unique.length >= 6) {
        break;
      }
    }
    return unique;
  }, [snaps, reels]);

  return (
    <Panel className="w-full p-[var(--panel-pad)]">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[var(--fs-2xs)] font-bold uppercase tracking-[0.22em] text-cyan-100/52">
            Snaps & Reels
          </p>
          <p className="mt-0.5 text-[var(--fs-xs)] text-[var(--text-soft)]">
            {username ? `Recent posts from @${username}` : "Your recent posts"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/snaps"
            className="text-[var(--fs-xs)] font-medium text-fuchsia-200/90 transition hover:text-fuchsia-100"
          >
            Snaps ({snaps.length})
          </Link>
          <span className="text-cyan-100/30">·</span>
          <Link
            href="/app/reels"
            className="text-[var(--fs-xs)] font-medium text-fuchsia-200/90 transition hover:text-fuchsia-100"
          >
            Reels ({reels.length})
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Loading media…</p>
      ) : preview.length === 0 ? (
        <p className="mt-4 rounded-[0.85rem] border border-cyan-300/14 bg-[rgba(18,13,65,0.45)] px-3 py-4 text-sm text-cyan-100/58">
          No snaps or reels to show yet.
        </p>
      ) : (
        <div className="mt-3 grid w-full grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-6">
          {preview.map((post) => (
            <MediaTile key={post.id} post={post} />
          ))}
        </div>
      )}
    </Panel>
  );
}
