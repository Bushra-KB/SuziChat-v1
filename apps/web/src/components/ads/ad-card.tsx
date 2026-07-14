"use client";

import {
  type FeedSlot,
  getAdInsClass,
  getAdZoneId,
  isAdSlotActive,
} from "@/lib/ads-config";
import { cx } from "@/components/ui/suzi-primitives";
import { ExoClickZone } from "./exoclick-zone";

// Full-bleed ad card sized like a reel/snap/dating card (9:16). Used by the feed
// tickets (A4–A6) as the "every 20 items" ad slide. Renders nothing when its
// slot is inactive. Labelled "Sponsored" so it is clearly distinguishable from
// real content (store requirement + good UX).
export function AdCard({
  slot,
  active = true,
  className,
}: {
  slot: FeedSlot;
  active?: boolean;
  className?: string;
}) {
  if (!isAdSlotActive(slot)) {
    return null;
  }

  return (
    <div
      data-ad-slot={slot}
      className={cx(
        "suzi-ad-card relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.45rem] border border-cyan-200/20 bg-transparent p-4",
        className,
      )}
    >
      <span className="pointer-events-none absolute left-2 top-2 z-[2] rounded-full bg-slate-950/70 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-white/78">
        Sponsored
      </span>
      <div className="relative flex h-[250px] w-[300px] max-w-full items-center justify-center overflow-hidden rounded-[0.9rem]">
        {active ? (
          <ExoClickZone
            zoneId={getAdZoneId(slot)}
            insClassName={getAdInsClass(slot)}
            refreshKey={active}
            className="relative z-[1] block min-h-[250px] min-w-[300px] max-w-full overflow-hidden text-center"
          />
        ) : null}
      </div>
    </div>
  );
}
