"use client";

import { useState } from "react";
import { getAdZoneId, isAdSlotActive } from "@/lib/ads-config";
import { cx } from "@/components/ui/suzi-primitives";
import { ExoClickZone } from "./exoclick-zone";

// A small anchored ad bar pinned to the bottom of the viewport (above the mobile
// nav on phones, at the bottom on desktop). Works on all screen sizes with a
// compact 320x50 creative. Includes a close button so users can dismiss it for
// the session. Positioning lives in globals.css (.suzi-sticky-ad).
export function StickyBottomAd() {
  const [closed, setClosed] = useState(false);

  if (!isAdSlotActive("sticky") || closed) {
    return null;
  }

  return (
    <div
      className="suzi-sticky-ad pointer-events-none fixed inset-x-0 z-[90] flex justify-center px-2"
      data-ad-slot="sticky"
    >
      <div
        className={cx(
          "pointer-events-auto relative flex items-center justify-center overflow-hidden rounded-t-[0.9rem]",
          "border border-white/10 border-b-0 bg-[rgba(8,12,30,0.92)] shadow-[0_-6px_20px_rgba(4,6,20,0.45)] backdrop-blur-md",
          "h-[3.5rem] w-full max-w-[420px]",
        )}
      >
        <span className="pointer-events-none absolute left-1 top-0.5 z-[1] rounded-sm bg-black/40 px-1 text-[0.5rem] font-medium uppercase tracking-wide text-white/55">
          Ad
        </span>
        <ExoClickZone zoneId={getAdZoneId("sticky")} />
        <button
          type="button"
          onClick={() => setClosed(true)}
          aria-label="Close ad"
          className="absolute right-1 top-1 z-[2] inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white/80 transition hover:border-white/45 hover:text-white"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
