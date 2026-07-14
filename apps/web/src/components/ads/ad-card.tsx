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
        "suzi-ad-card relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.45rem] border border-cyan-200/45 bg-[linear-gradient(180deg,rgba(217,240,255,0.82),rgba(115,179,226,0.44))] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.38)]",
        className,
      )}
    >
      <span className="pointer-events-none absolute left-2 top-2 z-[2] rounded-full bg-slate-950/70 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-white/78">
        Sponsored
      </span>
      <div className="relative flex min-h-[250px] w-full max-w-[22rem] items-center justify-center overflow-visible">
        {active ? (
          <ExoClickZone
            zoneId={getAdZoneId(slot)}
            insClassName={getAdInsClass(slot)}
            refreshKey={active}
            className="relative z-[1] block max-w-full overflow-visible text-center"
          />
        ) : null}
      </div>
    </div>
  );
}
