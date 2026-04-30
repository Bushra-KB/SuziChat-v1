/** Canonical route for viewing another member's public profile. */
export function publicProfileHref(username: string): string {
  const u = username.trim();
  return `/app/profile/${encodeURIComponent(u)}`;
}

/** Resolve profile URL from reel UI model (API-backed reels include `authorUsername`). */
export function reelAuthorProfileHref(reel: {
  authorUsername?: string;
  handle: string;
}): string {
  const u = reel.authorUsername?.trim() || reel.handle.replace(/^@/, "").trim();
  return publicProfileHref(u || "_");
}

/** Resolve profile URL from snap UI model. */
export function snapAuthorProfileHref(snap: {
  authorUsername?: string;
  author: string;
}): string {
  const u = snap.authorUsername?.trim();
  return u ? publicProfileHref(u) : "/app/snaps";
}
