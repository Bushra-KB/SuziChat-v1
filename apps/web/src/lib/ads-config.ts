// Central config for ExoClick ad zones.
//
// Only Zone IDs live here (via public env vars) — never the ExoClick account
// credentials. Create the zones in the ExoClick dashboard, then set the IDs in
// the environment (see .env.example). Any slot with a missing/empty Zone ID
// simply renders nothing, so the app is safe to run before the zones exist.
//
// NOTE: Next.js inlines `process.env.NEXT_PUBLIC_*` only when accessed as a
// static property (not `process.env[dynamicKey]`), so every var is referenced
// explicitly below.

export type AdSlot =
  | "sticky"
  | "feed-reels"
  | "feed-snaps"
  | "feed-dating";

export type FeedSlot = Extract<AdSlot, "feed-reels" | "feed-snaps" | "feed-dating">;

/** Global kill switch. Set NEXT_PUBLIC_ADS_ENABLED=true to turn ads on. */
export const adsEnabled =
  (process.env.NEXT_PUBLIC_ADS_ENABLED ?? "").trim().toLowerCase() === "true";

/** ExoClick / MagSrv ad-provider script (loaded once by ExoClickProvider). */
export const EXOCLICK_PROVIDER_SRC = "https://a.magsrv.com/ad-provider.js";

/**
 * ExoClick marker class for the ad <ins> element. The suffix encodes the ad
 * FORMAT, so it differs per format: display banners (incl. the feed zones) use
 * `eas6a97888e2`, while the native Sticky Banner format uses `eas6a97888e17`.
 * Always copy the class from the zone's invocation code in the ExoClick panel.
 */
export const EXOCLICK_INS_CLASS = "eas6a97888e2";
export const EXOCLICK_STICKY_INS_CLASS = "eas6a97888e17";

const ZONE_IDS: Record<AdSlot, string> = {
  sticky: (process.env.NEXT_PUBLIC_EXOCLICK_ZONE_STICKY ?? "").trim(),
  "feed-reels": (process.env.NEXT_PUBLIC_EXOCLICK_ZONE_REELS ?? "").trim(),
  "feed-snaps": (process.env.NEXT_PUBLIC_EXOCLICK_ZONE_SNAPS ?? "").trim(),
  "feed-dating": (process.env.NEXT_PUBLIC_EXOCLICK_ZONE_DATING ?? "").trim(),
};

/** Zone ID for a slot, or "" when not configured. */
export function getAdZoneId(slot: AdSlot): string {
  return ZONE_IDS[slot];
}

/** True when ads are on AND this slot has a configured Zone ID. */
export function isAdSlotActive(slot: AdSlot): boolean {
  return adsEnabled && ZONE_IDS[slot].length > 0;
}
