"use client";

import { useCallback, useRef } from "react";
import { cx } from "@/components/ui/suzi-primitives";
import type { DatingDiscoverItem } from "@/lib/dating-client";
import { cardImageUrl, cardImageUrls, datingDisplayName, getCircularOffset, getLayerForOffset } from "@/components/app/dating/dating-utils";

type DragState = {
  pointerId: number | null;
  startX: number;
  startY: number;
  dragging: boolean;
  didMove: boolean;
};

function compactText(value: string | null | undefined, maxChars: number) {
  const text = value?.trim();
  if (!text) {
    return "";
  }
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars).trimEnd()}...`;
}

function formatGender(value: string | null | undefined) {
  const text = value?.trim();
  if (!text) {
    return "";
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function DatingDiscoverDeck({
  deck,
  activeIndex,
  hasProfile,
  busy,
  accessToken,
  onRotate,
  onActiveIndexChange,
  onInterested,
  onRemoveInterest,
  onBlock,
  onRefresh,
  onOpenProfile,
}: {
  deck: DatingDiscoverItem[];
  activeIndex: number;
  hasProfile: boolean;
  busy: boolean;
  accessToken: string | null;
  onRotate: (step: number) => void;
  onActiveIndexChange: (index: number) => void;
  onInterested: (userId: string) => void;
  onRemoveInterest: (userId: string) => void;
  onBlock: (userId: string) => void;
  onRefresh: () => void;
  onOpenProfile: () => void;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const wheelLockRef = useRef(0);
  const dragRef = useRef<DragState>({
    pointerId: null,
    startX: 0,
    startY: 0,
    dragging: false,
    didMove: false,
  });
  const activeCard = deck[activeIndex] ?? null;

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      const now = Date.now();
      if (now - wheelLockRef.current < 240) {
        return;
      }
      const dominant = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (Math.abs(dominant) < 8) {
        return;
      }
      wheelLockRef.current = now;
      onRotate(dominant > 0 ? 1 : -1);
      event.preventDefault();
    },
    [onRotate],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: true,
      didMove: false,
    };
    stageRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state.dragging || state.pointerId !== event.pointerId) {
      return;
    }
    if (Math.abs(event.clientX - state.startX) > 12 || Math.abs(event.clientY - state.startY) > 12) {
      state.didMove = true;
    }
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state.dragging || state.pointerId !== event.pointerId) {
      return;
    }
    state.dragging = false;
    try {
      stageRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // capture may already be released by the browser
    }
    if (!state.didMove) {
      return;
    }
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    const dominant = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
    if (Math.abs(dominant) > 42) {
      onRotate(dominant < 0 ? 1 : -1);
    }
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col space-y-3">
      <div
        ref={stageRef}
        className="suzi-dating-stage relative isolate min-h-0 flex-1 overflow-hidden rounded-[1.25rem] border border-fuchsia-300/16 bg-[radial-gradient(circle_at_top,rgba(232,77,255,0.16),rgba(9,10,26,0.08)_52%,transparent)] [perspective:1200px]"
        style={{ touchAction: "none", transformStyle: "preserve-3d" }}
        tabIndex={0}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            event.preventDefault();
            onRotate(-1);
          }
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            event.preventDefault();
            onRotate(1);
          }
        }}
      >
        {deck.length > 1 ? (
          <div className="pointer-events-none absolute inset-x-3 top-1/2 z-20 flex -translate-y-1/2 items-center justify-between">
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onRotate(-1);
              }}
              className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-fuchsia-200/35 bg-black/35 text-fuchsia-50 shadow-lg backdrop-blur transition hover:border-fuchsia-100/70 hover:bg-fuchsia-500/34"
              aria-label="Previous dating profile"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onRotate(1);
              }}
              className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-fuchsia-200/35 bg-black/35 text-fuchsia-50 shadow-lg backdrop-blur transition hover:border-fuchsia-100/70 hover:bg-fuchsia-500/34"
              aria-label="Next dating profile"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        ) : null}
        <div className="suzi-dating-carousel-root relative h-[min(74dvh,46rem)] min-h-[33rem] sm:min-h-[39rem]" style={{ transformStyle: "preserve-3d" }}>
          {deck.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-slate-300/88">
              {hasProfile ? "No profiles match these filters right now." : "Set up your profile to start discovering."}
            </p>
            {!hasProfile ? (
              <button type="button" onClick={onOpenProfile} className="suzi-primary-btn px-4 py-2.5 text-sm">
                Create profile
              </button>
            ) : (
              <button
                type="button"
                disabled={!accessToken}
                onClick={onRefresh}
                className="suzi-secondary-btn px-4 py-2.5 text-sm"
              >
                Refresh deck
              </button>
            )}
          </div>
        ) : (
          <>
            {deck.map((item, index) => {
              const offset = getCircularOffset(index, activeIndex, deck.length);
              const layer = getLayerForOffset(offset);
              if (!layer) {
                return null;
              }
              const img = cardImageUrl(item);
              const photos = cardImageUrls(item);
              const name = datingDisplayName(item);
              const isLiked = item.viewerSwipeAction === "LIKE";
              const isPassed = item.viewerSwipeAction === "PASS";
              const genderLabel = formatGender(item.gender);
              const headline = compactText(item.headline, 58);
              const bio = compactText(item.datingBio, 96);
              return (
                <div
                  key={item.userId}
                  className="pointer-events-none absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]"
                >
                  <article
                    data-dating-card="true"
                    data-active={layer.isActive ? "true" : "false"}
                    className={cx(
                      "relative aspect-[9/16] overflow-hidden rounded-[1.45rem] border text-left transition-all duration-500 ease-out",
                      layer.isActive
                        ? "pointer-events-auto h-[92%] max-h-[44rem] w-auto max-w-[86vw] border-fuchsia-200/80 shadow-[0_0_60px_rgba(232,77,255,0.36)] sm:max-w-[26rem]"
                        : "h-[84%] max-h-[39rem] w-auto max-w-[78vw] border-fuchsia-300/14 brightness-[0.54] saturate-[0.8] sm:max-w-[23rem]",
                    )}
                    style={{
                      transform: layer.transform,
                      opacity: layer.opacity,
                      zIndex: layer.zIndex,
                      transformStyle: "preserve-3d",
                      willChange: "transform, opacity",
                    }}
                    onClick={() => onActiveIndexChange(index)}
                  >
                    <div className="absolute inset-0 bg-[rgba(6,9,28,0.35)]">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-900/40 to-slate-900/80 text-5xl text-white/40">
                        {name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    </div>
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,24,0.02),rgba(10,12,24,0.18)_42%,rgba(10,12,24,0.88))]" />
                    {photos.length > 1 ? (
                      <div className="absolute left-3 top-3 z-10 flex max-w-[58%] gap-1.5">
                        {photos.slice(0, 4).map((photo, photoIndex) => (
                          <span
                            key={photo}
                            className="relative h-10 w-8 overflow-hidden rounded-[0.55rem] border border-white/35 bg-black/30 shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photo} alt="" className="h-full w-full object-cover" />
                            {photoIndex === 0 ? (
                              <span className="absolute inset-x-0 bottom-0 bg-black/55 py-px text-center text-[0.48rem] font-semibold uppercase tracking-wide text-white">
                                Main
                              </span>
                            ) : null}
                          </span>
                        ))}
                        {photos.length > 4 ? (
                          <span className="inline-flex h-10 w-8 items-center justify-center rounded-[0.55rem] border border-white/25 bg-black/45 text-[0.62rem] font-semibold text-white">
                            +{photos.length - 4}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="absolute right-3 top-3 flex flex-col gap-2">
                    {item.isMatched ? (
                      <span className="rounded-full border border-emerald-300/45 bg-emerald-400/18 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-emerald-100">
                        Match
                      </span>
                    ) : null}
                    {isPassed ? (
                      <span className="rounded-full border border-white/18 bg-black/25 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-200/82">
                        Passed
                      </span>
                    ) : null}
                    </div>
                    <div className="absolute bottom-5 left-4 z-10">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={(event) => {
                        event.stopPropagation();
                        onRotate(1);
                      }}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white shadow-lg transition hover:border-slate-100/60 hover:bg-white/12"
                      aria-label="Next dating profile"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                    </div>
                    <div className="absolute bottom-5 right-4 z-10">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (isLiked) {
                          onRemoveInterest(item.userId);
                        } else {
                          onInterested(item.userId);
                        }
                      }}
                      aria-label={isLiked ? "Remove interest" : "Show interest"}
                      className={cx(
                        "inline-flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition",
                        isLiked
                          ? "border-rose-200/70 bg-rose-500 text-white shadow-rose-500/28"
                          : "border-white/24 bg-black/35 text-white hover:border-rose-200/70 hover:bg-rose-500/82",
                      )}
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
                      </svg>
                    </button>
                    </div>
                    <div className="absolute inset-x-14 bottom-4 z-10 flex flex-col items-center gap-2 text-center sm:inset-x-16">
                    <div>
                      <p className="text-2xl font-bold tracking-tight text-white">
                        {name}
                        {item.age != null ? `, ${item.age}` : ""}
                        {genderLabel ? `, ${genderLabel}` : ""}
                      </p>
                    </div>
                    {headline ? <p className="text-[0.78rem] font-medium leading-snug text-white/90">{headline}</p> : null}
                    {bio ? <p className="text-[0.72rem] leading-relaxed text-slate-200/78">{bio}</p> : null}
                    {item.interests.length ? (
                      <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-0.5">
                        {item.interests.slice(0, 4).map((tag) => (
                          <span key={tag} className="text-[0.55rem] font-semibold italic tracking-wide text-fuchsia-200/82">
                            #{tag.replace(/^#/, "")}
                          </span>
                        ))}
                      </div>
                    ) : null}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(event) => {
                          event.stopPropagation();
                          onBlock(item.userId);
                        }}
                        className="rounded-full border border-rose-300/30 bg-black/28 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-rose-100/86 transition hover:border-rose-200/70 hover:bg-rose-500/28 hover:text-white"
                      >
                        Block
                      </button>
                    </div>
                  </article>
                </div>
              );
            })}
          </>
        )}
        </div>
      </div>

      {activeCard && hasProfile ? (
        <p className="sr-only">
          @{activeCard.user.username} - scroll the cards, tap the heart to toggle your interest, or pass without removing the profile.
        </p>
      ) : null}
    </div>
  );
}
