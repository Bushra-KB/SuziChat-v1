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
  uploadSnapImage,
} from "@/lib/posts-client";
import { validatePostMediaUrl } from "@/lib/post-media-url";
import { apiPostToSnap } from "@/lib/post-ui-mappers";
import { publicProfileHref, snapAuthorProfileHref } from "@/lib/profile-links";
import { getRealtimeSocket } from "@/lib/realtime-client";
import { resolveUserAvatarUrl } from "@/lib/avatar-url";
import { subscribePostsFeedChannel, subscribeUserProfileUpdates } from "@/lib/realtime-feed";
import type { Snap } from "@/lib/v1-mock-data";

type SnapComment = {
  id: string;
  authorId?: string;
  authorUsername?: string;
  authorAvatarUrl?: string | null;
  author: string;
  text: string;
  time: string;
};

type CommentSheetDragState = {
  pointerId: number | null;
  startY: number;
  dragging: boolean;
};

type SnapCreateVisibility = "Public" | "Friends";

function formatCompact(value: number) {
  if (value >= 1000) {
    const compact = value / 1000;
    return `${compact % 1 === 0 ? compact.toFixed(0) : compact.toFixed(1)}K`;
  }

  return String(value);
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

function CameraIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="M4 9h2l1.6-2.4A1 1 0 0 1 8.4 6h7.2a1 1 0 0 1 .8.4L18 9h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="14" r="3.2" />
    </svg>
  );
}

function formatAuthorLine(author: string) {
  const parts = author.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const [firstName, lastName] = parts;
    return `${firstName} ${lastName.slice(0, 1).toUpperCase()}.`;
  }
  return author;
}

const AUTO_ADVANCE_MS = 12_000;
const SNAP_MAX_FILE_BYTES = 15 * 1024 * 1024;

function SnapHeroMedia({
  src,
  alt,
  priority,
  fit = "cover",
  sizes = "(max-width: 640px) 86vw, 24rem",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  fit?: "cover" | "contain";
  sizes?: string;
}) {
  const objectClass = fit === "contain" ? "object-contain" : "object-cover";
  if (fit === "contain") {
    if (!src.startsWith("/")) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={cx(
            "suzi-feed-card-media absolute inset-0 h-full w-full bg-[rgba(6,9,28,0.35)]",
            objectClass,
          )}
          draggable={false}
        />
      );
    }
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cx("suzi-feed-card-media bg-[rgba(6,9,28,0.35)]", objectClass)}
        draggable={false}
      />
    );
  }
  if (!src.startsWith("/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cx("suzi-feed-card-media absolute inset-0 h-full w-full bg-[rgba(6,9,28,0.35)]", objectClass)}
        draggable={false}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cx("suzi-feed-card-media bg-[rgba(6,9,28,0.35)]", objectClass)}
      draggable={false}
    />
  );
}

