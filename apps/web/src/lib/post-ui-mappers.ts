import type { ApiPost } from "@/lib/posts-client";
import type { Reel, Snap } from "@/lib/v1-mock-data";

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

export function avatarForUsername(username: string) {
  const n = stableHash(username);
  return `/ppic/ppic${(n % 6) + 1}.jpeg`;
}

export function apiPostToSnap(p: ApiPost): Snap {
  const author = "Bushra";
  const tone = SNAP_TONES[stableHash(p.id) % SNAP_TONES.length];
  const vis = p.visibility?.toLowerCase() === "friends" ? "Friends" : "Public";

  return {
    id: p.id,
    author,
    avatar: "/ppic/ppic1.jpeg",
    title: p.title?.trim() || "Snap",
    caption: p.caption?.trim() || "",
    visibility: vis as Snap["visibility"],
    likes: 0,
    comments: 0,
    tone,
    image: p.mediaUrl,
  };
}

export function apiPostToReel(p: ApiPost): Reel {
  const author = "Bushra";
  const tone = REEL_TONES[stableHash(p.id) % REEL_TONES.length];

  return {
    id: p.id,
    author,
    handle: "@bushra",
    title: p.title?.trim() || "Reel",
    avatar: "/ppic/ppic1.jpeg",
    caption: p.caption?.trim() || "",
    views: 0,
    likes: 0,
    comments: 0,
    video: p.mediaUrl,
    tone,
  };
}
