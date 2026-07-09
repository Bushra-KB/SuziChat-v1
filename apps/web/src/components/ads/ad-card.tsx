"use client";

import { type FeedSlot, getAdZoneId, isAdSlotActive } from "@/lib/ads-config";
import { cx } from "@/components/ui/suzi-primitives";
import { ExoClickZone } from "./exoclick-zone";

// Full-bleed ad card sized like a reel/snap/dating card (9:16). Used by the feed
// tickets (A4–A6) as the "every 20 items" ad slide. Renders nothing when its
// slot is inactive. Labelled "Sponsored" so it is clearly distinguishable from
// real content (store requirement + good UX).
export function AdCard({
  slot,
  className,
}: {
  slot: FeedSlot;
  className?: string;
}) {
  if (!isAdSlotActive(slot)) {
    return null;
  }

  return (
    <div
      data-ad-slot={slot}
      className={cx(
        "suzi-ad-card relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.45rem] border border-cyan-300/20 bg-[rgba(6,9,28,0.6)]",
        className,
      )}
    >
      <span className="pointer-events-none absolute left-2 top-2 z-[1] rounded-full bg-black/50 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-white/70">
        Sponsored
      </span>
      <ExoClickZone zoneId={getAdZoneId(slot)} className="flex items-center justify-center" />
    </div>
  );
}
