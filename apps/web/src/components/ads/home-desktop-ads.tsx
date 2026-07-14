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
      />
    </div>
  );
}

export function HomeInstantMessageAd() {
  if (!isAdSlotActive("instant-message")) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed right-[max(1rem,var(--shell-pad-x,1rem))] z-[95] hidden xl:block"
      data-ad-slot="instant-message"
      style={{
        bottom:
          "calc(var(--shell-footer-h, 0.6rem) + 3.85rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="pointer-events-auto h-[100px] w-[300px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[0.75rem]">
        <ExoClickIframeZone
          zoneId={getAdZoneId("instant-message")}
          insClassName={getAdInsClass("instant-message")}
          className="h-[100px] w-[300px] max-w-full overflow-hidden"
          title="Homepage instant message sponsored ad"
        />
      </div>
    </div>
  );
}
