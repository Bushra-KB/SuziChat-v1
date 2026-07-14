"use client";

import { useEffect, useState } from "react";
import { getAdInsClass, getAdZoneId, isAdSlotActive } from "@/lib/ads-config";
import { ExoClickZone } from "./exoclick-zone";

// A plain 300x50 banner pinned to the bottom of the viewport — above the footer
// on desktop and above the bottom nav on mobile (positioning in globals.css
// .suzi-sticky-ad). No chrome: no box, border, label, or close button. When the
// slot is unfilled the <ins> is empty, so nothing is visible. The outer wrapper
// is pointer-events-none so its empty width never blocks taps on the page; only
// the banner itself is interactive.
export function StickyBottomAd({ refreshKey }: { refreshKey?: string }) {
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRefreshTick((current) => current + 1);
    }, 40_000);

    return () => window.clearInterval(intervalId);
  }, []);

  if (!isAdSlotActive("sticky")) {
    return null;
  }

  const zoneId = getAdZoneId("sticky");
  const serveKey = `${refreshKey ?? "sticky"}:${refreshTick}`;

  return (
    <div
      className="suzi-sticky-ad pointer-events-none fixed inset-x-0 z-[90] flex justify-center"
      data-ad-slot="sticky"
    >
      <div className="pointer-events-auto">
        <ExoClickZone
          key={serveKey}
          zoneId={zoneId}
          insClassName={getAdInsClass("sticky")}
          refreshKey={serveKey}
        />
      </div>
    </div>
  );
}
