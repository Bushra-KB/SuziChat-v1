"use client";

import { useCallback, useRef } from "react";
import { cx } from "@/components/ui/suzi-primitives";
import type { DatingDiscoverItem } from "@/lib/dating-client";
import { cardImageUrl, getCircularOffset, getLayerForOffset } from "@/components/app/dating/dating-utils";

type DragState = {
  pointerId: number | null;
  startX: number;
  startY: number;
  dragging: boolean;
  didMove: boolean;
};

export function DatingDiscoverDeck({
  deck,
  activeIndex,
  hasProfile,
  busy,
  accessToken,
  onRotate,
  onActiveIndexChange,
  onInterested,
  onPass,
  onRemoveInterest,
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
  onPass: (userId: string) => void;
  onRemoveInterest: (userId: string) => void;
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
    <div className="min-w-0 flex-1 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-100/70">Discover feed</p>
          <p className="text-sm text-slate-300/80">
            Scroll or drag like Suzi Snaps/Reels. Liked and passed profiles stay visible.
          </p>
        </div>
        {deck.length > 1 ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => onRotate(-1)}
              className="rounded-full border border-fuchsia-300/24 bg-white/5 px-3 py-2 text-sm text-fuchsia-50 transition hover:border-fuchsia-200/55 hover:bg-fuchsia-300/12"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => onRotate(1)}
              className="rounded-full border border-fuchsia-300/24 bg-white/5 px-3 py-2 text-sm text-fuchsia-50 transition hover:border-fuchsia-200/55 hover:bg-fuchsia-300/12"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>

      <div
        ref={stageRef}
        className="relative isolate overflow-hidden rounded-[1.25rem] border border-fuchsia-300/16 bg-[radial-gradient(circle_at_top,rgba(232,77,255,0.16),rgba(9,10,26,0.08)_52%,transparent)] [perspective:1200px]"
        style={{ touchAction: "none", transformStyle: "preserve-3d" }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div className="relative h-[min(74dvh,46rem)] min-h-[33rem] sm:min-h-[39rem]" style={{ transformStyle: "preserve-3d" }}>
          {deck.length === 0 ? (
          <div className="flex h-[28rem] flex-col items-center justify-center gap-3 px-6 text-center sm:h-[36rem]">
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
              const name = item.user.displayName ?? item.user.username;
              const isLiked = item.viewerSwipeAction === "LIKE";
              const isPassed = item.viewerSwipeAction === "PASS";
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
                    <div className="absolute bottom-5 right-4 z-10 flex flex-col gap-2">
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
                    <button
                      type="button"
                      disabled={busy}
                      onClick={(event) => {
                        event.stopPropagation();
                        onPass(item.userId);
                      }}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white shadow-lg transition hover:border-slate-100/60 hover:bg-white/12"
                      aria-label="Not interested"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 space-y-3 p-4 pr-20 sm:p-5 sm:pr-20">
                    <div>
                      <p className="text-2xl font-bold tracking-tight text-white">
                        {name}
                        {item.age != null ? `, ${item.age}` : ""}
                      </p>
                      {item.user.country ? <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-fuchsia-100/76">{item.user.country}</p> : null}
                    </div>
                    {item.headline ? <p className="text-sm font-medium text-white/92">{item.headline}</p> : null}
                    {item.datingBio ? <p className="line-clamp-3 text-sm leading-relaxed text-slate-200/82">{item.datingBio}</p> : null}
                    {item.interests.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.interests.slice(0, 4).map((tag) => (
                          <span key={tag} className="rounded-full border border-fuchsia-200/35 bg-fuchsia-300/12 px-2 py-0.5 text-[0.68rem] font-medium text-fuchsia-50/90">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(event) => {
                          event.stopPropagation();
                          onPass(item.userId);
                        }}
                        className={cx(
                          "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition",
                          isPassed
                            ? "border-white/30 bg-white/12 text-white"
                            : "border-white/18 bg-black/26 text-slate-100/88 hover:border-white/40 hover:bg-white/12",
                        )}
                      >
                        {isPassed ? "Passed" : "Pass"}
                      </button>
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
                        className={cx(
                          "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition",
                          isLiked
                            ? "border-rose-200/70 bg-rose-500 text-white"
                            : "border-fuchsia-200/45 bg-fuchsia-400/16 text-fuchsia-50 hover:bg-fuchsia-400/24",
                        )}
                      >
                        {isLiked ? "Liked" : "Like"}
                      </button>
                    </div>
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
        <p className="text-xs text-slate-400/85">
          @{activeCard.user.username} - scroll the cards, tap the heart to toggle your interest, or pass without removing the profile.
        </p>
      ) : null}
    </div>
  );
}
