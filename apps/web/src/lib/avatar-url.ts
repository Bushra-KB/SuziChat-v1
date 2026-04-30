/** Fallback when no avatar is set (matches legacy UI assets). */
export const DEFAULT_USER_AVATAR = "/ppic/ppic1.jpeg";

/** Normalize API/session avatar URL for display (never empty). */
export function resolveUserAvatarUrl(url: string | null | undefined): string {
  const u = url?.trim();
  return u && u.length > 0 ? u : DEFAULT_USER_AVATAR;
}
