"use client";

import {
  EXOCLICK_STICKY_INS_CLASS,
  getAdZoneId,
  isAdSlotActive,
} from "@/lib/ads-config";
import { ExoClickZone } from "./exoclick-zone";

// ExoClick's native Sticky Banner zone anchors itself to the bottom of the
// viewport, brings its own close button, is responsive on mobile + desktop, and
// only appears when an ad actually fills (so there's no empty box). We just
// render the zone with the sticky format's marker class and let ExoClick do the
// rest — no custom positioning or chrome here.
export function StickyBottomAd() {
  if (!isAdSlotActive("sticky")) {
    return null;
  }
  return (
    <ExoClickZone
      zoneId={getAdZoneId("sticky")}
      insClassName={EXOCLICK_STICKY_INS_CLASS}
    />
  );
}
