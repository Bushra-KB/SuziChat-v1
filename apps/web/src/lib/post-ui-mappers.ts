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
  const seed = username?.trim() || "user";
  const hash = stableHash(seed);
  const hue = hash % 360;
  const bgA = `hsl(${hue} 72% 42%)`;
  const bgB = `hsl(${(hue + 48) % 360} 70% 36%)`;
  const fg = "hsl(0 0% 96%)";
  const initials = seed
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${bgA}'/><stop offset='100%' stop-color='${bgB}'/></linearGradient></defs><rect width='96' height='96' rx='20' fill='url(#g)'/><text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' fill='${fg}' font-family='Inter,system-ui,sans-serif' font-size='36' font-weight='700'>${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function apiPostToSnap(p: ApiPost): Snap {
  const author = p.author.displayName?.trim() || p.author.username;
  const tone = SNAP_TONES[stableHash(p.id) % SNAP_TONES.length];
  const vis = p.visibility?.toLowerCase() === "friends" ? "Friends" : "Public";

  return {
    id: p.id,
    authorUsername: p.author.username,
    author,
    avatar: p.author.avatarUrl?.trim() || avatarForUsername(p.author.username),
    title: p.title?.trim() || "Snap",
    caption: p.caption?.trim() || "",
    visibility: vis as Snap["visibility"],
    views: p._count?.views ?? 0,
    likes: p._count?.likes ?? 0,
    comments: p._count?.comments ?? 0,
    tone,
    image: p.mediaUrl,
  };
}

export function apiPostToReel(p: ApiPost): Reel {
  const author = p.author.displayName?.trim() || p.author.username;
  const tone = REEL_TONES[stableHash(p.id) % REEL_TONES.length];
  const vis = p.visibility?.toLowerCase() === "friends" ? "Friends" : "Public";

  return {
    id: p.id,
    authorUsername: p.author.username,
    author,
    handle: `@${p.author.username}`,
    title: p.title?.trim() || "Reel",
    avatar: p.author.avatarUrl?.trim() || avatarForUsername(p.author.username),
    caption: p.caption?.trim() || "",
    visibility: vis as Reel["visibility"],
    views: p._count?.views ?? 0,
    likes: p._count?.likes ?? 0,
    comments: p._count?.comments ?? 0,
    video: p.mediaUrl,
    tone,
  };
}
