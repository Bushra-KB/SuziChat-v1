export type FeedCarouselLayer = {
  transform: string;
  opacity: number;
  zIndex: number;
  isActive: boolean;
};

/** 3D carousel transforms — center card pops; neighbors stay visible but inert. */
export function getFeedCarouselLayer(offset: number): FeedCarouselLayer | null {
  const absOffset = Math.abs(offset);
  if (absOffset > 2) {
    return null;
  }

  if (offset === 0) {
    return {
      transform: "translate3d(0, 0, 0) scale(1.04)",
      opacity: 1,
      zIndex: 30,
      isActive: true,
    };
  }

  const leftSide = offset < 0;
  if (absOffset === 1) {
    return {
      transform: `translate3d(${leftSide ? "-80%" : "80%"}, 0, -160px) rotateY(${leftSide ? "24deg" : "-24deg"}) translateX(${leftSide ? "-18%" : "18%"}) scale(0.76)`,
      opacity: 0.38,
      zIndex: 8,
      isActive: false,
    };
  }

  return {
    transform: `translate3d(${leftSide ? "-132%" : "132%"}, 0, -300px) rotateY(${leftSide ? "32deg" : "-32deg"}) translateX(${leftSide ? "-22%" : "22%"}) scale(0.62)`,
    opacity: 0.16,
    zIndex: 4,
    isActive: false,
  };
}

export const feedCardMediaFrameClassName =
  "suzi-feed-card-media-frame absolute inset-0 flex items-center justify-center bg-[rgba(6,9,28,0.35)]";

export const feedCardCaptionPanelClassName = "suzi-feed-card-caption";

export const feedCaptionVisibilityClassName = "suzi-feed-caption-visibility";

export const feedCaptionAuthorClassName = "suzi-feed-caption-author";

export const feedCaptionTitleClassName = "suzi-feed-caption-title";

export const feedCaptionBodyClassName = "suzi-feed-caption-body";

export const feedCommentSheetClassName = "suzi-feed-comment-sheet";

export const feedCardProfileClassName =
  "suzi-feed-card-rail-profile relative h-8 w-8 shrink-0 overflow-hidden rounded-full border-[1.5px] border-cyan-300/55 bg-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.3)] ring-1 ring-cyan-400/25 transition hover:border-cyan-200/75 hover:ring-cyan-300/40";

export const feedCardActionRailClassName =
  "suzi-feed-card-action-rail pointer-events-auto absolute right-1.5 z-[38] flex flex-col items-center sm:right-2";

export const feedCardActionBtnClassName =
  "suzi-feed-card-rail-action inline-flex flex-col items-center gap-0.5 text-white/95 transition";

export const feedCardActionIconClassName = "h-5 w-5 shrink-0";

export const feedCardActionLabelClassName =
  "text-[0.62rem] font-semibold leading-none text-white";

export const feedCardVolumeChromeClassName =
  "suzi-feed-card-volume-chrome pointer-events-auto absolute left-2 z-[40] flex items-center gap-1.5 rounded-full border border-cyan-300/36 bg-[rgba(8,12,30,0.78)] px-1.5 py-1 shadow-[0_0_14px_rgba(34,211,238,0.2)] sm:left-2.5";

export const feedCardFullscreenBtnClassName =
  "suzi-feed-card-fullscreen-btn pointer-events-auto absolute right-2 z-[40] inline-flex h-7 w-7 items-center justify-center rounded-full border border-cyan-300/40 bg-[rgba(8,12,30,0.82)] text-cyan-100/92 shadow-[0_0_14px_rgba(34,211,238,0.22)] transition hover:border-cyan-200/55 hover:text-white sm:right-2.5";
