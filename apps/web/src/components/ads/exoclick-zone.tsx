"use client";

import { useEffect, useRef } from "react";
import { EXOCLICK_INS_CLASS, adsEnabled } from "@/lib/ads-config";
import { cx } from "@/components/ui/suzi-primitives";

declare global {
  interface Window {
    // ExoClick's ad-provider reads/writes this queue.
    AdProvider?: Array<Record<string, unknown>>;
  }
}

// Renders a single ExoClick ad zone. The <ins> element carries the zone id and
// the required marker class; pushing `{ serve: {} }` onto window.AdProvider tells
// the (already-loaded) provider script to fill any pending zones. The push runs
// on mount, so client-side navigation and carousel re-mounts request a fresh ad.
export function ExoClickZone({
  zoneId,
  className,
  insClassName = EXOCLICK_INS_CLASS,
  refreshKey,
  serveDelayFrames = 0,
  debugName,
  debugEmptyAfterMs = 2000,
}: {
  zoneId: string;
  className?: string;
  // ExoClick's marker class varies by ad format — pass the one from the zone's
  // invocation code. Defaults to the standard display-banner class.
  insClassName?: string;
  // Change this when a carousel slide becomes active so ExoClick re-checks it at
  // its final, visible size instead of only while it is a side card.
  refreshKey?: string | number | boolean;
  // Some containers need to finish layout before the provider measures them.
  serveDelayFrames?: number;
  debugName?: string;
  debugEmptyAfterMs?: number;
}) {
  const insRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    if (!adsEnabled || !zoneId || typeof window === "undefined") {
      return;
    }
    let cancelled = false;
    const frameIds: number[] = [];
    let debugTimer: number | null = null;

    const serve = () => {
      if (cancelled) {
        return;
      }
      try {
        if (insRef.current) {
          insRef.current.replaceChildren();
        }
        window.AdProvider = window.AdProvider || [];
        window.AdProvider.push({ serve: {} });
      } catch {
        // If the provider script hasn't loaded yet the push still queues safely.
      }

      if (debugName) {
        debugTimer = window.setTimeout(() => {
          const ins = insRef.current;
          if (!ins) {
            return;
          }
          const rect = ins.getBoundingClientRect();
          const hasRenderableContent =
            ins.childElementCount > 0 ||
            Boolean(ins.textContent?.trim()) ||
            Boolean(ins.querySelector("iframe"));
          if (!hasRenderableContent) {
            console.warn("[ads] ExoClick zone remained empty", {
              slot: debugName,
              zoneId,
              insClassName,
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              childElementCount: ins.childElementCount,
            });
          }
        }, debugEmptyAfterMs);
      }
    };

    const queueServe = (framesRemaining: number) => {
      if (framesRemaining <= 0) {
        serve();
        return;
      }
      const frameId = window.requestAnimationFrame(() => {
        queueServe(framesRemaining - 1);
      });
      frameIds.push(frameId);
    };

    queueServe(Math.max(0, Math.floor(serveDelayFrames)));

    return () => {
      cancelled = true;
      frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
      if (debugTimer !== null) {
        window.clearTimeout(debugTimer);
      }
    };
  }, [
    zoneId,
    refreshKey,
    insClassName,
    serveDelayFrames,
    debugName,
    debugEmptyAfterMs,
  ]);

  if (!adsEnabled || !zoneId) {
    return null;
  }

  return (
    <ins
      ref={insRef}
      className={cx(insClassName, className)}
      data-zoneid={zoneId}
    />
  );
}
