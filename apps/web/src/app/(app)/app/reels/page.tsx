"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel, cx } from "@/components/ui/suzi-primitives";
import { reels } from "@/lib/v1-mock-data";

type DragState = {
  pointerId: number | null;
  lastX: number;
  dragging: boolean;
};

type ReelLayer = {
  transform: string;
  opacity: number;
  zIndex: number;
  isActive: boolean;
};

function getCircularOffset(index: number, activeIndex: number, total: number) {
  let offset = index - activeIndex;
  if (offset > total / 2) {
    offset -= total;
  }
  if (offset < -total / 2) {
    offset += total;
  }
  return offset;
}

function formatCompact(value: number) {
  if (value >= 1000) {
    const compact = value / 1000;
    return `${compact % 1 === 0 ? compact.toFixed(0) : compact.toFixed(1)}K`;
  }

  return String(value);
}

function getLayerForOffset(offset: number): ReelLayer | null {
  const absOffset = Math.abs(offset);
  if (absOffset > 2) {
    return null;
  }

  if (offset === 0) {
    return {
      transform: "translate3d(0, 0, 50px) scale(1.1)",
      opacity: 1,
      zIndex: 20,
      isActive: true,
    };
  }

  const leftSide = offset < 0;
  if (absOffset === 1) {
    return {
      transform: `translate3d(${leftSide ? "-72%" : "72%"}, 0, -150px) rotateY(${leftSide ? "25deg" : "-25deg"}) translateX(${leftSide ? "-20%" : "20%"}) scale(0.84)`,
      opacity: 0.62,
      zIndex: 10,
      isActive: false,
    };
  }

  return {
    transform: `translate3d(${leftSide ? "-124%" : "124%"}, 0, -280px) rotateY(${leftSide ? "34deg" : "-34deg"}) translateX(${leftSide ? "-26%" : "26%"}) scale(0.68)`,
    opacity: 0.32,
    zIndex: 5,
    isActive: false,
  };
}

function EyeIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function HeartIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 21s-7-4.7-9.5-8c-2-2.7-.7-7 3-7 2 0 3.3 1 4.5 2.5C11.2 7 12.5 6 14.5 6c3.7 0 5 4.3 3 7C19 16.3 12 21 12 21Z" />
    </svg>
  );
}

function ChatIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16v10H8l-4 4V6Z" />
    </svg>
  );
}

