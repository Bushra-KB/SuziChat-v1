"use client";

import { useEffect, useState } from "react";

/**
 * Returns whether the viewport currently matches the given media query.
 *
 * Defaults to `max-width: 767px`, which mirrors Tailwind's `md` breakpoint
 * (mobile-first: `< md` is "mobile"). SSR-safe — starts as `false` so the
 * server renders the desktop layout, then flips on the client after mount.
 */
export function useIsMobile(query = "(max-width: 767px)"): {
  isMobile: boolean;
  mounted: boolean;
} {
  const [matches, setMatches] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- gate clients on hydration before observing matchMedia. */
    setMounted(true);
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", update);
      return () => mql.removeEventListener("change", update);
    }
    mql.addListener(update);
    return () => mql.removeListener(update);
  }, [query]);

  return { isMobile: matches, mounted };
}
