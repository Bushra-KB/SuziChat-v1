"use client";

import { useEffect, useRef, useState } from "react";
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
  hideUntilFilled = false,
  onFillChange,
}: {
  zoneId: string;
  className?: string;
  // ExoClick's marker class varies by ad format — pass the one from the zone's
  // invocation code. Defaults to the standard display-banner class.
  insClassName?: string;
  // Change this when a carousel slide becomes active so ExoClick re-checks it at
  // its final, visible size instead of only while it is a side card.
  refreshKey?: string | number | boolean;
  hideUntilFilled?: boolean;
  onFillChange?: (filled: boolean) => void;
}) {
  const insRef = useRef<HTMLModElement | null>(null);
  const [isFilled, setIsFilled] = useState(false);

  useEffect(() => {
    if (!adsEnabled || !zoneId) {
      return;
    }
    const element = insRef.current;
    if (!element || typeof MutationObserver === "undefined") {
      return;
    }

    const updateFilledState = () => {
      const filled = Array.from(element.children).some(
        (child) => child.tagName !== "SCRIPT" && child.tagName !== "STYLE",
      );
      setIsFilled(filled);
      onFillChange?.(filled);
    };

    updateFilledState();

    const observer = new MutationObserver(updateFilledState);
    observer.observe(element, { childList: true, subtree: false });

    const checkSoon = window.setTimeout(updateFilledState, 800);
    const checkLater = window.setTimeout(updateFilledState, 2500);

    return () => {
      observer.disconnect();
      window.clearTimeout(checkSoon);
      window.clearTimeout(checkLater);
    };
  }, [zoneId, refreshKey, onFillChange]);

  useEffect(() => {
    if (!adsEnabled || !zoneId || typeof window === "undefined") {
      return;
    }
    try {
      window.AdProvider = window.AdProvider || [];
      window.AdProvider.push({ serve: {} });
    } catch {
      // If the provider script hasn't loaded yet the push still queues safely.
    }
  }, [zoneId, refreshKey]);

  if (!adsEnabled || !zoneId) {
    return null;
  }

  return (
    <ins
      ref={insRef}
      className={cx(
        insClassName,
        hideUntilFilled && !isFilled && "opacity-0",
        className,
      )}
      data-zoneid={zoneId}
      data-filled={isFilled ? "true" : "false"}
    />
  );
}
