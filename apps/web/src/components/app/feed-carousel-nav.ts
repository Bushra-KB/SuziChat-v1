/** Circular offset for 3D carousel (-2 … 2 visible slots). */
export function getCircularOffset(index: number, activeIndex: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  let offset = index - activeIndex;
  if (offset > total / 2) {
    offset -= total;
  }
  if (offset < -total / 2) {
    offset += total;
  }
  return offset;
}

export function normalizeCarouselStep(step: number): -1 | 0 | 1 {
  if (step > 0) {
    return 1;
  }
  if (step < 0) {
    return -1;
  }
  return 0;
}

export function advanceCarouselIndex(current: number, step: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  const direction = normalizeCarouselStep(step);
  if (direction === 0) {
    return current;
  }
  return (current + direction + total) % total;
}

export const FEED_CAROUSEL_SWIPE_THRESHOLD_PX = 40;
export const FEED_CAROUSEL_WHEEL_COOLDOWN_MS = 420;
export const FEED_CAROUSEL_WHEEL_DELTA_MIN = 10;
export const FEED_CAROUSEL_NAV_LOCK_MS = 340;

/** Scroll down / right → next item; up / left → previous. */
export function resolveFeedWheelStep(deltaX: number, deltaY: number): -1 | 0 | 1 {
  const dominant = Math.abs(deltaY) >= Math.abs(deltaX) ? deltaY : deltaX;
  if (Math.abs(dominant) < FEED_CAROUSEL_WHEEL_DELTA_MIN) {
    return 0;
  }
  return dominant > 0 ? 1 : -1;
}

/** Swipe left/up → next; swipe right/down → previous. */
export function resolveFeedSwipeStep(deltaX: number, deltaY: number): -1 | 0 | 1 {
  const dominant = Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : deltaX;
  if (Math.abs(dominant) < FEED_CAROUSEL_SWIPE_THRESHOLD_PX) {
    return 0;
  }
  if (Math.abs(deltaY) > Math.abs(deltaX)) {
    return dominant < 0 ? 1 : -1;
  }
  return dominant < 0 ? 1 : -1;
}

export type FeedCarouselDragState = {
  pointerId: number | null;
  startX: number;
  startY: number;
  dragging: boolean;
  didMove: boolean;
  suppressClick: boolean;
};

export function createInitialFeedCarouselDragState(): FeedCarouselDragState {
  return {
    pointerId: null,
    startX: 0,
    startY: 0,
    dragging: false,
    didMove: false,
    suppressClick: false,
  };
}
