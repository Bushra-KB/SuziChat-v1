"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  advanceCarouselIndex,
  createInitialFeedCarouselDragState,
  FEED_CAROUSEL_NAV_LOCK_MS,
  FEED_CAROUSEL_WHEEL_COOLDOWN_MS,
  getCircularOffset,
  resolveFeedSwipeStep,
  resolveFeedWheelStep,
  type FeedCarouselDragState,
} from "@/components/app/feed-carousel-nav";
import {
  getFeedCarouselLayer,
  feedCardActionBtnClassName,
  feedCardActionIconClassName,
  feedCardActionLabelClassName,
  feedCardActionRailClassName,
  feedCardFullscreenBtnClassName,
  feedCardCaptionPanelClassName,
  feedCardProfileClassName,
  feedCaptionAuthorClassName,
  feedCaptionBodyClassName,
  feedCaptionTitleClassName,
  feedCaptionVisibilityClassName,
  feedCommentSheetClassName,
  feedCardVolumeChromeClassName,
} from "@/components/app/feed-carousel-layer";
import { FeedShareSheet } from "@/components/app/feed-share-sheet";
import { FeedUploadProgress } from "@/components/app/feed-upload-progress";
import {
  PostsDiscoveryRail,
  type PostsDiscoveryItem,
} from "@/components/app/posts-discovery-rail";
import { Panel, cx } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import {
  createPost,
  createPostComment,
  getPostEngagement,
  listMyPosts,
  listPostComments,
  listPosts,
  togglePostLike,
  trackPostView,
  uploadReelVideo,
} from "@/lib/posts-client";
import { resolvePostMediaUrl, validatePostMediaUrl } from "@/lib/post-media-url";
import { apiPostToReel } from "@/lib/post-ui-mappers";
import { publicProfileHref, reelAuthorProfileHref } from "@/lib/profile-links";
import { getRealtimeSocket } from "@/lib/realtime-client";
import { resolveUserAvatarUrl } from "@/lib/avatar-url";
import { subscribePostsFeedChannel, subscribeUserProfileUpdates } from "@/lib/realtime-feed";
import type { Reel } from "@/lib/v1-mock-data";

type ReelComment = {
  id: string;
  authorId?: string;
  authorUsername?: string;
  authorAvatarUrl?: string | null;
  author: string;
  text: string;
  time: string;
};

type ReelCreateVisibility = "Public" | "Friends";

/** Must match API `REEL_UPLOAD_MAX_BYTES`. */
const REEL_MAX_FILE_BYTES = 600 * 1024 * 1024;

const VIDEO_FILE_ACCEPT =
  "video/*,.mp4,.m4v,.mov,.webm,.mkv,.avi,.3gp,.mpeg,.mpg,.ogv,video/quicktime";

// The carousel only shows the active card plus a couple of neighbours, so a
// smaller initial page loads noticeably faster. More can be paginated later.
const REELS_FEED_TAKE = 30;

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenStageElement = HTMLDivElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function isProbablyVideoFile(file: File): boolean {
  const t = (file.type ?? "").toLowerCase();
  if (t.startsWith("video/")) {
    return true;
  }
  const name = file.name ?? "";
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";
  return [
    ".mp4",
    ".m4v",
    ".mov",
    ".webm",
    ".mkv",
    ".avi",
    ".3gp",
    ".mpeg",
    ".mpg",
    ".ogv",
    ".flv",
  ].includes(ext);
}

type CommentSheetDragState = {
  pointerId: number | null;
  startY: number;
  dragging: boolean;
};

function formatCompact(value: number) {
  if (value >= 1000) {
    const compact = value / 1000;
    return `${compact % 1 === 0 ? compact.toFixed(0) : compact.toFixed(1)}K`;
  }

  return String(value);
}

function getFullscreenElement() {
  if (typeof document === "undefined") {
    return null;
  }
  const fullscreenDocument = document as FullscreenDocument;
  return fullscreenDocument.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? null;
}

