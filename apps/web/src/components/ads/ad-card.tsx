"use client";

import { useCallback, useState } from "react";
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
  const [hasAdContent, setHasAdContent] = useState(false);
  const handleFillChange = useCallback((filled: boolean) => {
    setHasAdContent(filled);
  }, []);

  if (!isAdSlotActive(slot)) {
    return null;
  }

  const showAdContent = active && hasAdContent;

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
      <div className="relative flex w-full max-w-[22rem] items-center justify-center overflow-visible">
        {active && !showAdContent ? (
          <div className="pointer-events-none h-[250px] w-[300px] max-w-full rounded-[1rem] border border-white/30 bg-[linear-gradient(110deg,rgba(255,255,255,0.12),rgba(255,255,255,0.34),rgba(255,255,255,0.12))] bg-[length:220%_100%] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]" />
        ) : null}
        {active ? (
          <ExoClickZone
            zoneId={getAdZoneId(slot)}
            insClassName={getAdInsClass(slot)}
            refreshKey={active}
            hideUntilFilled
            onFillChange={handleFillChange}
            className={cx(
              "relative z-[1] block max-w-full overflow-visible text-center transition-opacity duration-200",
              showAdContent
                ? "min-h-0 min-w-0"
                : "absolute left-1/2 top-1/2 min-h-[250px] min-w-[300px] -translate-x-1/2 -translate-y-1/2",
            )}
          />
        ) : null}
      </div>
    </div>
  );
}
