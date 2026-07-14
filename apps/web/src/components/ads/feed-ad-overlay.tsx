"use client";

import type { FeedSlot } from "@/lib/ads-config";
import {
  getAdInsClass,
  getAdZoneId,
  isAdSlotActive,
} from "@/lib/ads-config";
import { cx } from "@/components/ui/suzi-primitives";
import { ExoClickZone } from "./exoclick-zone";

export function FeedAdOverlay({
  slot,
  accent = "cyan",
}: {
  slot: FeedSlot;
  accent?: "cyan" | "fuchsia";
}) {
  if (!isAdSlotActive(slot)) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[70] flex items-center justify-center">
      <div
        className="pointer-events-auto relative flex h-[250px] w-[300px] max-w-[86vw] items-center justify-center overflow-visible rounded-[0.75rem]"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onPointerCancel={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        <span className="pointer-events-none absolute -top-7 left-0 z-[2] rounded-full bg-slate-950/70 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-white/78">
          Sponsored
        </span>
        <div
          className={cx(
            "relative flex h-[250px] w-[300px] max-w-full items-center justify-center overflow-hidden rounded-[0.75rem]",
            accent === "fuchsia"
              ? "shadow-[0_0_36px_rgba(232,77,255,0.24)]"
              : "shadow-[0_0_36px_rgba(0,229,255,0.24)]",
          )}
        >
          <ExoClickZone
            zoneId={getAdZoneId(slot)}
            insClassName={getAdInsClass(slot)}
            className="relative z-[1] block min-h-[250px] min-w-[300px] max-w-full overflow-hidden text-center"
            serveDelayFrames={2}
            debugName={slot}
          />
        </div>
      </div>
    </div>
  );
}
