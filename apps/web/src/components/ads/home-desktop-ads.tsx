"use client";

import {
  getAdInsClass,
  getAdZoneId,
  isAdSlotActive,
} from "@/lib/ads-config";
import { ExoClickIframeZone } from "./exoclick-iframe-zone";

export function HomeReelsTopAd() {
  if (!isAdSlotActive("home-reels-top")) {
    return null;
  }

  return (
    <div
      className="pointer-events-auto hidden h-[50px] w-[320px] max-w-[32vw] overflow-hidden xl:block"
      data-ad-slot="home-reels-top"
    >
      <ExoClickIframeZone
        zoneId={getAdZoneId("home-reels-top")}
        insClassName={getAdInsClass("home-reels-top")}
        className="h-[50px] w-[320px] max-w-full overflow-hidden"
        title="Homepage reels top sponsored ad"
        blockAdTypes="0"
      />
    </div>
  );
}
