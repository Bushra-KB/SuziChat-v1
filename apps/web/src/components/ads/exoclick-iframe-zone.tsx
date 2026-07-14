"use client";

import { EXOCLICK_PROVIDER_SRC, adsEnabled } from "@/lib/ads-config";
import { cx } from "@/components/ui/suzi-primitives";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

function buildSrcDoc(zoneId: string, insClassName: string) {
  const safeZoneId = escapeHtml(zoneId);
  const safeClassName = escapeHtml(insClassName);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: transparent;
      }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      ins {
        display: block;
        max-width: 100%;
      }
    </style>
  </head>
  <body>
    <script async type="application/javascript" src="${EXOCLICK_PROVIDER_SRC}"></script>
    <ins class="${safeClassName}" data-zoneid="${safeZoneId}"></ins>
    <script>(AdProvider = window.AdProvider || []).push({"serve": {}});</script>
  </body>
</html>`;
}

export function ExoClickIframeZone({
  zoneId,
  insClassName,
  title = "Sponsored ad",
  className,
}: {
  zoneId: string;
  insClassName: string;
  title?: string;
  className?: string;
}) {
  if (!adsEnabled || !zoneId) {
    return null;
  }

  return (
    <iframe
      title={title}
      srcDoc={buildSrcDoc(zoneId, insClassName)}
      className={cx("block border-0 bg-transparent", className)}
      referrerPolicy="strict-origin-when-cross-origin"
      scrolling="no"
    />
  );
}
