/**
 * Shared layout breakpoints (keep in sync with `globals.css` `@media` for home grid).
 * Tailwind `xl` = 1280px — home dashboard 3-column grid activates at this width.
 */
export const BP_XL_MIN_PX = 1280;

export function mediaMinWidth(px: number) {
  return `(min-width: ${px}px)`;
}

export function mediaMaxWidth(px: number) {
  return `(max-width: ${px - 1}px)`;
}

/** Viewports that use the stacked / scrollable home dashboard (not the 6-tile SPA grid). */
export const MQ_HOME_COMPACT = mediaMaxWidth(BP_XL_MIN_PX);

/** Viewports that use the full desktop home dashboard grid. */
export const MQ_HOME_DESKTOP_GRID = mediaMinWidth(BP_XL_MIN_PX);
