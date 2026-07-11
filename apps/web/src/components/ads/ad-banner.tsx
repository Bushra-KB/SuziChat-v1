"use client";

import { type BannerSlot, getAdZoneId, isAdSlotActive } from "@/lib/ads-config";
import { cx } from "@/components/ui/suzi-primitives";
import { ExoClickZone } from "./exoclick-zone";

// Small top/bottom banner strip. Used by the app shell and public pages. Renders
// nothing unless ads are enabled and the slot has a configured Zone ID, so it is
// safe to place unconditionally.
export function AdBanner({
  slot,
  className,
}: {
  slot: BannerSlot;
  className?: string;
}) {
  if (!isAdSlotActive(slot)) {
    return null;
  }

  // The outer element's `display` is left to the caller (e.g. `hidden md:block`)
  // so the shell can control which breakpoints show it. `overflow-hidden` + a
  // caller-supplied height cap ensure an oversized creative can never blow up the
  // layout. The inner flex row centres the ad within the bounded strip.
  return (
    <div
      data-ad-slot={slot}
      className={cx(
        "suzi-ad-banner relative w-full overflow-hidden bg-transparent",
        className,
      )}
    >
      <span className="pointer-events-none absolute left-1 top-0.5 z-[1] rounded-sm bg-black/40 px-1 text-[0.55rem] font-medium uppercase tracking-wide text-white/60">
        Ad
      </span>
      <div className="flex h-full w-full items-center justify-center">
        <ExoClickZone zoneId={getAdZoneId(slot)} />
      </div>
    </div>
  );
}