export function SnapsFeed() {
  const searchParams = useSearchParams();
  const [displaySnaps, setDisplaySnaps] = useState<Snap[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoScrollMode, setAutoScrollMode] = useState(true);
  const [advanceProgress, setAdvanceProgress] = useState(0);
  const [likedBySnap, setLikedBySnap] = useState<Record<string, boolean>>({});
  const [commentsBySnap, setCommentsBySnap] = useState<Record<string, SnapComment[]>>({});
  const [commentDraft, setCommentDraft] = useState("");
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);
  const [commentSheetOffsetY, setCommentSheetOffsetY] = useState(0);
  const [isCommentSheetDragging, setIsCommentSheetDragging] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ id: string; url: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMediaUrl, setCreateMediaUrl] = useState("");
  const [createCaption, setCreateCaption] = useState("");
  const [createVisibility, setCreateVisibility] = useState<SnapCreateVisibility>("Public");
  const [createBusy, setCreateBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [createError, setCreateError] = useState("");
  const [dragOverCreate, setDragOverCreate] = useState(false);
  const [isFullscreenCard, setIsFullscreenCard] = useState(false);
  const suppressClickTimerRef = useRef<number | null>(null);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const commentSheetDragRef = useRef<CommentSheetDragState>({ pointerId: null, startY: 0, dragging: false });
  const dragState = useRef<FeedCarouselDragState>(createInitialFeedCarouselDragState());
  const wheelLockRef = useRef(0);
  const navLockRef = useRef(false);
  const advanceTimerRef = useRef<number | null>(null);
  const progressRafRef = useRef<number | null>(null);
  const appliedFocusIdRef = useRef<string | null>(null);

  const activeSnap = displaySnaps[activeIndex] ?? null;
  const activeComments = activeSnap ? commentsBySnap[activeSnap.id] ?? [] : [];

  const discoveryItems = useMemo<PostsDiscoveryItem[]>(
    () =>
      displaySnaps.map((snap) => ({
        id: snap.id,
        mediaUrl: snap.image,
        title: snap.title,
        author: snap.author,
        authorId: snap.authorId,
        views: snap.views ?? 0,
        likes: snap.likes,
        kind: "image" as const,
      })),
    [displaySnaps],
  );

  const focusSnapById = useCallback(
    (id: string) => {
      const index = displaySnaps.findIndex((row) => row.id === id);
      if (index < 0) {
        return;
      }
      setActiveIndex(index);
      setAutoScrollMode(false);
      setAdvanceProgress(0);
      setIsCommentSheetOpen(false);
      setCommentSheetOffsetY(0);
      setCommentDraft("");
    },
    [displaySnaps],
  );

  const rotateBy = useCallback((step: number) => {
    if (displaySnaps.length === 0 || navLockRef.current) {
      return;
    }
    navLockRef.current = true;
    window.setTimeout(() => {
      navLockRef.current = false;
    }, FEED_CAROUSEL_NAV_LOCK_MS);
    setAdvanceProgress(0);
    setIsCommentSheetOpen(false);
    setCommentSheetOffsetY(0);
    setCommentDraft("");
    setActiveIndex((previous) => advanceCarouselIndex(previous, step, displaySnaps.length));
  }, [displaySnaps.length]);

  const refreshSnaps = useCallback(() => {
    const session = getStoredAuthSession();
    const loader = session?.accessToken ? listMyPosts(session.accessToken, "SNAP", 40) : listPosts("SNAP", 40);
    void loader
      .then((rows) => {
        const mapped = rows.map(apiPostToSnap);
        setDisplaySnaps(mapped);
        setActiveIndex(0);
        setLikedBySnap({});
        setAdvanceProgress(0);
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
    const loader = session?.accessToken ? listMyPosts(session.accessToken, "SNAP", 40) : listPosts("SNAP", 40);
    void loader
      .then((rows) => {
        if (cancelled) {
          return;
        }
        const mapped = rows.map(apiPostToSnap);
        setDisplaySnaps(mapped);
        setActiveIndex(0);
        setLikedBySnap({});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      return;
    }
    return subscribePostsFeedChannel(session.accessToken, "SNAP", () => {
      refreshSnaps();
    });
  }, [refreshSnaps]);

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
      setDisplaySnaps((prev) =>
        prev.map((snap) =>
          snap.authorId === user.id
            ? {
                ...snap,
                author: name,
                authorUsername: user.username,
                avatar: resolveUserAvatarUrl(user.avatarUrl),
              }
            : snap,
        ),
      );
      setCommentsBySnap((prev) =>
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
    if (!focusId || displaySnaps.length === 0) {
      return;
    }
    const index = displaySnaps.findIndex((snap) => snap.id === focusId);
    if (index >= 0) {
      setActiveIndex(index);
      setAutoScrollMode(false);
      setAdvanceProgress(0);
      appliedFocusIdRef.current = focusId;
    }
  }, [displaySnaps, searchParams]);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  useEffect(
    () => () => {
      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current);
      }
      if (progressRafRef.current !== null) {
        cancelAnimationFrame(progressRafRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const onFullscreenChange = () => {
      if (typeof document === "undefined") {
        return;
      }
      const fullscreenEl = document.fullscreenElement;
      const stageEl = stageRef.current;
      if (!fullscreenEl) {
        setIsFullscreenCard(false);
        return;
      }
      setIsFullscreenCard(Boolean(stageEl && (fullscreenEl === stageEl || stageEl.contains(fullscreenEl))));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    onFullscreenChange();
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [activeIndex, displaySnaps.length]);

  useEffect(() => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    if (progressRafRef.current !== null) {
      cancelAnimationFrame(progressRafRef.current);
      progressRafRef.current = null;
    }

    if (!autoScrollMode) {
      return;
    }

    const started = performance.now();
    const tick = (now: number) => {
      const elapsed = now - started;
      const p = Math.min(1, elapsed / AUTO_ADVANCE_MS);
      setAdvanceProgress(p);
      if (p < 1) {
        progressRafRef.current = requestAnimationFrame(tick);
      }
    };
    progressRafRef.current = requestAnimationFrame(tick);

    advanceTimerRef.current = window.setTimeout(() => {
      rotateBy(1);
    }, AUTO_ADVANCE_MS);

    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
      if (progressRafRef.current !== null) {
        cancelAnimationFrame(progressRafRef.current);
        progressRafRef.current = null;
      }
    };
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
    const fullscreenEl = document.fullscreenElement;
    if (fullscreenEl && (fullscreenEl === stageEl || stageEl.contains(fullscreenEl))) {
      void document.exitFullscreen?.().catch(() => {});
      return;
    }
    if (stageEl.requestFullscreen) {
      void stageEl.requestFullscreen().catch(() => {});
    }
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

  useEffect(() => {
    const session = getStoredAuthSession();
    if (!session?.accessToken || !activeSnap) {
      return;
    }
    void trackPostView(session.accessToken, activeSnap.id)
      .then((engagement) => {
        setDisplaySnaps((prev) =>
          prev.map((snap) =>
            snap.id === engagement.postId
              ? {
                  ...snap,
                  likes: engagement.likes,
                  comments: engagement.comments,
                  views: engagement.views,
                }
              : snap,
          ),
        );
      })
      .catch(() => {});
  }, [activeSnap?.id]);

  useEffect(() => {
    const session = getStoredAuthSession();
    if (!session?.accessToken || !activeSnap) {
      return;
    }
    void getPostEngagement(session.accessToken, activeSnap.id)
      .then((engagement) => {
        setLikedBySnap((prev) => ({ ...prev, [activeSnap.id]: Boolean(engagement.likedByMe) }));
        setDisplaySnaps((prev) =>
          prev.map((snap) =>
            snap.id === engagement.postId
              ? {
                  ...snap,
                  likes: engagement.likes,
                  comments: engagement.comments,
                  views: engagement.views,
                }
              : snap,
          ),
        );
      })
      .catch(() => {});
  }, [activeSnap?.id]);

  useEffect(() => {
    const session = getStoredAuthSession();
    if (!activeSnap || !session?.accessToken) {
      return;
    }
    void listPostComments(session.accessToken, activeSnap.id, 80)
      .then((rows) => {
        const seen = new Set<string>();
        const mapped: SnapComment[] = [];
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
        setCommentsBySnap((prev) => ({
          ...prev,
          [activeSnap.id]: mapped,
        }));
      })
      .catch(() => {});
  }, [activeSnap?.id]);

  useEffect(() => {
    const session = getStoredAuthSession();
    if (!session?.accessToken || displaySnaps.length === 0) {
      return;
    }
    const socket = getRealtimeSocket(session.accessToken);
    const watch = () => {
      for (const snap of displaySnaps) {
        socket.emit("post:watch", { postId: snap.id });
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
      setDisplaySnaps((prev) =>
        prev.map((snap) =>
          snap.id === payload.postId
            ? {
                ...snap,
                likes: typeof payload.likes === "number" ? payload.likes : snap.likes,
                comments: typeof payload.comments === "number" ? payload.comments : snap.comments,
                views: typeof payload.views === "number" ? payload.views : snap.views,
              }
            : snap,
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
      setCommentsBySnap((prev) => {
        const existing = prev[postId] ?? [];
        if (existing.some((row) => row.id === commentId)) {
          return prev;
        }
        const author =
          comment.user?.displayName?.trim() ||
          comment.user?.username ||
          "User";
        const nextComment: SnapComment = {
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
  }, [displaySnaps]);

  const handleLikeToggle = async (event: React.MouseEvent<HTMLButtonElement>, snapId: string) => {
    stopClickPropagation(event);
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      return;
    }
    try {
      const engagement = await togglePostLike(session.accessToken, snapId);
      setLikedBySnap((previous) => ({
        ...previous,
        [snapId]: Boolean(engagement.likedByMe),
      }));
      setDisplaySnaps((prev) =>
        prev.map((snap) =>
          snap.id === snapId
            ? { ...snap, likes: engagement.likes, comments: engagement.comments }
            : snap,
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

  const handleShareClick = (event: React.MouseEvent<HTMLButtonElement>, snapId: string) => {
    stopClickPropagation(event);
    setIsCommentSheetOpen(false);
    setCommentSheetOffsetY(0);
    setShareTarget({
      id: snapId,
      url: `${window.location.origin}/app/snaps?focus=${snapId}`,
    });
  };

  const handleCommentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const session = getStoredAuthSession();
    if (!session?.accessToken || !activeSnap) {
      return;
    }
    const text = commentDraft.trim();
    if (!text) {
      return;
    }

    try {
      const created = await createPostComment(session.accessToken, activeSnap.id, text);
      const newId = created.comment.id;
      setCommentsBySnap((previous) => {
        const list = previous[activeSnap.id] ?? [];
        if (list.some((row) => row.id === newId)) {
          return previous;
        }
        return {
          ...previous,
          [activeSnap.id]: [
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
      setDisplaySnaps((prev) =>
        prev.map((snap) =>
          snap.id === activeSnap.id
            ? {
                ...snap,
                likes: created.engagement.likes,
                comments: created.engagement.comments,
              }
            : snap,
        ),
      );
      setCommentDraft("");
    } catch {
      // no-op
    }
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

  const handleCreateFile = async (file: File | null) => {
    if (!file) {
      return;
    }
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      setCreateError("Sign in to upload an image.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setCreateError("Please choose an image file (JPEG, PNG, WebP, or GIF).");
      return;
    }
    if (file.size > SNAP_MAX_FILE_BYTES) {
      setCreateError(`Image must be ${SNAP_MAX_FILE_BYTES / (1024 * 1024)} MB or smaller.`);
      return;
    }
    setCreateBusy(true);
    setCreateError("");
    setUploadProgress(0);
    try {
      const { mediaUrl } = await uploadSnapImage(session.accessToken, file, (percent) => {
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
      setCreateError("Sign in and add an image.");
      return;
    }
    const mediaCheck = validatePostMediaUrl(createMediaUrl, "SNAP");
    if (!mediaCheck.ok) {
      setCreateError(mediaCheck.message);
      return;
    }
    setCreateBusy(true);
    setCreateError("");
    try {
      const created = await createPost(session.accessToken, {
        kind: "SNAP",
        mediaUrl: mediaCheck.value,
        caption: createCaption.trim() || undefined,
        visibility: createVisibility,
      });
      const mapped = apiPostToSnap(created);
      setDisplaySnaps((prev) => [mapped, ...prev]);
      setActiveIndex(0);
      setShowCreateModal(false);
      setCreateMediaUrl("");
      setCreateCaption("");
      setCreateVisibility("Public");
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Could not create snap.");
    } finally {
      setCreateBusy(false);
    }
  };

  return (
    <section className="suzi-app-frame-fill suzi-snaps-page">
      <div className="suzi-feed-with-rail flex min-h-0 flex-1">
        <PostsDiscoveryRail
          kind="SNAP"
          items={discoveryItems}
          activeId={activeSnap?.id ?? null}
          activeAuthorId={activeSnap?.authorId ?? null}
          basePath="/app/snaps"
          onSelect={focusSnapById}
          className="hidden lg:flex"
        />
        <Panel className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden [background:transparent] border-cyan-300/24 p-[var(--panel-pad)] shadow-none lg:border-l-0">
        <div className="suzi-snaps-header flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.8rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-fuchsia-100/92 shadow-[0_0_12px_rgba(157,78,221,0.28)]">
                <CameraIcon className="h-4.5 w-4.5" />
              </span>
              <h2 className="text-[var(--fs-2xl)] font-bold tracking-tight text-white">Suzi Snaps</h2>
            </div>
          </div>

          <div className="suzi-feed-header-actions flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/36 bg-fuchsia-500/14 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-fuchsia-100 transition hover:border-fuchsia-200/55 hover:bg-fuchsia-500/22 hover:text-white"
            >
              Create Snap
            </button>

            <button
              type="button"
              onClick={refreshSnaps}
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
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onWheel={handleWheel}
          style={{ touchAction: "none", transformStyle: "preserve-3d" }}
        >
          <div className="suzi-feed-carousel-root" style={{ transformStyle: "preserve-3d" }}>
            {displaySnaps.map((snap, index) => {
              const offset = getCircularOffset(index, activeIndex, displaySnaps.length);
              const layer = getFeedCarouselLayer(offset);
              if (!layer) {
                return null;
              }
              const isLiked = Boolean(likedBySnap[snap.id]);
              const likeCount = snap.likes;
              const commentCount = snap.comments;
              const viewCount = snap.views ?? 0;
              const isShareOpen = shareTarget?.id === snap.id;

              if (isFullscreenCard && !layer.isActive) {
                return null;
              }

              return (
                <div
                  key={snap.id}
                  className="pointer-events-none absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]"
                >
                    <div
                      data-snap-card="true"
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
                      <SnapHeroMedia
                        src={snap.image}
                        alt={`${snap.title} snap`}
                        priority
                        fit="contain"
                        sizes={isFullscreenCard ? "100vw" : "(max-width: 640px) 86vw, 24rem"}
                      />
                    ) : (
                      <SnapHeroMedia
                        src={snap.image}
                        alt={`${snap.title} snap`}
                        priority={false}
                        fit="cover"
                        sizes="(max-width: 640px) 86vw, 24rem"
                      />
                    )}

                    <div
                      className={cx(
                        "pointer-events-none absolute inset-0",
                        layer.isActive
                          ? "bg-[linear-gradient(180deg,rgba(9,11,30,0.02),rgba(9,11,30,0.16)_48%,rgba(9,11,30,0.62))]"
                          : "bg-[linear-gradient(180deg,rgba(9,11,30,0.16),rgba(9,11,30,0.46)_50%,rgba(9,11,30,0.84))]",
                        snap.tone,
                      )}
                    />
                    {!layer.isActive ? (
                      <div className="pointer-events-none absolute inset-0 bg-[rgba(5,8,24,0.5)]" aria-hidden />
                    ) : null}

                    {layer.isActive ? (
                      <>
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
                            href={snapAuthorProfileHref(snap)}
                            onPointerDown={stopPointerPropagation}
                            onClick={stopClickPropagation}
                            className={feedCardProfileClassName}
                            aria-label={`Open ${snap.author} profile`}
                          >
                            <Image src={snap.avatar} alt={`${snap.author} avatar`} fill sizes="32px" className="object-cover" />
                          </Link>

                          <button
                            type="button"
                            onPointerDown={stopPointerPropagation}
                            onClick={(event) => handleLikeToggle(event, snap.id)}
                            className={cx(
                              feedCardActionBtnClassName,
                              isLiked ? "text-rose-400 drop-shadow-[0_0_10px_rgba(251,113,133,0.72)]" : "hover:text-white",
                            )}
                            aria-label={`Like ${snap.title}`}
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
                            aria-label={`Comment on ${snap.title}`}
                          >
                            <ChatIcon className={feedCardActionIconClassName} />
                            <span className={feedCardActionLabelClassName}>{formatCompact(commentCount)}</span>
                          </button>

                          <button
                            type="button"
                            onPointerDown={stopPointerPropagation}
                            onClick={(event) => handleShareClick(event, snap.id)}
                            className={cx(feedCardActionBtnClassName, "hover:text-white")}
                            aria-label={`Share ${snap.title}`}
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
                                {snap.visibility === "Friends" ? "Friends only" : "Public"}
                              </span>
                            </div>
                            <Link
                              href={snapAuthorProfileHref(snap)}
                              onPointerDown={stopPointerPropagation}
                              onClick={stopClickPropagation}
                              className={cx(
                                feedCaptionAuthorClassName,
                                "inline-block font-semibold text-cyan-100 transition hover:text-white",
                              )}
                            >
                              {formatAuthorLine(snap.author)}
                            </Link>
                            <p className={cx(feedCaptionTitleClassName, "mt-0.5 line-clamp-1 text-cyan-50/92")}>
                              {snap.title}
                            </p>
                            <p className={cx(feedCaptionBodyClassName, "mt-1 line-clamp-2 text-cyan-100/78")}>
                              {snap.caption}
                            </p>

                            <div className="mt-2.5">
                              <div className="h-1 w-full overflow-hidden rounded-full bg-white/26">
                                <div
                                  className="h-full rounded-full bg-cyan-300 transition-[width] duration-75 ease-linear"
                                  style={{
                                    width: `${(autoScrollMode ? advanceProgress : 0) * 100}%`,
                                  }}
                                />
                              </div>
                              <div className="suzi-feed-caption-meta mt-1.5 flex items-center justify-between font-medium tracking-[0.08em] text-cyan-100/78">
                                <span>Story</span>
                                <span>
                                  {autoScrollMode
                                    ? `${Math.max(0, Math.ceil((1 - advanceProgress) * (AUTO_ADVANCE_MS / 1000)))}s`
                                    : "Manual"}
                                </span>
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
                          itemLabel="snap"
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
                        <p className="truncate text-[0.82rem] font-semibold text-cyan-50/84">{snap.title}</p>
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
              <h3 className="text-xl font-semibold text-white">Post Snap</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full border border-cyan-300/30 bg-cyan-400/16 px-2 py-1 text-xs font-semibold text-cyan-100"
              >
                Close
              </button>
            </div>
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
                  <img src={createMediaUrl} alt="Snap preview" className="max-h-48 rounded-[0.8rem] object-cover" />
                ) : (
                  <>
                    <p className="text-sm font-semibold text-cyan-50">Browse, drag & drop, or paste URL</p>
                    <p className="mt-1 text-xs text-cyan-100/70">
                      JPEG, PNG, WebP, GIF — max {SNAP_MAX_FILE_BYTES / (1024 * 1024)} MB
                    </p>
                  </>
                )}
                <input
                  ref={createFileInputRef}
                  type="file"
                  accept="image/*"
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
                  placeholder="https://example.com/snap.jpg"
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
                <FeedUploadProgress percent={uploadProgress} label="Uploading image" />
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
                  {uploadProgress !== null ? "Uploading…" : createBusy ? "Posting…" : "Post Snap"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
