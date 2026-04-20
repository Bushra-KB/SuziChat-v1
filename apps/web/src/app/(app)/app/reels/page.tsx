"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel, cx } from "@/components/ui/suzi-primitives";
import { listPosts } from "@/lib/posts-client";
import { apiPostToReel } from "@/lib/post-ui-mappers";
import { reels } from "@/lib/v1-mock-data";

type DragState = {
  pointerId: number | null;
  lastX: number;
  dragging: boolean;
  didMove: boolean;
  suppressClick: boolean;
};

type ReelLayer = {
  transform: string;
  opacity: number;
  zIndex: number;
  isActive: boolean;
};

type ReelComment = {
  id: string;
  author: string;
  text: string;
  time: string;
};

type CommentSheetDragState = {
  pointerId: number | null;
  startY: number;
  dragging: boolean;
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

function HeartIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 21s-7-4.7-9.5-8c-2-2.7-.7-7 3-7 2 0 3.3 1 4.5 2.5C11.2 7 12.5 6 14.5 6c3.7 0 5 4.3 3 7C19 16.3 12 21 12 21Z" />
    </svg>
  );
}

function ChatIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4.6 3.6A1 1 0 0 1 4 18.8V6Z" />
      <circle cx="9" cy="10" r="1.1" fill="#171735" />
      <circle cx="12" cy="10" r="1.1" fill="#171735" />
      <circle cx="15" cy="10" r="1.1" fill="#171735" />
    </svg>
  );
}

function ShareIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="m22 4-9.7 17.5a.8.8 0 0 1-1.5-.2L8.6 13 2.3 10.7a.8.8 0 0 1-.2-1.5L19.6 2a1.2 1.2 0 0 1 1.6 1.6Z" />
    </svg>
  );
}

function VolumeOnIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="M4 10h4l5-4v12l-5-4H4v-4Z" />
      <path d="M17 9a4 4 0 0 1 0 6" />
      <path d="M19.8 6.8a8 8 0 0 1 0 10.4" />
    </svg>
  );
}

function VolumeOffIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="M4 10h4l5-4v12l-5-4H4v-4Z" />
      <path d="m18 9 4 4m0-4-4 4" />
    </svg>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "00:00";
  }
  const totalSeconds = Math.floor(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatAuthorLink(author: string, handle: string) {
  const parts = author.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const [firstName, lastName] = parts;
    return `${firstName} ${lastName.slice(0, 1).toUpperCase()}.`;
  }
  const handleInitial = handle.replace(/^@/, "").slice(0, 1).toUpperCase();
  return handleInitial ? `${author} ${handleInitial}.` : author;
}

