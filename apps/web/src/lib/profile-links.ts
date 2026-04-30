/**
 * Prefer `userId` for deep links from API data (DMs, posts, comments). The
 * account `username` in the database is not the same as the display name; using
 * only a name string in the path often 404s.
 */
export function publicProfileHref(username: string, opts?: { userId?: string }): string {
  const id = opts?.userId?.trim();
  if (id) {
    return `/app/profile/u/${encodeURIComponent(id)}`;
  }
  const u = username.trim();
  if (!u) {
    return "/app";
  }
  return `/app/profile/${encodeURIComponent(u)}`;
}

/** Resolve profile URL from reel UI model (API-backed reels include `authorId` / `authorUsername`). */
export function reelAuthorProfileHref(reel: {
  authorId?: string;
  authorUsername?: string;
  handle: string;
}): string {
  const id = reel.authorId?.trim();
  if (id) {
    return publicProfileHref("", { userId: id });
  }
  const u = reel.authorUsername?.trim() || reel.handle.replace(/^@/, "").trim();
  return publicProfileHref(u || "_");
}

/** Resolve profile URL from snap UI model. */
export function snapAuthorProfileHref(snap: {
  authorId?: string;
  authorUsername?: string;
  author: string;
}): string {
  const id = snap.authorId?.trim();
  if (id) {
    return publicProfileHref("", { userId: id });
  }
  const u = snap.authorUsername?.trim();
  return u ? publicProfileHref(u) : "/app/snaps";
}