function isFullscreenElementWithinStage(stageEl: HTMLElement | null, fullscreenEl: Element | null) {
  return Boolean(stageEl && fullscreenEl && (fullscreenEl === stageEl || stageEl.contains(fullscreenEl)));
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

function EyeIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function FilmIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 8h9l2-2h5v12h-5l-2-2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Z" />
      <path d="m15 10 4-2v8l-4-2" />
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

function PlayIcon({ className = "h-2.5 w-2.5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className = "h-2.5 w-2.5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
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

export function ReelsFeed() {
  const searchParams = useSearchParams();
  const [displayReels, setDisplayReels] = useState<Reel[]>([]);
  const [isLoadingReels, setIsLoadingReels] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoScrollMode, setAutoScrollMode] = useState(true);
  const [likedByReel, setLikedByReel] = useState<Record<string, boolean>>({});
  const [commentsByReel, setCommentsByReel] = useState<Record<string, ReelComment[]>>({});
  const [commentDraft, setCommentDraft] = useState("");
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);
  const [commentSheetOffsetY, setCommentSheetOffsetY] = useState(0);
  const [isCommentSheetDragging, setIsCommentSheetDragging] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ id: string; url: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMediaUrl, setCreateMediaUrl] = useState("");
  const [createCaption, setCreateCaption] = useState("");
  const [createVisibility, setCreateVisibility] = useState<ReelCreateVisibility>("Public");
  const [createBusy, setCreateBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [createError, setCreateError] = useState("");
  const [dragOverCreate, setDragOverCreate] = useState(false);
  const [isNativeFullscreenCard, setIsNativeFullscreenCard] = useState(false);
  const [isFullscreenFallback, setIsFullscreenFallback] = useState(false);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [activeCurrentTime, setActiveCurrentTime] = useState(0);
  const [activeDuration, setActiveDuration] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0.82);
  const [isActivePlaying, setIsActivePlaying] = useState(true);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioSettingsRef = useRef({ isVideoMuted: false, volumeLevel: 0.82 });
  const suppressClickTimerRef = useRef<number | null>(null);
  const commentSheetDragRef = useRef<CommentSheetDragState>({ pointerId: null, startY: 0, dragging: false });
  const dragState = useRef<FeedCarouselDragState>(createInitialFeedCarouselDragState());
  const wheelLockRef = useRef(0);
  const navLockRef = useRef(false);
  const appliedFocusIdRef = useRef<string | null>(null);
  const activeReel = displayReels[activeIndex] ?? null;
  const activeComments = activeReel ? commentsByReel[activeReel.id] ?? [] : [];
  const isFullscreenCard = isNativeFullscreenCard || isFullscreenFallback;

  const discoveryItems = useMemo<PostsDiscoveryItem[]>(
    () =>
      displayReels.map((reel) => ({
        id: reel.id,
        mediaUrl: reel.video,
        title: reel.title,
        author: reel.author,
        authorId: reel.authorId,
        views: reel.views,
        likes: reel.likes,
        kind: "video" as const,
      })),
    [displayReels],
  );

  const focusReelById = useCallback(
    (id: string) => {
      const index = displayReels.findIndex((row) => row.id === id);
      if (index < 0) {
        return;
      }
      setActiveIndex(index);
      setAutoScrollMode(false);
      setActiveCurrentTime(0);
      setActiveDuration(0);
      setIsActivePlaying(true);
      setIsCommentSheetOpen(false);
      setCommentSheetOffsetY(0);
      setCommentDraft("");
    },
    [displayReels],
  );

  const rotateBy = useCallback((step: number) => {
    if (displayReels.length === 0 || navLockRef.current) {
      return;
    }
    navLockRef.current = true;
    window.setTimeout(() => {
      navLockRef.current = false;
    }, FEED_CAROUSEL_NAV_LOCK_MS);
    setActiveCurrentTime(0);
    setActiveDuration(0);
    setIsActivePlaying(true);
    setIsCommentSheetOpen(false);
    setCommentSheetOffsetY(0);
    setCommentDraft("");
    setActiveIndex((previous) => advanceCarouselIndex(previous, step, displayReels.length));
  }, [displayReels.length]);

  const refreshReels = useCallback(() => {
    const session = getStoredAuthSession();
    const loader = session?.accessToken
      ? listMyPosts(session.accessToken, "REEL", REELS_FEED_TAKE)
      : listPosts("REEL", REELS_FEED_TAKE);
    void loader
      .then((rows) => {
        const mapped = rows.map(apiPostToReel);
        setDisplayReels(mapped);
        setActiveIndex(0);
        setLikedByReel({});
        setCommentsByReel({});
        setActiveCurrentTime(0);
        setActiveDuration(0);
        setIsActivePlaying(true);
      })
      .catch(() => {});
    setAutoScrollMode(false);
    setIsCommentSheetOpen(false);
    setCommentSheetOffsetY(0);
    setCommentDraft("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const session = getStoredAuthSession();
    const loader = session?.accessToken
      ? listMyPosts(session.accessToken, "REEL", REELS_FEED_TAKE)
      : listPosts("REEL", REELS_FEED_TAKE);
    void loader
      .then((rows) => {
        if (cancelled) {
          return;
        }
        const mapped = rows.map(apiPostToReel);
        setDisplayReels(mapped);
        setActiveIndex(0);
        setLikedByReel({});
        setCommentsByReel({});
        setActiveCurrentTime(0);
        setActiveDuration(0);
        setIsActivePlaying(true);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setIsLoadingReels(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      return;
    }
    return subscribePostsFeedChannel(session.accessToken, "REEL", () => {
      refreshReels();
    });
  }, [refreshReels]);

  useEffect(() => {
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      return;
    }
    return subscribeUserProfileUpdates(session.accessToken, (payload) => {
      const user = payload.user;
      if (!user?.id) {
        return;
      }
      const name = user.displayName?.trim() || user.username;
      setDisplayReels((prev) =>
        prev.map((reel) =>
          reel.authorId === user.id
            ? {
                ...reel,
                author: name,
                authorUsername: user.username,
                handle: `@${user.username}`,
                avatar: resolveUserAvatarUrl(user.avatarUrl),
              }
            : reel,
        ),
      );
      setCommentsByReel((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([postId, comments]) => [
            postId,
            comments.map((comment) =>
              comment.authorId === user.id
                ? {
                    ...comment,
                    author: name,
                    authorUsername: user.username,
                    authorAvatarUrl: user.avatarUrl,
                  }
                : comment,
            ),
          ]),
        ),
      );
    });
  }, []);

  useEffect(() => {
    const focusId = searchParams.get("focus");
    if (!focusId) {
      appliedFocusIdRef.current = null;
      return;
    }
    if (appliedFocusIdRef.current === focusId) {
      return;
    }
    if (!focusId || displayReels.length === 0) {
      return;
    }
    const index = displayReels.findIndex((reel) => reel.id === focusId);
    if (index >= 0) {
      setActiveIndex(index);
      setAutoScrollMode(false);
      setActiveCurrentTime(0);
      setActiveDuration(0);
      setIsCommentSheetOpen(false);
      setCommentSheetOffsetY(0);
      setCommentDraft("");
      appliedFocusIdRef.current = focusId;
    }
  }, [displayReels, searchParams]);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const session = getStoredAuthSession();
    if (!session?.accessToken || !activeReel) {
      return;
    }
    void trackPostView(session.accessToken, activeReel.id)
      .then((engagement) => {
        setDisplayReels((prev) =>
          prev.map((reel) =>
            reel.id === engagement.postId
              ? {
                  ...reel,
                  likes: engagement.likes,
                  comments: engagement.comments,
                  views: engagement.views,
                }
              : reel,
          ),
        );
      })
      .catch(() => {});
  }, [activeReel?.id]);

  useEffect(() => {
    const session = getStoredAuthSession();
    if (!session?.accessToken || !activeReel) {
      return;
    }
    void getPostEngagement(session.accessToken, activeReel.id)
      .then((engagement) => {
        setLikedByReel((prev) => ({ ...prev, [activeReel.id]: Boolean(engagement.likedByMe) }));
        setDisplayReels((prev) =>
          prev.map((reel) =>
            reel.id === engagement.postId
              ? {
                  ...reel,
                  likes: engagement.likes,
                  comments: engagement.comments,
                  views: engagement.views,
                }
              : reel,
          ),
        );
      })
      .catch(() => {});
  }, [activeReel?.id]);

  useEffect(() => {
    const session = getStoredAuthSession();
    if (!activeReel || !session?.accessToken) {
      return;
    }
    void listPostComments(session.accessToken, activeReel.id, 80)
      .then((rows) => {
        const seen = new Set<string>();
        const mapped: ReelComment[] = [];
        for (const row of rows) {
          if (seen.has(row.id)) {
            continue;
          }
          seen.add(row.id);
          mapped.push({
            id: row.id,
            authorId: row.user.id,
            authorUsername: row.user.username,
            authorAvatarUrl: row.user.avatarUrl,
            author: row.user.displayName?.trim() || row.user.username,
            text: row.body,
            time: "now",
          });
        }
        setCommentsByReel((prev) => ({
          ...prev,
          [activeReel.id]: mapped,
        }));
      })
      .catch(() => {});
  }, [activeReel?.id]);

  useEffect(() => {
    const session = getStoredAuthSession();
    if (!session?.accessToken || displayReels.length === 0) {
      return;
    }
    const socket = getRealtimeSocket(session.accessToken);
    const watch = () => {
      for (const reel of displayReels) {
        socket.emit("post:watch", { postId: reel.id });
      }
    };
    const onEngagement = (payload: {
      postId?: string;
      likes?: number;
      comments?: number;
      views?: number;
    }) => {
      if (!payload?.postId) {
        return;
      }
      setDisplayReels((prev) =>
        prev.map((reel) =>
          reel.id === payload.postId
            ? {
                ...reel,
                likes: typeof payload.likes === "number" ? payload.likes : reel.likes,
                comments: typeof payload.comments === "number" ? payload.comments : reel.comments,
                views: typeof payload.views === "number" ? payload.views : reel.views,
              }
            : reel,
        ),
      );
    };
    const onComment = (payload: {
      postId?: string;
      comment?: {
        id?: string;
        body?: string;
        user?: { id?: string; username?: string; displayName?: string | null; avatarUrl?: string | null };
      };
    }) => {
      const postId = payload?.postId;
      const comment = payload?.comment;
      const commentId = comment?.id;
      const commentBody = comment?.body;
      if (!postId || !commentId || !commentBody) {
        return;
      }
      setCommentsByReel((prev) => {
        const existing = prev[postId] ?? [];
        if (existing.some((row) => row.id === commentId)) {
          return prev;
        }
        const author =
          comment.user?.displayName?.trim() ||
          comment.user?.username ||
          "User";
        const nextComment: ReelComment = {
          id: commentId,
          authorId: comment.user?.id,
          authorUsername: comment.user?.username,
          authorAvatarUrl: comment.user?.avatarUrl,
          author,
          text: commentBody,
          time: "now",
        };
        return {
          ...prev,
          [postId]: [nextComment, ...existing],
        };
      });
    };
    socket.on("connect", watch);
    socket.on("post:engagement", onEngagement);
    socket.on("post:comment", onComment);
    if (socket.connected) {
      watch();
    }
    return () => {
      socket.off("connect", watch);
      socket.off("post:engagement", onEngagement);
      socket.off("post:comment", onComment);
    };
  }, [displayReels]);

  useEffect(() => {
    audioSettingsRef.current = { isVideoMuted, volumeLevel };
  }, [isVideoMuted, volumeLevel]);

  useEffect(
    () => () => {
      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const onFullscreenChange = () => {
      if (typeof document === "undefined") {
        return;
      }
      const fullscreenEl = getFullscreenElement();
      const stageEl = stageRef.current;
      const isStageFullscreen = isFullscreenElementWithinStage(stageEl, fullscreenEl);
      setIsNativeFullscreenCard(isStageFullscreen);
      if (isStageFullscreen) {
        setIsFullscreenFallback(false);
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    onFullscreenChange();
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    };
  }, [activeIndex, displayReels.length]);

  useEffect(() => {
    if (!isFullscreenFallback || typeof document === "undefined") {
      return;
    }
    const { documentElement, body } = document;
    const previousDocumentOverflow = documentElement.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreenFallback(false);
      }
    };
    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      documentElement.style.overflow = previousDocumentOverflow;
      body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isFullscreenFallback]);

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
      startX: event.clientX,
      startY: event.clientY,
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
    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      state.didMove = true;
    }
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (state.pointerId !== event.pointerId) {
      return;
    }
    const swipeStep = resolveFeedSwipeStep(
      event.clientX - state.startX,
      event.clientY - state.startY,
    );
    if (swipeStep !== 0) {
      state.didMove = true;
      rotateBy(swipeStep);
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
    const releasedId = state.pointerId;
    state.dragging = false;
    state.pointerId = null;
    if (releasedId !== null && event.currentTarget.hasPointerCapture(releasedId)) {
      event.currentTarget.releasePointerCapture(releasedId);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - wheelLockRef.current < FEED_CAROUSEL_WHEEL_COOLDOWN_MS) {
      return;
    }
    const step = resolveFeedWheelStep(event.deltaX, event.deltaY);
    if (step === 0) {
      return;
    }
    wheelLockRef.current = now;
    setAutoScrollMode(false);
    rotateBy(step);
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

  const toggleCardFullscreen = (event: React.MouseEvent<HTMLElement>) => {
    stopClickPropagation(event);
    const stageEl = stageRef.current;
    if (!stageEl || typeof document === "undefined") {
      return;
    }
    const fullscreenDocument = document as FullscreenDocument;
    const fullscreenEl = getFullscreenElement();
    if (isFullscreenFallback) {
      setIsFullscreenFallback(false);
      return;
    }
    if (isFullscreenElementWithinStage(stageEl, fullscreenEl)) {
      const exitFullscreen = fullscreenDocument.exitFullscreen ?? fullscreenDocument.webkitExitFullscreen;
      const exitResult = exitFullscreen?.call(fullscreenDocument);
      if (exitResult && typeof exitResult.catch === "function") {
        exitResult.catch(() => setIsNativeFullscreenCard(false));
      } else if (!exitFullscreen) {
        setIsNativeFullscreenCard(false);
      }
      return;
    }
    const fullscreenStage = stageEl as FullscreenStageElement;
    const requestFullscreen = fullscreenStage.requestFullscreen ?? fullscreenStage.webkitRequestFullscreen;
    if (!requestFullscreen) {
      setIsFullscreenFallback(true);
      return;
    }
    const requestResult = requestFullscreen.call(fullscreenStage);
    if (requestResult && typeof requestResult.then === "function") {
      requestResult.catch(() => {
        setIsFullscreenFallback(true);
      });
      return;
    }
    setIsNativeFullscreenCard(true);
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
    const captureId = event.pointerId;
    state.dragging = false;
    state.pointerId = null;
    setIsCommentSheetDragging(false);
    if (event.currentTarget.hasPointerCapture(captureId)) {
      event.currentTarget.releasePointerCapture(captureId);
    }
    if (commentSheetOffsetY > 110) {
      closeCommentSheet();
      return;
    }
    setCommentSheetOffsetY(0);
  };

  const handleLikeToggle = async (event: React.MouseEvent<HTMLButtonElement>, reelId: string) => {
    stopClickPropagation(event);
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      return;
    }
    try {
      const engagement = await togglePostLike(session.accessToken, reelId);
      setLikedByReel((previous) => ({
        ...previous,
        [reelId]: Boolean(engagement.likedByMe),
      }));
      setDisplayReels((prev) =>
        prev.map((reel) =>
          reel.id === reelId
            ? {
                ...reel,
                likes: engagement.likes,
                comments: engagement.comments,
                views: engagement.views,
              }
            : reel,
        ),
      );
    } catch {
      // no-op
    }
  };

  const handleOpenComments = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopClickPropagation(event);
    setAutoScrollMode(false);
    setShareTarget(null);
    setIsCommentSheetOpen(true);
    setCommentSheetOffsetY(0);
  };

  const handleShareClick = (event: React.MouseEvent<HTMLButtonElement>, reelId: string) => {
    stopClickPropagation(event);
    setIsCommentSheetOpen(false);
    setCommentSheetOffsetY(0);
    setShareTarget({
      id: reelId,
      url: `${window.location.origin}/app/reels?focus=${reelId}`,
    });
  };

  const handleCommentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const session = getStoredAuthSession();
    if (!session?.accessToken || !activeReel) {
      return;
    }
    const text = commentDraft.trim();
    if (!text) {
      return;
    }

    try {
      const created = await createPostComment(session.accessToken, activeReel.id, text);
      const newId = created.comment.id;
      setCommentsByReel((previous) => {
        const list = previous[activeReel.id] ?? [];
        if (list.some((row) => row.id === newId)) {
          return previous;
        }
        return {
          ...previous,
          [activeReel.id]: [
            {
              id: newId,
              authorId: created.comment.user.id,
              authorUsername: created.comment.user.username,
              authorAvatarUrl: created.comment.user.avatarUrl,
              author: created.comment.user.displayName?.trim() || created.comment.user.username,
              text: created.comment.body,
              time: "now",
            },
            ...list,
          ],
        };
      });
      setDisplayReels((prev) =>
        prev.map((reel) =>
          reel.id === activeReel.id
            ? {
                ...reel,
                likes: created.engagement.likes,
                comments: created.engagement.comments,
                views: created.engagement.views,
              }
            : reel,
        ),
      );
      setCommentDraft("");
    } catch {
      // no-op
    }
  };

  const handleCreateFile = async (file: File | null) => {
    if (!file) {
      return;
    }
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      setCreateError("Sign in to upload a video.");
      return;
    }
    if (!isProbablyVideoFile(file)) {
      setCreateError("Please choose a supported video (MP4, MOV, WebM, M4V, etc.).");
      return;
    }
    if (file.size > REEL_MAX_FILE_BYTES) {
      setCreateError(`Video must be ${REEL_MAX_FILE_BYTES / (1024 * 1024)} MB or smaller.`);
      return;
    }
    setCreateBusy(true);
    setCreateError("");
    setUploadProgress(0);
    try {
      const { mediaUrl } = await uploadReelVideo(session.accessToken, file, (percent) => {
        setUploadProgress(percent);
      });
      setCreateMediaUrl(mediaUrl);
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setCreateBusy(false);
      setUploadProgress(null);
    }
  };

  const handleCreateDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragOverCreate(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    void handleCreateFile(file);
  };

  const handleCreateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      setCreateError("Sign in and add a video URL or file.");
      return;
    }
    const mediaCheck = validatePostMediaUrl(createMediaUrl, "REEL");
    if (!mediaCheck.ok) {
      setCreateError(mediaCheck.message);
      return;
    }
    setCreateBusy(true);
    setCreateError("");
    try {
      const created = await createPost(session.accessToken, {
        kind: "REEL",
        mediaUrl: mediaCheck.value,
        caption: createCaption.trim() || undefined,
        visibility: createVisibility,
      });
      const mapped = apiPostToReel(created);
      setDisplayReels((prev) => [mapped, ...prev]);
      setActiveIndex(0);
      setShowCreateModal(false);
      setCreateMediaUrl("");
      setCreateCaption("");
      setCreateVisibility("Public");
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Could not create reel.");
    } finally {
      setCreateBusy(false);
    }
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

  const handlePlayPauseClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopClickPropagation(event);
    toggleActivePlayback();
  };

  const handleFullscreenCardWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!isFullscreenCard) {
      return;
    }
    const now = Date.now();
    if (now - wheelLockRef.current < FEED_CAROUSEL_WHEEL_COOLDOWN_MS) {
      return;
    }
    const step = resolveFeedWheelStep(event.deltaX, event.deltaY);
    if (step === 0) {
      return;
    }
    wheelLockRef.current = now;
    setAutoScrollMode(false);
    rotateBy(step);
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <section className="suzi-app-frame-fill suzi-reels-page">
      <div className="suzi-feed-with-rail flex min-h-0 flex-1">
        <PostsDiscoveryRail
          kind="REEL"
          items={discoveryItems}
          activeId={activeReel?.id ?? null}
          activeAuthorId={activeReel?.authorId ?? null}
          basePath="/app/reels"
          onSelect={focusReelById}
          className="hidden lg:flex"
        />
        <Panel className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden [background:transparent] border-cyan-300/24 p-[var(--panel-pad)] shadow-none lg:border-l-0">
        <div className="suzi-reels-header flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.8rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-fuchsia-100/92 shadow-[0_0_12px_rgba(157,78,221,0.28)]">
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
              <h2 className="text-[var(--fs-2xl)] font-bold tracking-tight text-white">Suzi Reels</h2>
            </div>
          </div>

          <div className="suzi-feed-header-actions flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/36 bg-fuchsia-500/14 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-fuchsia-100 transition hover:border-fuchsia-200/55 hover:bg-fuchsia-500/22 hover:text-white"
            >
              <FilmIcon className="h-4 w-4" />
              Create Reel
            </button>

            <button
              type="button"
              onClick={refreshReels}
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/34 bg-cyan-300/10 px-2.5 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-cyan-100/86 transition hover:border-cyan-200/60 hover:bg-cyan-300/18 hover:text-white"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 12a8 8 0 1 1-2.34-5.66" />
                <path d="M20 4v6h-6" />
              </svg>
              Refresh
            </button>

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
          ref={stageRef}
          className={cx(
            "relative isolate min-h-0 overflow-hidden border border-cyan-300/16",
            isFullscreenCard
              ? "suzi-feed-stage-fullscreen mt-0 h-full min-h-0 w-full max-w-none rounded-none bg-black"
              : "suzi-feed-stage mt-1 flex-1 rounded-[var(--panel-radius)] bg-transparent [perspective:1200px]",
            isFullscreenFallback ? "suzi-feed-stage-fullscreen--fallback" : "",
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onWheel={handleWheel}
          style={{ touchAction: "none", transformStyle: "preserve-3d" }}
        >
            <div className="suzi-feed-carousel-root" style={{ transformStyle: "preserve-3d" }}>
              {isLoadingReels && displayReels.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-cyan-100/80">
                  <span className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-200" />
                  <span className="text-xs font-medium tracking-wide">Loading reels…</span>
                </div>
              ) : null}
              {!isLoadingReels && displayReels.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center text-cyan-100/70">
                  <span className="text-sm font-semibold text-cyan-50">No reels yet</span>
                  <span className="text-xs">Be the first to share one.</span>
                </div>
              ) : null}
              {displayReels.map((reel, index) => {
                const offset = getCircularOffset(index, activeIndex, displayReels.length);
                const layer = getFeedCarouselLayer(offset);
                if (!layer) {
                  return null;
                }
                const isLiked = Boolean(likedByReel[reel.id]);
                const likeCount = reel.likes;
                const commentCount = reel.comments;
                const viewCount = reel.views ?? 0;
                const isShareOpen = shareTarget?.id === reel.id;

                if (isFullscreenCard && !layer.isActive) {
                  return null;
                }

                return (
                  <div
                    key={reel.id}
                    className="pointer-events-none absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]"
                  >
                    <div
                      data-reel-card="true"
                      data-active={layer.isActive ? "true" : "false"}
                      onWheel={layer.isActive ? handleFullscreenCardWheel : undefined}
                      className={cx(
                        "relative aspect-[9/16] overflow-hidden rounded-[1.45rem] border text-left transition-all duration-350 ease-out",
                        layer.isActive ? "pointer-events-auto" : "pointer-events-none",
                        layer.isActive && isFullscreenCard
                          ? "suzi-feed-card-fullscreen"
                          : layer.isActive
                            ? "suzi-feed-card-active h-[92%] max-h-[44rem] w-auto max-w-[86vw] sm:max-w-[26rem]"
                            : "h-[84%] max-h-[40rem] w-auto max-w-[86vw] sm:max-w-[24rem]",
                        layer.isActive
                          ? "border-cyan-300/85 shadow-[0_0_60px_rgba(0,229,255,0.42),0_0_20px_rgba(34,211,238,0.28)]"
                          : "border-cyan-300/12 brightness-[0.52] saturate-[0.82]",
                      )}
                      style={{
                        transform: isFullscreenCard ? "none" : layer.transform,
                        opacity: isFullscreenCard ? 1 : layer.opacity,
                        zIndex: layer.zIndex,
                        transformStyle: isFullscreenCard ? "flat" : "preserve-3d",
                        willChange: "transform, opacity",
                      }}
                    >
                      {layer.isActive ? (
                        <video
                          key={`${reel.id}-${autoScrollMode ? "auto-scroll" : "manual"}`}
                          ref={activeVideoRef}
                          src={reel.video}
                          className="suzi-feed-card-media absolute inset-0 h-full w-full bg-[rgba(6,9,28,0.35)] object-contain"
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
                        // Neighbour cards are decorative (heavily dimmed behind
                        // the active card). Do NOT autoplay or loop them — five
                        // simultaneous decoders is what makes the active reel
                        // stutter on mobile. Only the immediate neighbours warm
                        // their metadata so a swipe starts quickly; far cards
                        // load nothing until they become active.
                        <video
                          src={reel.video}
                          className="h-full w-full bg-[rgba(6,9,28,0.3)] object-contain"
                          muted
                          playsInline
                          preload={Math.abs(offset) <= 1 ? "metadata" : "none"}
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
                      {!layer.isActive ? (
                        <div className="pointer-events-none absolute inset-0 bg-[rgba(5,8,24,0.5)]" aria-hidden />
                      ) : null}


                      {layer.isActive ? (
                        <>
                          <div className={feedCardVolumeChromeClassName}>
                            <button
                              type="button"
                              onPointerDown={stopPointerPropagation}
                              onClick={handleMuteToggle}
                              className="inline-flex items-center justify-center rounded-full text-cyan-50/92 transition hover:text-white"
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
                              className="cursor-pointer appearance-none rounded-full bg-white/26 accent-cyan-300"
                              aria-label="Adjust reel volume"
                            />
                          </div>

                          <button
                            type="button"
                            onPointerDown={stopPointerPropagation}
                            onClick={toggleCardFullscreen}
                            className={feedCardFullscreenBtnClassName}
                            aria-label={isFullscreenCard ? "Exit full screen" : "View full screen"}
                          >
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              {isFullscreenCard ? (
                                <path d="M9 9H4V4M15 9h5V4M9 15H4v5M20 20h-5v-5" />
                              ) : (
                                <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" />
                              )}
                            </svg>
                          </button>

                          <div className={feedCardActionRailClassName}>
                            <Link
                              href={reelAuthorProfileHref(reel)}
                              onPointerDown={stopPointerPropagation}
                              onClick={stopClickPropagation}
                              className={feedCardProfileClassName}
                              aria-label={`Open ${reel.author} profile`}
                            >
                              <Image
                                src={reel.avatar}
                                alt={`${reel.author} avatar`}
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            </Link>

                            <button
                              type="button"
                              onPointerDown={stopPointerPropagation}
                              onClick={(event) => handleLikeToggle(event, reel.id)}
                              className={cx(
                                feedCardActionBtnClassName,
                                isLiked ? "text-rose-400 drop-shadow-[0_0_10px_rgba(251,113,133,0.72)]" : "hover:text-white",
                              )}
                              aria-label={`Like ${reel.title}`}
                            >
                              <HeartIcon className={feedCardActionIconClassName} />
                              <span className={feedCardActionLabelClassName}>{formatCompact(likeCount)}</span>
                            </button>

                            <div
                              className={cx(feedCardActionBtnClassName, "text-white/88")}
                              aria-label={`${formatCompact(viewCount)} views`}
                            >
                              <EyeIcon className={feedCardActionIconClassName} />
                              <span className={feedCardActionLabelClassName}>{formatCompact(viewCount)}</span>
                            </div>

                            <button
                              type="button"
                              onPointerDown={stopPointerPropagation}
                              onClick={handleOpenComments}
                              className={cx(feedCardActionBtnClassName, "hover:text-white")}
                              aria-label={`Comment on ${reel.title}`}
                            >
                              <ChatIcon className={feedCardActionIconClassName} />
                              <span className={feedCardActionLabelClassName}>{formatCompact(commentCount)}</span>
                            </button>

                            <button
                              type="button"
                              onPointerDown={stopPointerPropagation}
                              onClick={(event) => handleShareClick(event, reel.id)}
                              className={cx(feedCardActionBtnClassName, "hover:text-white")}
                              aria-label={`Share ${reel.title}`}
                            >
                              <ShareIcon className={feedCardActionIconClassName} />
                              <span className={feedCardActionLabelClassName}>Share</span>
                            </button>
                          </div>

                          <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 p-3 pr-14 sm:p-4 sm:pr-16">
                            <div
                              className={cx(
                                feedCardCaptionPanelClassName,
                                "rounded-[1rem] border border-cyan-300/14 bg-[rgba(6,10,22,0.12)] px-3 py-2.5 sm:px-3.5 sm:py-3",
                              )}
                              style={{ backdropFilter: "blur(3px)" }}
                            >
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span
                                  className={cx(
                                    feedCaptionVisibilityClassName,
                                    "font-semibold uppercase text-cyan-100/88",
                                  )}
                                >
                                  {reel.visibility === "Friends" ? "Friends only" : "Public"}
                                </span>
                              </div>
                              <Link
                                href={reelAuthorProfileHref(reel)}
                                onPointerDown={stopPointerPropagation}
                                onClick={stopClickPropagation}
                                className={cx(
                                  feedCaptionAuthorClassName,
                                  "inline-block font-semibold text-cyan-100 transition hover:text-white",
                                )}
                              >
                                {formatAuthorLink(reel.author, reel.handle)}
                              </Link>
                              <p className={cx(feedCaptionTitleClassName, "mt-0.5 line-clamp-1 text-cyan-50/92")}>
                                {reel.title}
                              </p>
                              {reel.caption ? (
                                <p className={cx(feedCaptionBodyClassName, "mt-1 line-clamp-2 text-cyan-100/78")}>
                                  {reel.caption}
                                </p>
                              ) : null}

                              <div className="mt-2.5">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onPointerDown={stopPointerPropagation}
                                    onClick={handlePlayPauseClick}
                                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-cyan-50/88 transition hover:text-white"
                                    aria-label={isActivePlaying ? "Pause reel" : "Play reel"}
                                  >
                                    {isActivePlaying ? <PauseIcon /> : <PlayIcon className="ml-px" />}
                                  </button>
                                  <input
                                    type="range"
                                    min={0}
                                    max={activeDuration > 0 ? activeDuration : 1}
                                    step={0.1}
                                    value={Math.min(activeCurrentTime, activeDuration > 0 ? activeDuration : 1)}
                                    onPointerDown={stopPointerPropagation}
                                    onClick={stopClickPropagation}
                                    onChange={handleSeekChange}
                                    className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/26 accent-cyan-300"
                                    aria-label="Seek reel timeline"
                                  />
                                </div>
                                <div className="suzi-feed-caption-meta mt-1.5 flex items-center justify-between font-medium tracking-[0.08em] text-cyan-100/78">
                                  <span>{formatTime(activeCurrentTime)}</span>
                                  <span>{formatTime(activeDuration)}</span>
                                </div>
                              </div>

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
                              className={cx(
                                feedCommentSheetClassName,
                                "absolute inset-x-0 bottom-0 h-[80%] rounded-t-[1.2rem] border border-cyan-300/24 bg-[linear-gradient(180deg,rgba(18,12,57,0.96),rgba(12,9,46,0.95))] px-3 pb-3 pt-2.5 shadow-[0_-16px_32px_rgba(7,11,30,0.52)] backdrop-blur-xl sm:px-4",
                              )}
                              style={{
                                transform: isCommentSheetOpen ? `translateY(${commentSheetOffsetY}px)` : "translateY(105%)",
                                transition: isCommentSheetDragging ? "none" : "transform 280ms ease",
                              }}
                            >
                              <div className="mx-auto mb-2 h-1 w-14 rounded-full bg-cyan-100/32" />
                              <div className="flex items-center justify-between">
                                <p className="suzi-feed-comment-heading font-semibold uppercase tracking-[0.14em] text-cyan-100/88">
                                  Comments
                                </p>
                                <button
                                  type="button"
                                  onPointerDown={stopPointerPropagation}
                                  onClick={(event) => {
                                    stopClickPropagation(event);
                                    closeCommentSheet();
                                  }}
                                  className="suzi-feed-comment-close font-semibold uppercase tracking-[0.1em] text-cyan-100/72 transition hover:text-white"
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
                                      <div className="flex min-w-0 items-center gap-2">
                                        <Image
                                          src={resolveUserAvatarUrl(comment.authorAvatarUrl)}
                                          alt=""
                                          width={24}
                                          height={24}
                                          unoptimized={Boolean(comment.authorAvatarUrl?.startsWith("http"))}
                                          className="h-6 w-6 shrink-0 rounded-full border border-cyan-200/22 object-cover"
                                        />
                                        {comment.authorId || comment.authorUsername ? (
                                          <Link
                                            href={publicProfileHref(comment.authorUsername ?? "", {
                                              userId: comment.authorId,
                                            })}
                                            onPointerDown={stopPointerPropagation}
                                            onClick={stopClickPropagation}
                                            className="suzi-feed-comment-author truncate font-semibold text-cyan-50 transition hover:text-white"
                                          >
                                            {comment.author}
                                          </Link>
                                        ) : (
                                          <p className="suzi-feed-comment-author truncate font-semibold text-cyan-50">{comment.author}</p>
                                        )}
                                      </div>
                                      <span className="suzi-feed-comment-time font-medium text-cyan-100/62">
                                        {comment.time}
                                      </span>
                                    </div>
                                    <p className="suzi-feed-comment-body mt-1 text-cyan-100/84">{comment.text}</p>
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
                                  className="suzi-feed-comment-input h-9 flex-1 rounded-[0.85rem] border border-cyan-300/24 bg-[rgba(9,12,32,0.7)] px-3 text-cyan-50 outline-none placeholder:text-cyan-100/48 focus:border-cyan-200/52"
                                />
                                <button
                                  type="submit"
                                  onPointerDown={stopPointerPropagation}
                                  className="suzi-feed-comment-post inline-flex h-9 items-center justify-center rounded-[0.85rem] border border-cyan-300/28 bg-cyan-300/14 px-3 font-semibold uppercase tracking-[0.1em] text-cyan-100 transition hover:border-cyan-200/58 hover:bg-cyan-300/24 hover:text-white"
                                >
                                  Post
                                </button>
                              </form>
                            </div>
                          </div>

                          <FeedShareSheet
                            open={isShareOpen}
                            shareUrl={shareTarget?.url ?? ""}
                            itemLabel="reel"
                            onClose={() => setShareTarget(null)}
                            onPointerDown={stopPointerPropagation}
                            onClick={stopClickPropagation}
                          />
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
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-[280] flex items-center justify-center bg-[rgba(6,10,28,0.72)] p-4">
          <div className="w-full max-w-xl rounded-[1.1rem] border border-cyan-300/24 bg-[linear-gradient(160deg,rgba(34,20,101,0.96),rgba(20,14,76,0.94))] p-4 shadow-[0_20px_60px_rgba(7,11,30,0.62)] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-white">Post Reel</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full border border-cyan-300/30 bg-cyan-400/16 px-2 py-1 text-xs font-semibold text-cyan-100"
              >
                Close
              </button>
            </div>
            <p className="mt-2 text-xs text-cyan-100/65">
              Max {REEL_MAX_FILE_BYTES / (1024 * 1024)} MB per upload. MP4, MOV, WebM, M4V, and other common
              formats. Or paste a direct https:// link to a video file.
            </p>
            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3">
              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverCreate(true);
                }}
                onDragLeave={() => setDragOverCreate(false)}
                onDrop={handleCreateDrop}
                className={cx(
                  "flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[0.9rem] border border-dashed px-4 text-center transition",
                  dragOverCreate
                    ? "border-cyan-200/70 bg-cyan-400/12"
                    : "border-cyan-300/28 bg-[rgba(20,13,62,0.66)]",
                )}
              >
                {createMediaUrl ? (
                  <video
                    src={resolvePostMediaUrl(createMediaUrl)}
                    className="max-h-48 w-full max-w-md rounded-[0.8rem] object-contain"
                    controls
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <>
                    <p className="text-sm font-semibold text-cyan-50">Browse, drag & drop, or paste URL</p>
                    <p className="mt-1 text-xs text-cyan-100/70">MP4, WebM, or direct link</p>
                  </>
                )}
                <input
                  ref={createFileInputRef}
                  type="file"
                  accept={VIDEO_FILE_ACCEPT}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0] ?? null;
                    void handleCreateFile(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <input
                  value={createMediaUrl}
                  onChange={(e) => setCreateMediaUrl(e.target.value)}
                  placeholder="https://example.com/clip.mp4"
                  className="suzi-input"
                />
                <button type="button" onClick={() => createFileInputRef.current?.click()} className="suzi-secondary-btn px-3 py-2 text-xs">
                  Browse
                </button>
                <button type="button" onClick={() => setCreateMediaUrl("")} className="suzi-secondary-btn px-3 py-2 text-xs">
                  Clear
                </button>
              </div>
              <textarea
                value={createCaption}
                onChange={(e) => setCreateCaption(e.target.value)}
                placeholder="Caption"
                className="suzi-input min-h-24 resize-none"
              />
              <div className="flex flex-wrap items-center gap-2">
                {(["Public", "Friends"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setCreateVisibility(v)}
                    className={cx(
                      "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] transition",
                      createVisibility === v
                        ? "border-fuchsia-300/45 bg-fuchsia-400/18 text-fuchsia-100"
                        : "border-white/14 bg-white/7 text-cyan-100/84",
                    )}
                  >
                    {v === "Friends" ? "Friends only" : "Public"}
                  </button>
                ))}
              </div>
              {uploadProgress !== null ? (
                <FeedUploadProgress percent={uploadProgress} label="Uploading video" />
              ) : null}
              {createError ? <p className="text-xs text-pink-100">{createError}</p> : null}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="suzi-secondary-btn px-3 py-1.5 text-xs">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBusy || uploadProgress !== null}
                  className="suzi-primary-btn px-3 py-1.5 text-xs disabled:opacity-60"
                >
                  {uploadProgress !== null ? "Uploading…" : createBusy ? "Posting…" : "Post Reel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