export default function ReelsPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoMode, setAutoMode] = useState(true);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const dragState = useRef<DragState>({ pointerId: null, lastX: 0, dragging: false });

  const totalViews = useMemo(() => reels.reduce((sum, reel) => sum + reel.views, 0), []);
  const totalLikes = useMemo(() => reels.reduce((sum, reel) => sum + reel.likes, 0), []);
  const rotateBy = useCallback((step: number) => {
    setActiveIndex((previous) => (previous + step + reels.length) % reels.length);
  }, []);

  useEffect(() => {
    const video = activeVideoRef.current;
    if (!video) {
      return;
    }
    video.currentTime = 0;
    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => {
        // Browser autoplay policies can reject; keep UI controllable.
      });
    }
  }, [activeIndex, autoMode]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    setAutoMode(false);
    dragState.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      dragging: true,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state.dragging || state.pointerId !== event.pointerId) {
      return;
    }
    const deltaX = event.clientX - state.lastX;
    if (Math.abs(deltaX) < 52) {
      return;
    }
    rotateBy(deltaX < 0 ? 1 : -1);
    state.lastX = event.clientX;
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (state.pointerId !== event.pointerId) {
      return;
    }
    state.dragging = false;
    state.pointerId = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <section className="space-y-6">
      <Panel className="[background:transparent] border-cyan-300/24 p-4 shadow-none sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[2rem] font-bold tracking-tight text-white">Suzi Reels</h2>
            <p className="mt-1 text-sm text-cyan-100/72">Synchronizing through the nebula</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-4 rounded-[0.9rem] border border-cyan-300/22 bg-[rgba(18,12,56,0.56)] px-3 py-2 sm:flex">
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.14em] text-cyan-100/58">Views</p>
                <p className="text-sm font-semibold text-white">{formatCompact(totalViews)}</p>
              </div>
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.14em] text-cyan-100/58">Likes</p>
                <p className="text-sm font-semibold text-white">{formatCompact(totalLikes)}</p>
              </div>
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.14em] text-cyan-100/58">Active Reel</p>
                <p className="text-sm font-semibold text-white">
                  {activeIndex + 1}/{reels.length}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAutoMode((value) => !value)}
              className={cx(
                "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition",
                autoMode
                  ? "border-cyan-300/42 bg-cyan-300/18 text-cyan-100"
                  : "border-cyan-300/24 bg-[rgba(20,13,63,0.62)] text-cyan-100/80 hover:border-cyan-300/42 hover:text-white",
              )}
            >
              Auto-Play
              <span
                className={cx(
                  "relative inline-flex h-5 w-9 items-center rounded-full border transition",
                  autoMode ? "border-cyan-200/52 bg-cyan-300/24" : "border-white/24 bg-white/10",
                )}
              >
                <span
                  className={cx(
                    "h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.42)] transition",
                    autoMode ? "translate-x-[1.05rem]" : "translate-x-0.5",
                  )}
                />
              </span>
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-[1.2rem] border border-cyan-300/20 bg-transparent p-3 sm:p-4">
          <div
            className="relative isolate h-[27.5rem] overflow-hidden rounded-[1.05rem] border border-cyan-300/16 bg-transparent [perspective:1200px] sm:h-[39rem]"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            style={{ touchAction: "pan-y", transformStyle: "preserve-3d" }}
          >
            <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
              {reels.map((reel, index) => {
                const offset = getCircularOffset(index, activeIndex, reels.length);
                const layer = getLayerForOffset(offset);
                if (!layer) {
                  return null;
                }

                return (
                  <div
                    key={reel.id}
                    className="pointer-events-none absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveIndex(index);
                        setAutoMode(false);
                      }}
                      className={cx(
                        "pointer-events-auto relative h-[84%] max-h-[40rem] w-auto max-w-[86vw] aspect-[9/16] overflow-hidden rounded-[1.45rem] border text-left transition-all duration-500 ease-in-out sm:max-w-[24rem]",
                        layer.isActive ? "border-cyan-300/72 shadow-[0_0_52px_rgba(0,229,255,0.34)]" : "border-cyan-300/20",
                      )}
                      style={{
                        transform: layer.transform,
                        opacity: layer.opacity,
                        zIndex: layer.zIndex,
                        transformStyle: "preserve-3d",
                        willChange: "transform, opacity",
                      }}
                    >
                      {layer.isActive ? (
                        <video
                          key={`${reel.id}-${autoMode ? "auto" : "manual"}`}
                          ref={activeVideoRef}
                          src={reel.video}
                          poster={reel.poster}
                          className="h-full w-full bg-[rgba(6,9,28,0.35)] object-contain"
                          autoPlay
                          muted
                          playsInline
                          loop={!autoMode}
                          onEnded={() => {
                            if (autoMode) {
                              rotateBy(1);
                            }
                          }}
                          preload="metadata"
                          aria-label={`${reel.title} active reel`}
                        />
                      ) : (
                        <Image
                          src={reel.poster}
                          alt={`${reel.title} reel preview`}
                          fill
                          sizes="(min-width: 768px) 300px, 180px"
                          className="bg-[rgba(6,9,28,0.3)] object-contain"
                        />
                      )}

                      <div
                        className={cx(
                          "pointer-events-none absolute inset-0",
                          layer.isActive
                            ? "bg-[linear-gradient(180deg,rgba(9,11,30,0.02),rgba(9,11,30,0.16)_48%,rgba(9,11,30,0.48))]"
                            : "bg-[linear-gradient(180deg,rgba(9,11,30,0.16),rgba(9,11,30,0.46)_50%,rgba(9,11,30,0.84))]",
                          reel.tone,
                        )}
                      />

                      {layer.isActive ? (
                        <>
                          <span className="pointer-events-none absolute left-3 top-3 inline-flex rounded-full border border-cyan-200/42 bg-cyan-300/18 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-cyan-100">
                            Live now
                          </span>

                          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 sm:p-4">
                            <div
                              className="rounded-[1rem] border border-cyan-300/24 bg-[rgba(6,10,22,0.42)] p-3 sm:p-4"
                              style={{ backdropFilter: "blur(8px)" }}
                            >
                              <div className="flex items-center gap-2.5">
                                <Image
                                  src={reel.avatar}
                                  alt={`${reel.author} avatar`}
                                  width={38}
                                  height={38}
                                  className="h-9 w-9 rounded-full border border-white/18 object-cover sm:h-10 sm:w-10"
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-[1rem] font-semibold leading-tight text-white sm:text-[1.05rem]">{reel.author}</p>
                                  <p className="truncate text-[0.78rem] text-cyan-100/74">{reel.handle}</p>
                                </div>
                              </div>

                              <p className="mt-2 line-clamp-2 text-sm text-cyan-100/86 sm:text-[0.95rem]">{reel.caption}</p>

                              <div className="mt-3 flex items-center gap-4 text-xs text-cyan-100/90 sm:gap-5 sm:text-sm">
                                <span className="inline-flex items-center gap-1.5">
                                  <HeartIcon />
                                  {formatCompact(reel.likes)}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <ChatIcon />
                                  {formatCompact(reel.comments)}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <EyeIcon />
                                  {formatCompact(reel.views)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div
                          className="pointer-events-none absolute inset-x-2 bottom-2 rounded-[0.78rem] border border-cyan-300/14 bg-[rgba(8,10,28,0.38)] px-2 py-2"
                          style={{ backdropFilter: "blur(8px)" }}
                        >
                          <p className="truncate text-[0.82rem] font-semibold text-cyan-50/84">{reel.title}</p>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setAutoMode(false);
                rotateBy(-1);
              }}
              className="absolute left-2 top-1/2 z-50 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300/34 bg-[rgba(9,10,31,0.56)] text-cyan-100/86 transition hover:border-cyan-200/62 hover:text-white sm:left-3"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 6-6 6 6 6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => {
                setAutoMode(false);
                rotateBy(1);
              }}
              className="absolute right-2 top-1/2 z-50 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300/34 bg-[rgba(9,10,31,0.56)] text-cyan-100/86 transition hover:border-cyan-200/62 hover:text-white sm:right-3"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex flex-col items-center">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.38em] text-cyan-100/58">Drag to explore</p>
            <div className="mt-2 flex items-center gap-2">
              {reels.map((reel, index) => (
                <button
                  key={`${reel.id}-dot`}
                  type="button"
                  onClick={() => {
                    setAutoMode(false);
                    setActiveIndex(index);
                  }}
                  className={cx(
                    "h-1.5 rounded-full transition-all duration-500 ease-in-out",
                    index === activeIndex
                      ? "w-8 bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.74)]"
                      : "w-1.5 bg-cyan-100/36 hover:bg-cyan-100/56",
                  )}
                  aria-label={`Jump to reel ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </section>
  );
}
