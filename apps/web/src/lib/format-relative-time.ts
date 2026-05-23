/** e.g. "2m ago", "3h ago", "Yesterday" */
export function formatRelativeTime(
  iso: string,
  now = Date.now(),
  locale?: string,
): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) {
    return "";
  }
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  if (diffSec < 60) {
    return rtf.format(0, "second");
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return rtf.format(-diffMin, "minute");
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return rtf.format(-diffHr, "hour");
  }
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) {
    return rtf.format(-diffDay, "day");
  }
  return new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric" });
}
