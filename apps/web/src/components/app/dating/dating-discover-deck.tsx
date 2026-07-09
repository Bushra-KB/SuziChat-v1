"use client";

import { useCallback, useRef, useState } from "react";
import { cx } from "@/components/ui/suzi-primitives";
import { AdCard } from "@/components/ads/ad-card";
import { cardImageUrl, cardImageUrls, datingDisplayName, getCircularOffset, getLayerForOffset, type DatingDeckItem } from "@/components/app/dating/dating-utils";

type DragState = {
  pointerId: number | null;
  startX: number;
  startY: number;
  dragging: boolean;
  didMove: boolean;
};

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
  onPass,
  onBlock,
  onRefresh,
  onOpenProfile,
}: {
  deck: DatingDeckItem[];
  activeIndex: number;
  hasProfile: boolean;
  busy: boolean;
  accessToken: string | null;
  onRotate: (step: number) => void;
  onActiveIndexChange: (index: number) => void;
  onInterested: (userId: string) => void;
  onRemoveInterest: (userId: string) => void;
  onPass: (userId: string) => void;
  onBlock: (userId: string) => void;
  onRefresh: () => void;
  onOpenProfile: () => void;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const wheelLockRef = useRef(0);
  const [photoIndexByUserId, setPhotoIndexByUserId] = useState<Record<string, number>>({});
  const [detailsUserId, setDetailsUserId] = useState<string | null>(null);
  const dragRef = useRef<DragState>({
    pointerId: null,
    startX: 0,
    startY: 0,
    dragging: false,
    didMove: false,
  });
  const activeItem = deck[activeIndex] ?? null;
  const activeCard = activeItem?.type === "profile" ? activeItem.item : null;

  const setCardPhotoIndex = useCallback((userId: string, index: number, total: number) => {
    if (total <= 1) return;
    const nextIndex = ((index % total) + total) % total;
    setPhotoIndexByUserId((prev) => ({ ...prev, [userId]: nextIndex }));
  }, []);

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
      setDetailsUserId(null);
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
      setDetailsUserId(null);
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
                setDetailsUserId(null);
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
                setDetailsUserId(null);
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
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenProfile();
                }}
                className="suzi-primary-btn px-4 py-2.5 text-sm"
              >
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
            {deck.map((entry, index) => {
              const offset = getCircularOffset(index, activeIndex, deck.length);
              const layer = getLayerForOffset(offset);
              if (!layer) {
                return null;
              }
              if (entry.type === "ad") {
                return (
                  <div
                    key={entry.key}
                    className="pointer-events-none absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]"
                  >
                    <article
                      className={cx(
                        "relative aspect-[9/16] overflow-hidden rounded-[1.45rem] border transition-all duration-500 ease-out",
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
                    >
                      <AdCard slot="feed-dating" className="h-full w-full rounded-[1.45rem] border-0" />
                    </article>
                  </div>
                );
              }
              const item = entry.item;
              const photos = cardImageUrls(item);
              const fallbackImg = cardImageUrl(item);
              const activePhotoIndex = Math.min(
                Math.max(photoIndexByUserId[item.userId] ?? 0, 0),
                Math.max(photos.length - 1, 0),
              );
              const img = photos[activePhotoIndex] ?? fallbackImg;
              const name = datingDisplayName(item);
              const isLiked = item.viewerSwipeAction === "LIKE";
              const isPassed = item.viewerSwipeAction === "PASS";
              const genderLabel = formatGender(item.gender);
              const country = item.user.country?.trim();
              const headline = item.headline?.trim();
              const bio = item.datingBio?.trim() || item.user.bio?.trim();
              const detailsOpen = layer.isActive && detailsUserId === item.userId;
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
                    onClick={() => {
                      setDetailsUserId(null);
                      onActiveIndexChange(index);
                    }}
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
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,24,0.02),rgba(10,12,24,0.08)_46%,rgba(10,12,24,0.34))]" />
                    {photos.length > 1 ? (
                      <div className="absolute left-3 right-3 top-3 z-10 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="inline-flex rounded-full border border-white/25 bg-black/45 px-2 py-1 text-[0.62rem] font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] backdrop-blur">
                            {activePhotoIndex + 1}/{photos.length}
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              aria-label="Previous photo"
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation();
                                setCardPhotoIndex(item.userId, activePhotoIndex - 1, photos.length);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] backdrop-blur transition hover:bg-fuchsia-500/50"
                            >
                              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <path d="m15 18-6-6 6-6" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              aria-label="Next photo"
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation();
                                setCardPhotoIndex(item.userId, activePhotoIndex + 1, photos.length);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] backdrop-blur transition hover:bg-fuchsia-500/50"
                            >
                              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <path d="m9 18 6-6-6-6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="suzi-dating-photo-strip flex max-w-full gap-1.5 overflow-x-auto pb-1">
                        {photos.map((photo, photoIndex) => (
                          <button
                            type="button"
                            key={photo}
                            aria-label={`Show photo ${photoIndex + 1}`}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              setCardPhotoIndex(item.userId, photoIndex, photos.length);
                            }}
                            className={cx(
                              "relative h-10 w-8 shrink-0 overflow-hidden rounded-[0.55rem] border bg-black/30 shadow-[0_4px_12px_rgba(0,0,0,0.25)] transition",
                              photoIndex === activePhotoIndex
                                ? "border-fuchsia-200 ring-2 ring-fuchsia-400/65"
                                : "border-white/35 hover:border-white/70",
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photo} alt="" className="h-full w-full object-cover" />
                            {photoIndex === 0 ? (
                              <span className="absolute inset-x-0 bottom-0 bg-black/55 py-px text-center text-[0.48rem] font-semibold uppercase tracking-wide text-white">
                                Main
                              </span>
                            ) : null}
                          </button>
                        ))}
                        </div>
                      </div>
                    ) : null}
                    <div className={cx("absolute right-3 flex flex-col gap-2", photos.length > 1 ? "top-[4.35rem]" : "top-3")}>
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
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        setDetailsUserId((current) => (current === item.userId ? null : item.userId));
                      }}
                      className={cx(
                        "inline-flex h-12 w-12 items-center justify-center rounded-full border text-white shadow-lg backdrop-blur transition",
                        detailsOpen
                          ? "border-cyan-200/70 bg-cyan-400/28"
                          : "border-white/20 bg-black/35 hover:border-cyan-100/60 hover:bg-cyan-400/18",
                      )}
                      aria-label={detailsOpen ? "Hide dating profile details" : "View dating profile details"}
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        {detailsOpen ? (
                          <path d="M6 15l6-6 6 6" />
                        ) : (
                          <>
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 10v6" />
                            <path d="M12 7h.01" />
                          </>
                        )}
                      </svg>
                    </button>
                    </div>
                    <div className="absolute bottom-5 right-4 z-10">
                    <button
                      type="button"
                      disabled={busy}
                      onPointerDown={(event) => event.stopPropagation()}
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
                    <div
                      className={cx(
                        "absolute inset-x-0 bottom-0 z-20 rounded-t-[1.6rem] border-t border-white/18 bg-[linear-gradient(180deg,rgba(25,19,70,0.9),rgba(12,10,34,0.97))] px-4 pb-4 pt-4 text-white shadow-[0_-18px_44px_rgba(4,6,20,0.55)] backdrop-blur-xl transition duration-300 ease-out",
                        detailsOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[105%] opacity-0",
                      )}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/28" />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-2xl font-bold tracking-tight text-white">
                            {name}
                            {item.age != null ? `, ${item.age}` : ""}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {genderLabel ? (
                              <span className="rounded-full border border-fuchsia-200/24 bg-fuchsia-400/14 px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.11em] text-fuchsia-100">
                                {genderLabel}
                              </span>
                            ) : null}
                            {country ? (
                              <span className="rounded-full border border-cyan-200/22 bg-cyan-400/12 px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.11em] text-cyan-100">
                                {country}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDetailsUserId(null)}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/8 text-white/80 transition hover:bg-white/14 hover:text-white"
                          aria-label="Close details"
                        >
                          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 6l12 12M18 6 6 18" />
                          </svg>
                        </button>
                      </div>

                      {headline ? <p className="mt-3 text-sm font-semibold leading-snug text-fuchsia-50">{headline}</p> : null}
                      {bio ? <p className="mt-2 max-h-24 overflow-y-auto pr-1 text-[0.78rem] leading-relaxed text-slate-100/82">{bio}</p> : null}
                      {item.interests.length ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {item.interests.slice(0, 8).map((tag) => (
                            <span key={tag} className="rounded-full bg-white/9 px-2.5 py-1 text-[0.63rem] font-semibold italic tracking-wide text-fuchsia-100/90">
                              #{tag.replace(/^#/, "")}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setDetailsUserId(null);
                            onPass(item.userId);
                          }}
                          className="rounded-full border border-white/18 bg-white/8 px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-100 transition hover:bg-white/14"
                        >
                          Pass
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setDetailsUserId(null);
                            onBlock(item.userId);
                          }}
                          className="rounded-full border border-rose-300/30 bg-rose-500/12 px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-rose-100/92 transition hover:border-rose-200/70 hover:bg-rose-500/24 hover:text-white"
                        >
                          Block
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
        <p className="sr-only">
          @{activeCard.user.username} - scroll the cards, tap the heart to toggle your interest, or pass without removing the profile.
        </p>
      ) : null}
    </div>
  );
}
