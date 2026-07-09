"use client";

import { useEffect } from "react";
import { EXOCLICK_PROVIDER_SRC, adsEnabled } from "@/lib/ads-config";

// Ensures the ExoClick ad-provider script is injected exactly once for the whole
// app. Individual <ExoClickZone> components then queue ad serving. Rendering is
// null — this only manages the <script>. Mount it high in the tree (root layout)
// so the script is present for every route.
let providerRequested = false;

export function ExoClickProvider() {
  useEffect(() => {
    if (!adsEnabled || providerRequested) {
      return;
    }
    if (typeof document === "undefined") {
      return;
    }
    // Guard against a duplicate tag (e.g. Fast Refresh / re-mounts).
    if (document.querySelector(`script[src="${EXOCLICK_PROVIDER_SRC}"]`)) {
      providerRequested = true;
      return;
    }
    const script = document.createElement("script");
    script.src = EXOCLICK_PROVIDER_SRC;
    script.async = true;
    script.type = "application/javascript";
    document.head.appendChild(script);
    providerRequested = true;
  }, []);

  return null;
}
