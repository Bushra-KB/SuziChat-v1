"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  listEmpty,
  listL3,
  listSection,
  panelLink,
  panelTitle,
} from "@/components/app/app-typography";
import { Icon, Panel, cx } from "@/components/ui/suzi-primitives";
import { useI18n } from "@/lib/i18n";
import { resolvePostMediaUrl } from "@/lib/post-media-url";
import type { ApiPost } from "@/lib/posts-client";

function MediaTile({ post, locale }: { post: ApiPost; locale: string }) {
  const href = post.kind === "SNAP" ? "/app/snaps" : "/app/reels";
  const src = resolvePostMediaUrl(post.mediaUrl);
  const isVideo = post.kind === "REEL";

  return (
    <Link
      href={href}
      className="group block w-full"
      title={post.caption ?? post.title ?? undefined}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[0.75rem] border border-cyan-300/18 bg-[rgba(18,13,65,0.55)] transition group-hover:border-fuchsia-300/35 group-hover:shadow-[0_0_16px_rgba(255,32,121,0.15)]">
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
        <span className="pointer-events-none absolute left-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-[0.45rem] border border-white/18 bg-[rgba(10,8,38,0.72)] text-cyan-50/90">
          <Icon
            path={post.kind === "SNAP" ? "M4 7h3l2-2h6l2 2h3v12H4V7Zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" : "M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm4 4 5 3-5 3V9Z"}
            className="h-3 w-3"
          />
        </span>
        <span className={cx(listL3, "pointer-events-none absolute bottom-1.5 right-1.5 rounded-full bg-[rgba(10,8,38,0.72)] px-1.5 py-0.5 font-semibold text-cyan-50/90")}>
          {new Date(post.createdAt).toLocaleDateString(locale, { month: "short", day: "numeric" })}
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
  const { language, t } = useI18n();
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
    <Panel className="suzi-public-panel suzi-public-panel--light suzi-public-media-panel w-full p-[var(--panel-pad)]">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={cx(listSection, "text-cyan-100/58")}>
            {t("profile.media.eyebrow")}
          </p>
          <h2 className={cx(panelTitle, "mt-0.5")}>{t("profile.media.recentPosts")}</h2>
          <p className={cx(listL3, "mt-0.5 text-[var(--text-soft)]")}>
            {username ? `${t("profile.media.recentFrom")} @${username}` : t("profile.media.yourRecent")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/app/snaps"
            className={panelLink}
          >
            {t("profile.stats.snaps")} ({snaps.length})
          </Link>
          <span className="text-cyan-100/30">·</span>
          <Link
            href="/app/reels"
            className={panelLink}
          >
            {t("profile.stats.reels")} ({reels.length})
          </Link>
        </div>
      </div>

      {loading ? (
        <p className={cx(listEmpty, "mt-4 flex-1 text-[var(--text-muted)]")}>{t("profile.media.loading")}</p>
      ) : preview.length === 0 ? (
        <p className={cx(listEmpty, "mt-4 flex-1 rounded-[0.85rem] border border-cyan-300/14 bg-[rgba(18,13,65,0.45)] px-3 py-4 text-cyan-100/58")}>
          {t("profile.media.empty")}
        </p>
      ) : (
        <div className="mt-3 grid w-full flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {preview.map((post) => (
            <MediaTile key={post.id} post={post} locale={language} />
          ))}
        </div>
      )}
    </Panel>
  );
}
