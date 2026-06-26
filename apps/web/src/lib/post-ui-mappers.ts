import type { ApiPost } from "@/lib/posts-client";
import type { Reel, Snap } from "@/lib/v1-mock-data";
import { resolveUserAvatarUrl } from "@/lib/avatar-url";
import { resolvePostMediaUrl } from "@/lib/post-media-url";

const SNAP_TONES = [
  "",
  "from-fuchsia-500/10 to-transparent",
  "from-cyan-400/10 to-transparent",
  "from-amber-400/10 to-transparent",
];

const REEL_TONES = [
  "",
  "from-violet-500/12 to-transparent",
  "from-emerald-400/10 to-transparent",
];

export function stableHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function apiPostToSnap(p: ApiPost): Snap {
  const author = p.author.displayName?.trim() || p.author.username;
  const tone = SNAP_TONES[stableHash(p.id) % SNAP_TONES.length];
  const vis = p.visibility?.toLowerCase() === "friends" ? "Friends" : "Public";

  return {
    id: p.id,
    authorId: p.author.id,
    authorUsername: p.author.username,
    author,
    avatar: resolveUserAvatarUrl(p.author.avatarUrl),
    title: p.title?.trim() || "Snap",
    caption: p.caption?.trim() || "",
    visibility: vis as Snap["visibility"],
    views: p._count?.views ?? 0,
    likes: p._count?.likes ?? 0,
    comments: p._count?.comments ?? 0,
    tone,
    image: resolvePostMediaUrl(p.mediaUrl),
    createdAt: p.createdAt,
  };
}

export function apiPostToReel(p: ApiPost): Reel {
  const author = p.author.displayName?.trim() || p.author.username;
  const tone = REEL_TONES[stableHash(p.id) % REEL_TONES.length];
  const vis = p.visibility?.toLowerCase() === "friends" ? "Friends" : "Public";

  return {
    id: p.id,
    authorId: p.author.id,
    authorUsername: p.author.username,
    author,
    handle: `@${p.author.username}`,
    title: p.title?.trim() || "Reel",
    avatar: resolveUserAvatarUrl(p.author.avatarUrl),
    caption: p.caption?.trim() || "",
    visibility: vis as Reel["visibility"],
    views: p._count?.views ?? 0,
    likes: p._count?.likes ?? 0,
    comments: p._count?.comments ?? 0,
    video: resolvePostMediaUrl(p.mediaUrl),
    tone,
    createdAt: p.createdAt,
  };
}