export default function ReelsPage() {
  const [displayReels, setDisplayReels] = useState(() => reels);
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoScrollMode, setAutoScrollMode] = useState(true);
  const [likedByReel, setLikedByReel] = useState<Record<string, boolean>>({});
  const [commentsByReel, setCommentsByReel] = useState<Record<string, ReelComment[]>>(() =>
    Object.fromEntries(
      reels.map((reel) => [
        reel.id,
        [
          { id: `${reel.id}-c1`, author: "Alan R.", text: "This one looks amazing.", time: "2m" },
          { id: `${reel.id}-c2`, author: "Mary N.", text: "Keep posting more like this.", time: "7m" },
        ],
      ]),
    ),
  );
  const [extraCommentCounts, setExtraCommentCounts] = useState<Record<string, number>>({});
  const [commentDraft, setCommentDraft] = useState("");
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);
  const [commentSheetOffsetY, setCommentSheetOffsetY] = useState(0);
  const [isCommentSheetDragging, setIsCommentSheetDragging] = useState(false);
  const [sharedReelId, setSharedReelId] = useState<string | null>(null);
  const [activeCurrentTime, setActiveCurrentTime] = useState(0);
  const [activeDuration, setActiveDuration] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0.82);
  const [isActivePlaying, setIsActivePlaying] = useState(true);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioSettingsRef = useRef({ isVideoMuted: false, volumeLevel: 0.82 });
  const suppressClickTimerRef = useRef<number | null>(null);
  const shareStatusTimerRef = useRef<number | null>(null);
  const commentSheetDragRef = useRef<CommentSheetDragState>({ pointerId: null, startY: 0, dragging: false });
  const dragState = useRef<DragState>({ pointerId: null, lastX: 0, dragging: false, didMove: false, suppressClick: false });
  const wheelLockRef = useRef(0);
  const activeReel = displayReels[activeIndex] ?? null;
  const activeComments = activeReel ? commentsByReel[activeReel.id] ?? [] : [];

  const totalViews = useMemo(() => displayReels.reduce((sum, reel) => sum + reel.views, 0), [displayReels]);
  const totalLikes = useMemo(() => displayReels.reduce((sum, reel) => sum + reel.likes, 0), [displayReels]);
  const rotateBy = useCallback((step: number) => {
    setActiveCurrentTime(0);
    setActiveDuration(0);
    setIsActivePlaying(true);
    setIsCommentSheetOpen(false);
    setCommentSheetOffsetY(0);
    setCommentDraft("");
    setActiveIndex((previous) => (previous + step + displayReels.length) % displayReels.length);
  }, [displayReels.length]);

  const refreshReels = () => {
    setDisplayReels((previous) => {
      const shuffled = [...previous];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
      }
      return shuffled;
    });
    setActiveIndex(0);
    setAutoScrollMode(false);
    setActiveCurrentTime(0);
    setActiveDuration(0);
    setIsActivePlaying(true);
    setIsCommentSheetOpen(false);
    setCommentSheetOffsetY(0);
    setCommentDraft("");
  };

  useEffect(() => {
    let cancelled = false;
    void listPosts("REEL", 40)
      .then((rows) => {
        if (cancelled || rows.length === 0) {
          return;
        }
        const mapped = rows.map(apiPostToReel);
        setDisplayReels(mapped);
        setCommentsByReel(
          Object.fromEntries(
            mapped.map((reel) => [
              reel.id,
              [
                { id: `${reel.id}-c1`, author: "Alan R.", text: "This one looks amazing.", time: "2m" },
                { id: `${reel.id}-c2`, author: "Mary N.", text: "Keep posting more like this.", time: "7m" },
              ],
            ]),
          ),
        );
        setActiveIndex(0);
        setLikedByReel({});
        setExtraCommentCounts({});
        setActiveCurrentTime(0);
        setActiveDuration(0);
        setIsActivePlaying(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    audioSettingsRef.current = { isVideoMuted, volumeLevel };
  }, [isVideoMuted, volumeLevel]);

  useEffect(
    () => () => {
      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
      if (shareStatusTimerRef.current !== null) {
        window.clearTimeout(shareStatusTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const video = activeVideoRef.current;
    if (!video) {
      return;
    }
    const { isVideoMuted: currentMuted, volumeLevel: currentVolume } = audioSettingsRef.current;
    video.currentTime = 0;
    video.muted = currentMuted;
    video.volume = currentVolume;
    const playPromise = video.play();
    if (playPromise) {
      playPromise
        .then(() => {
          setIsActivePlaying(true);
        })
        .catch(() => {
          if (!currentMuted) {
            setIsVideoMuted(true);
            video.muted = true;
            video
              .play()
              .then(() => setIsActivePlaying(true))
              .catch(() => setIsActivePlaying(false));
            return;
          }
          setIsActivePlaying(false);
        });
    }
  }, [activeIndex, autoScrollMode]);

  useEffect(() => {
    const video = activeVideoRef.current;
    if (!video) {
      return;
    }
    video.muted = isVideoMuted;
    video.volume = volumeLevel;
  }, [isVideoMuted, volumeLevel, activeIndex]);

  useEffect(() => {
    if (!autoScrollMode) {
      return;
    }
    const timer = window.setTimeout(() => {
      rotateBy(1);
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [activeIndex, autoScrollMode, rotateBy]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    setAutoScrollMode(false);
    if (suppressClickTimerRef.current !== null) {
      window.clearTimeout(suppressClickTimerRef.current);
      suppressClickTimerRef.current = null;
    }
    dragState.current.suppressClick = false;
    dragState.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      dragging: true,
      didMove: false,
      suppressClick: false,
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
    state.didMove = true;
    rotateBy(deltaX < 0 ? 1 : -1);
    state.lastX = event.clientX;
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (state.pointerId !== event.pointerId) {
      return;
    }
    if (state.didMove) {
      state.suppressClick = true;
      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
      suppressClickTimerRef.current = window.setTimeout(() => {
        dragState.current.suppressClick = false;
        suppressClickTimerRef.current = null;
      }, 120);
    }
    state.dragging = false;
    state.pointerId = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - wheelLockRef.current < 220) {
      return;
    }
    const dominantDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (Math.abs(dominantDelta) < 8) {
      return;
    }
    wheelLockRef.current = now;
    setAutoScrollMode(false);
    rotateBy(dominantDelta > 0 ? 1 : -1);
    event.preventDefault();
  };

  const handleArrowClick = (event: React.MouseEvent<HTMLButtonElement>, step: number) => {
    event.preventDefault();
    event.stopPropagation();
    setAutoScrollMode(false);
    rotateBy(step);
  };

  const stopPointerPropagation = (event: React.PointerEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const stopClickPropagation = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const handleActiveLoadedMetadata = () => {
    const video = activeVideoRef.current;
    if (!video) {
      return;
    }
    setActiveDuration(Number.isFinite(video.duration) ? video.duration : 0);
    setActiveCurrentTime(video.currentTime || 0);
  };

  const handleActiveTimeUpdate = () => {
    const video = activeVideoRef.current;
    if (!video) {
      return;
    }
    setActiveCurrentTime(video.currentTime || 0);
  };

  const handleSeekChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const video = activeVideoRef.current;
    if (!video) {
      return;
    }
    const nextTime = Number(event.target.value);
    video.currentTime = nextTime;
    setActiveCurrentTime(nextTime);
  };

  const closeCommentSheet = () => {
    setIsCommentSheetOpen(false);
    setCommentSheetOffsetY(0);
    setIsCommentSheetDragging(false);
    commentSheetDragRef.current = { pointerId: null, startY: 0, dragging: false };
  };

  const handleCommentSheetBackdropClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopClickPropagation(event);
    closeCommentSheet();
  };

  const handleCommentSheetPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    commentSheetDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      dragging: true,
    };
    setIsCommentSheetDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleCommentSheetPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = commentSheetDragRef.current;
    if (!state.dragging || state.pointerId !== event.pointerId) {
      return;
    }
    const delta = event.clientY - state.startY;
    setCommentSheetOffsetY(delta > 0 ? Math.min(delta, 420) : 0);
  };

  const handleCommentSheetPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = commentSheetDragRef.current;
    if (state.pointerId !== event.pointerId) {
      return;
    }
    state.dragging = false;
    state.pointerId = null;
    setIsCommentSheetDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (commentSheetOffsetY > 110) {
      closeCommentSheet();
      return;
    }
    setCommentSheetOffsetY(0);
  };

  const handleLikeToggle = (event: React.MouseEvent<HTMLButtonElement>, reelId: string) => {
    stopClickPropagation(event);
    setLikedByReel((previous) => ({ ...previous, [reelId]: !previous[reelId] }));
  };

  const handleOpenComments = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopClickPropagation(event);
    setAutoScrollMode(false);
    setIsCommentSheetOpen(true);
    setCommentSheetOffsetY(0);
  };

  const handleShareClick = async (event: React.MouseEvent<HTMLButtonElement>, reelId: string, title: string, caption: string) => {
    stopClickPropagation(event);
    const shareUrl = `${window.location.origin}/app/reels?focus=${reelId}`;

    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: `${title} · Suzi Reels`,
          text: caption,
          url: shareUrl,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // Ignore cancellation and unsupported cases while keeping UI feedback.
    }

    setSharedReelId(reelId);
    if (shareStatusTimerRef.current !== null) {
      window.clearTimeout(shareStatusTimerRef.current);
    }
    shareStatusTimerRef.current = window.setTimeout(() => {
      setSharedReelId(null);
      shareStatusTimerRef.current = null;
    }, 1600);
  };

  const handleCommentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeReel) {
      return;
    }
    const text = commentDraft.trim();
    if (!text) {
      return;
    }

    const nextComment: ReelComment = {
      id: `${activeReel.id}-${Date.now()}`,
      author: "You",
      text,
      time: "now",
    };

    setCommentsByReel((previous) => ({
      ...previous,
      [activeReel.id]: [nextComment, ...(previous[activeReel.id] ?? [])],
    }));
    setExtraCommentCounts((previous) => ({
      ...previous,
      [activeReel.id]: (previous[activeReel.id] ?? 0) + 1,
    }));
    setCommentDraft("");
  };

  const handleMuteToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopClickPropagation(event);
    setIsVideoMuted((value) => !value);
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextVolume = Number(event.target.value);
    if (nextVolume <= 0) {
      setVolumeLevel(0);
      setIsVideoMuted(true);
      return;
    }
    setVolumeLevel(nextVolume);
    if (isVideoMuted) {
      setIsVideoMuted(false);
    }
  };

  const toggleActivePlayback = () => {
    const video = activeVideoRef.current;
    if (!video) {
      return;
    }
    setAutoScrollMode(false);
    if (video.paused) {
      const playPromise = video.play();
      if (playPromise) {
        playPromise
          .then(() => setIsActivePlaying(true))
          .catch(() => setIsActivePlaying(false));
      } else {
        setIsActivePlaying(true);
      }
      return;
    }
    video.pause();
    setIsActivePlaying(false);
  };

  const handleActiveVideoClick = (event: React.MouseEvent<HTMLVideoElement>) => {
    stopClickPropagation(event);
    toggleActivePlayback();
  };

  const handleCardActivate = (index: number) => {
    if (dragState.current.suppressClick) {
      dragState.current.suppressClick = false;
      return;
    }
    if (index === activeIndex) {
      toggleActivePlayback();
      return;
    }
    setActiveCurrentTime(0);
    setActiveDuration(0);
    setIsActivePlaying(true);
    setIsCommentSheetOpen(false);
    setCommentSheetOffsetY(0);
    setCommentDraft("");
    setActiveIndex(index);
    setAutoScrollMode(false);
  };

  return (
    <section className="space-y-6">
      <Panel className="[background:transparent] border-cyan-300/24 p-4 shadow-none sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-[0.8rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-fuchsia-100/92 shadow-[0_0_12px_rgba(157,78,221,0.28)]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4.5 w-4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                  <path d="m10 9 5 3-5 3V9Z" />
                </svg>
              </span>
              <h2 className="text-[2rem] font-bold tracking-tight text-white">Suzi Reels</h2>
            </div>
            <p className="mt-1 text-sm text-cyan-100/72">Discover short moments from across Suzi Chat.</p>
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
                  {activeIndex + 1}/{displayReels.length}
                </p>
              </div>
              <button
                type="button"
                onClick={refreshReels}
                className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/34 bg-cyan-300/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-cyan-100/86 transition hover:border-cyan-200/60 hover:bg-cyan-300/18 hover:text-white"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 12a8 8 0 1 1-2.34-5.66" />
                  <path d="M20 4v6h-6" />
                </svg>
                Refresh
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAutoScrollMode((value) => !value)}
              className={cx(
                "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition",
                autoScrollMode
                  ? "border-cyan-300/42 bg-cyan-300/18 text-cyan-100"
                  : "border-cyan-300/24 bg-[rgba(20,13,63,0.62)] text-cyan-100/80 hover:border-cyan-300/42 hover:text-white",
              )}
            >
              Auto-Scroll
              <span
                className={cx(
                  "relative inline-flex h-5 w-9 items-center rounded-full border transition",
                  autoScrollMode ? "border-cyan-200/52 bg-cyan-300/24" : "border-white/24 bg-white/10",
                )}
              >
                <span
                  className={cx(
                    "h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.42)] transition",
                    autoScrollMode ? "translate-x-[1.05rem]" : "translate-x-0.5",
                  )}
                />
              </span>
            </button>
          </div>
        </div>

        <div
          className="relative isolate mt-5 h-[27.5rem] overflow-hidden rounded-[1.05rem] border border-cyan-300/16 bg-transparent [perspective:1200px] sm:h-[39rem]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onWheel={handleWheel}
          style={{ touchAction: "pan-y", transformStyle: "preserve-3d" }}
        >
            <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
              {displayReels.map((reel, index) => {
                const offset = getCircularOffset(index, activeIndex, displayReels.length);
                const layer = getLayerForOffset(offset);
                if (!layer) {
                  return null;
                }
                const isLiked = Boolean(likedByReel[reel.id]);
                const likeCount = reel.likes + (isLiked ? 1 : 0);
                const commentCount = reel.comments + (extraCommentCounts[reel.id] ?? 0);
                const isShared = sharedReelId === reel.id;

                return (
                  <div
                    key={reel.id}
                    className="pointer-events-none absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleCardActivate(index)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleCardActivate(index);
                        }
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
                          key={`${reel.id}-${autoScrollMode ? "auto-scroll" : "manual"}`}
                          ref={activeVideoRef}
                          src={reel.video}
                          className="h-full w-full bg-[rgba(6,9,28,0.35)] object-contain"
                          autoPlay
                          muted={isVideoMuted}
                          playsInline
                          loop={!autoScrollMode}
                          onPointerDown={stopPointerPropagation}
                          onClick={handleActiveVideoClick}
                          onPlay={() => setIsActivePlaying(true)}
                          onPause={() => setIsActivePlaying(false)}
                          onLoadedMetadata={handleActiveLoadedMetadata}
                          onTimeUpdate={handleActiveTimeUpdate}
                          onEnded={() => {
                            if (autoScrollMode) {
                              rotateBy(1);
                            }
                          }}
                          preload="metadata"
                          aria-label={`${reel.title} active reel`}
                        />
                      ) : (
                        <video
                          src={reel.video}
                          className="h-full w-full bg-[rgba(6,9,28,0.3)] object-contain"
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          aria-label={`${reel.title} reel preview`}
                        />
                      )}

                      <div
                        className={cx(
                          "pointer-events-none absolute inset-0",
                          layer.isActive
                            ? "bg-[linear-gradient(180deg,rgba(9,11,30,0.02),rgba(9,11,30,0.16)_48%,rgba(9,11,30,0.62))]"
                            : "bg-[linear-gradient(180deg,rgba(9,11,30,0.16),rgba(9,11,30,0.46)_50%,rgba(9,11,30,0.84))]",
                          reel.tone,
                        )}
                      />

                      {layer.isActive ? (
                        <>
                          <div className="pointer-events-auto absolute left-2.5 top-2.5 z-30 flex items-center gap-2 rounded-full border border-cyan-300/36 bg-[rgba(8,12,30,0.7)] px-2 py-1.5 shadow-[0_0_14px_rgba(34,211,238,0.2)]">
                            <button
                              type="button"
                              onPointerDown={stopPointerPropagation}
                              onClick={handleMuteToggle}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-cyan-50/92 transition hover:text-white"
                              aria-label={isVideoMuted ? "Unmute video" : "Mute video"}
                            >
                              {isVideoMuted || volumeLevel <= 0 ? <VolumeOffIcon /> : <VolumeOnIcon />}
                            </button>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={isVideoMuted ? 0 : volumeLevel}
                              onPointerDown={stopPointerPropagation}
                              onClick={stopClickPropagation}
                              onChange={handleVolumeChange}
                              className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/26 accent-cyan-300 sm:w-24"
                              aria-label="Adjust reel volume"
                            />
                          </div>

                          <div className="pointer-events-auto absolute bottom-[6.2rem] right-2.5 z-30 flex flex-col items-center gap-2.5 sm:right-3.5 sm:bottom-[6.8rem]">
                            <Link
                              href="/app/profile"
                              onPointerDown={stopPointerPropagation}
                              onClick={stopClickPropagation}
                              className="relative h-11 w-11 overflow-hidden rounded-full border border-white/45 bg-[rgba(10,12,30,0.74)] shadow-[0_0_16px_rgba(0,0,0,0.3)]"
                              aria-label={`Open ${reel.author} profile`}
                            >
                              <Image
                                src={reel.avatar}
                                alt={`${reel.author} avatar`}
                                fill
                                sizes="44px"
                                className="object-cover"
                              />
                            </Link>

                            <button
                              type="button"
                              onPointerDown={stopPointerPropagation}
                              onClick={(event) => handleLikeToggle(event, reel.id)}
                              className={cx(
                                "inline-flex flex-col items-center gap-1 text-white/95 transition",
                                isLiked ? "text-rose-400 drop-shadow-[0_0_10px_rgba(251,113,133,0.72)]" : "hover:text-white",
                              )}
                              aria-label={`Like ${reel.title}`}
                            >
                              <HeartIcon className="h-7 w-7" />
                              <span className="text-[0.8rem] font-semibold text-white">{formatCompact(likeCount)}</span>
                            </button>

                            <button
                              type="button"
                              onPointerDown={stopPointerPropagation}
                              onClick={handleOpenComments}
                              className="inline-flex flex-col items-center gap-1 text-white/95 transition hover:text-white"
                              aria-label={`Comment on ${reel.title}`}
                            >
                              <ChatIcon className="h-7 w-7" />
                              <span className="text-[0.8rem] font-semibold text-white">{formatCompact(commentCount)}</span>
                            </button>

                            <button
                              type="button"
                              onPointerDown={stopPointerPropagation}
                              onClick={(event) => handleShareClick(event, reel.id, reel.title, reel.caption)}
                              className="inline-flex flex-col items-center gap-1 text-white/95 transition hover:text-white"
                              aria-label={`Share ${reel.title}`}
                            >
                              <ShareIcon className="h-7 w-7" />
                              <span className="text-[0.8rem] font-semibold text-white">{isShared ? "Sent" : "Share"}</span>
                            </button>
                          </div>

                          <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 p-3 sm:p-4">
                            <div
                              className="rounded-[1rem] border border-cyan-300/14 bg-[rgba(6,10,22,0.12)] px-3 py-2.5 sm:px-3.5 sm:py-3"
                              style={{ backdropFilter: "blur(3px)" }}
                            >
                              <Link
                                href="/app/profile"
                                onPointerDown={stopPointerPropagation}
                                onClick={stopClickPropagation}
                                className="inline-block text-[0.95rem] font-semibold text-cyan-100 transition hover:text-white sm:text-[1rem]"
                              >
                                {formatAuthorLink(reel.author, reel.handle)}
                              </Link>
                              <p className="mt-0.5 line-clamp-1 text-[0.88rem] text-cyan-50/92 sm:text-[0.95rem]">{reel.title}</p>

                              <div className="mt-2.5">
                                <input
                                  type="range"
                                  min={0}
                                  max={activeDuration > 0 ? activeDuration : 1}
                                  step={0.1}
                                  value={Math.min(activeCurrentTime, activeDuration > 0 ? activeDuration : 1)}
                                  onPointerDown={stopPointerPropagation}
                                  onClick={stopClickPropagation}
                                  onChange={handleSeekChange}
                                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/26 accent-cyan-300"
                                  aria-label="Seek reel timeline"
                                />
                                <div className="mt-1.5 flex items-center justify-between text-[0.66rem] font-medium tracking-[0.08em] text-cyan-100/78 sm:text-[0.68rem]">
                                  <span>{formatTime(activeCurrentTime)}</span>
                                  <span>{formatTime(activeDuration)}</span>
                                </div>
                              </div>

                              {!isActivePlaying ? (
                                <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-cyan-100/70">
                                  Paused
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className={cx("absolute inset-0 z-40", isCommentSheetOpen ? "pointer-events-auto" : "pointer-events-none")}>
                            <button
                              type="button"
                              onPointerDown={stopPointerPropagation}
                              onClick={handleCommentSheetBackdropClick}
                              className={cx(
                                "absolute inset-0 bg-[rgba(5,8,24,0.58)] transition-opacity duration-300",
                                isCommentSheetOpen ? "opacity-100" : "opacity-0",
                              )}
                              aria-label="Close comments"
                            />

                            <div
                              onPointerDown={handleCommentSheetPointerDown}
                              onPointerMove={handleCommentSheetPointerMove}
                              onPointerUp={handleCommentSheetPointerEnd}
                              onPointerCancel={handleCommentSheetPointerEnd}
                              className="absolute inset-x-0 bottom-0 h-[80%] rounded-t-[1.2rem] border border-cyan-300/24 bg-[linear-gradient(180deg,rgba(18,12,57,0.96),rgba(12,9,46,0.95))] px-3 pb-3 pt-2.5 shadow-[0_-16px_32px_rgba(7,11,30,0.52)] backdrop-blur-xl sm:px-4"
                              style={{
                                transform: isCommentSheetOpen ? `translateY(${commentSheetOffsetY}px)` : "translateY(105%)",
                                transition: isCommentSheetDragging ? "none" : "transform 280ms ease",
                              }}
                            >
                              <div className="mx-auto mb-2 h-1 w-14 rounded-full bg-cyan-100/32" />
                              <div className="flex items-center justify-between">
                                <p className="text-[0.86rem] font-semibold uppercase tracking-[0.14em] text-cyan-100/88">Comments</p>
                                <button
                                  type="button"
                                  onPointerDown={stopPointerPropagation}
                                  onClick={(event) => {
                                    stopClickPropagation(event);
                                    closeCommentSheet();
                                  }}
                                  className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-cyan-100/72 transition hover:text-white"
                                >
                                  Close
                                </button>
                              </div>

                              <div className="suzi-scrollbar mt-2 h-[calc(100%-7.5rem)] space-y-2 overflow-y-auto pr-1">
                                {activeComments.map((comment) => (
                                  <div
                                    key={comment.id}
                                    className="rounded-[0.9rem] border border-cyan-300/16 bg-[rgba(10,12,34,0.55)] px-3 py-2"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-[0.84rem] font-semibold text-cyan-50">{comment.author}</p>
                                      <span className="text-[0.68rem] font-medium text-cyan-100/62">{comment.time}</span>
                                    </div>
                                    <p className="mt-1 text-[0.82rem] leading-5 text-cyan-100/84">{comment.text}</p>
                                  </div>
                                ))}
                              </div>

                              <form onSubmit={handleCommentSubmit} className="mt-2.5 flex items-center gap-2">
                                <input
                                  value={commentDraft}
                                  onChange={(event) => setCommentDraft(event.target.value)}
                                  onPointerDown={stopPointerPropagation}
                                  onClick={stopClickPropagation}
                                  placeholder="Write a comment..."
                                  className="h-10 flex-1 rounded-[0.85rem] border border-cyan-300/24 bg-[rgba(9,12,32,0.7)] px-3 text-[0.82rem] text-cyan-50 outline-none placeholder:text-cyan-100/48 focus:border-cyan-200/52"
                                />
                                <button
                                  type="submit"
                                  onPointerDown={stopPointerPropagation}
                                  className="inline-flex h-10 items-center justify-center rounded-[0.85rem] border border-cyan-300/28 bg-cyan-300/14 px-3 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-cyan-100 transition hover:border-cyan-200/58 hover:bg-cyan-300/24 hover:text-white"
                                >
                                  Post
                                </button>
                              </form>
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
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onPointerDown={stopPointerPropagation}
              onClick={(event) => handleArrowClick(event, -1)}
              className="absolute left-3 top-1/2 z-[80] inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300/34 bg-[rgba(9,10,31,0.56)] text-cyan-100/86 transition hover:border-cyan-200/62 hover:text-white sm:left-4"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 6-6 6 6 6" />
              </svg>
            </button>

            <button
              type="button"
              onPointerDown={stopPointerPropagation}
              onClick={(event) => handleArrowClick(event, 1)}
              className="absolute right-3 top-1/2 z-[80] inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300/34 bg-[rgba(9,10,31,0.56)] text-cyan-100/86 transition hover:border-cyan-200/62 hover:text-white sm:right-4"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
        </div>
      </Panel>
    </section>
  );
}
