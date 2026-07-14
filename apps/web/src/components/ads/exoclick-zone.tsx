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

function hasRenderableAdContent(element: HTMLModElement | null) {
  if (!element) {
    return false;
  }
  return Array.from(element.childNodes).some((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return Boolean(node.textContent?.trim());
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }
    const child = node as HTMLElement;
    return child.tagName !== "SCRIPT" && child.tagName !== "STYLE";
  });
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
  noFillTimeoutMs = 4000,
  onNoFill,
}: {
  zoneId: string;
  className?: string;
  // ExoClick's marker class varies by ad format — pass the one from the zone's
  // invocation code. Defaults to the standard display-banner class.
  insClassName?: string;
  // Change this when a carousel slide becomes active so ExoClick re-checks it at
  // its final, visible size instead of only while it is a side card.
  refreshKey?: string | number | boolean;
  noFillTimeoutMs?: number;
  onNoFill?: () => void;
}) {
  const insRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    if (!adsEnabled || !zoneId || typeof window === "undefined") {
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

    const noFillTimer = window.setTimeout(() => {
      if (!hasRenderableAdContent(insRef.current)) {
        onNoFill?.();
      }
    }, noFillTimeoutMs);

    return () => window.clearTimeout(noFillTimer);
  }, [zoneId, refreshKey, noFillTimeoutMs, onNoFill]);

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
