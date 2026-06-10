"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel, cx } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import { getRealtimeSocket } from "@/lib/realtime-client";
import { subscribeRoomsCatalog } from "@/lib/realtime-feed";
import {
  cancelRoomJoinRequest,
  createRoom,
  joinRoom,
  listRoomCategories,
  listRooms,
  listRoomsForMe,
  requestRoomAccess,
  type ApiRoom,
} from "@/lib/rooms-client";
import {
  homeBtnPrimary,
  homeBtnSecondary,
  homeInset,
  homePanelHeader,
  homePanelIcon,
  homeRow,
  homeSearchInput,
  homeTabClasses,
  listEmpty,
  listMeta,
  listSubtitle,
  listL1,
  listTitleLinkCyan,
  panelTitle,
} from "@/components/app/home-typography";
import { useI18n } from "@/lib/i18n";

type HomeRoom = {
  id: string;
  name: string;
  emoji?: string;
  summary: string;
  detail?: string;
  onlineUsers: number;
  totalMembers: number;
  image: string;
  hasCustomImage: boolean;
  category: string;
  privacy: string;
  action: "open" | "join" | "request" | "requested" | "blocked";
  featured?: boolean;
  ownerId: string;
  isOwner: boolean;
  isMember: boolean;
  hasPendingRequest: boolean;
  isBlocked: boolean;
};

const primaryCategories = ["All", "Hobbies", "Music", "Sports", "Chill"] as const;
const extraCategories = ["Dating", "Media", "Travel"];
const PRIVACY_OPTIONS = ["Public", "Friends", "Private"] as const;

const DEFAULT_ROOM_COVER = "/logo/logo.png";

const MAX_IMAGE_EDGE = 1400;
const JPEG_QUALITY = 0.82;

/** Resize so the longest side is at most `MAX_IMAGE_EDGE` and re-encode as JPEG. */
async function compressImageDataUrl(input: string): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }
  let objectUrl: string | undefined;
  try {
    let loadSrc = trimmed;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const res = await fetch(trimmed, { mode: "cors" });
      if (!res.ok) {
        return trimmed;
      }
      const blob = await res.blob();
      objectUrl = URL.createObjectURL(blob);
      loadSrc = objectUrl;
    }
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Failed to load image"));
      el.src = loadSrc;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (w === 0 || h === 0) {
      return trimmed;
    }
    const maxEdge = Math.max(w, h);
    const scale = Math.min(1, MAX_IMAGE_EDGE / maxEdge);
    const tw = Math.round(w * scale);
    const th = Math.round(h * scale);
    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return trimmed;
    }
    ctx.drawImage(img, 0, 0, tw, th);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch {
    return trimmed;
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

function mapApiCategoryToHome(cat: string): string {
  const c = cat.toLowerCase();
  if (c.includes("music")) {
    return "Music";
  }
  if (c.includes("media") || c.includes("movie")) {
    return "Media";
  }
  if (c.includes("dating") || c.includes("late")) {
    return "Dating";
  }
  if (c.includes("sport") || c.includes("game")) {
    return "Sports";
  }
  if (c.includes("travel")) {
    return "Travel";
  }
  if (c.includes("social") || c.includes("general")) {
    return "Hobbies";
  }
  return "Chill";
}

function apiRoomToHomeRoom(room: ApiRoom, myUserId?: string, fallbackSummary = "Open conversation"): HomeRoom {
  const privacy = room.privacy.toLowerCase();
  const actor = room.actor;
  const isOwner = Boolean(myUserId && room.owner.id === myUserId);
  const isBlocked = Boolean(actor?.isBlocked);
  const isMember = Boolean(isOwner || actor?.isMember);
  const hasPendingRequest = Boolean(actor?.hasPendingRequest);
  const action: HomeRoom["action"] = isOwner
    ? "open"
    : isBlocked || actor?.action === "blocked"
      ? "blocked"
      : actor?.action ??
        (privacy === "public" ? "join" : hasPendingRequest ? "requested" : "request");

  const imageUrl = room.imageUrl?.trim();
  return {
    id: room.slug,
    name: room.name,
    summary: room.description?.trim() || fallbackSummary,
    detail: undefined,
    onlineUsers: 0,
    totalMembers: room._count?.memberships ?? 0,
    image: imageUrl || DEFAULT_ROOM_COVER,
    hasCustomImage: Boolean(imageUrl),
    category: mapApiCategoryToHome(room.category),
    privacy: room.privacy,
    action,
    featured: room.slug === "general-chat",
    ownerId: room.owner.id,
    isOwner,
    isMember,
    hasPendingRequest,
    isBlocked: action === "blocked" || isBlocked,
  };
}

function nextGuestAction(room: Pick<HomeRoom, "privacy" | "hasPendingRequest">): HomeRoom["action"] {
  const privacy = room.privacy.toLowerCase();
  if (privacy === "public") {
    return "join";
  }
  return room.hasPendingRequest ? "requested" : "request";
}

export function HomeChatRoomsPanel({
  variant = "default",
}: {
  variant?: "default" | "dashboard";
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const moreCategoriesRef = useRef<HTMLDivElement>(null);
  const mobileFilterRef = useRef<HTMLDivElement>(null);
  const [sourceRooms, setSourceRooms] = useState<HomeRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createCategory, setCreateCategory] = useState("Social");
  const [createPrivacy, setCreatePrivacy] = useState<(typeof PRIVACY_OPTIONS)[number]>("Public");
  const [roomCategories, setRoomCategories] = useState<string[]>(["Social"]);
  const [createImageUrl, setCreateImageUrl] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [actingRoomId, setActingRoomId] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | undefined>(undefined);
  const [createModalMounted, setCreateModalMounted] = useState(false);

  useEffect(() => {
    setCreateModalMounted(true);
  }, []);

  useEffect(() => {
    if (!isCreateOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCreateOpen(false);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isCreateOpen]);

  const roomSlugKey = useMemo(() => sourceRooms.map((room) => room.id).join("\0"), [sourceRooms]);

  const reloadRooms = useCallback(async () => {
    const session = getStoredAuthSession();
    setViewerId(session?.user.id);
    setRoomsError("");
    const loader = session?.accessToken ? listRoomsForMe(session.accessToken) : listRooms();
    const rows = await loader;
    const myId = session?.user.id;
    setSourceRooms(rows.map((row) => apiRoomToHomeRoom(row, myId, t("rooms.openConversation"))));
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    setRoomsLoading(true);
    void reloadRooms()
      .catch((e: unknown) => {
        if (!cancelled) {
          setRoomsError(e instanceof Error ? e.message : t("admin.error"));
          setSourceRooms([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRoomsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadRooms, t]);

  useEffect(() => {
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      return;
    }
    return subscribeRoomsCatalog(session.accessToken, () => {
      void reloadRooms().catch(() => {});
    });
  }, [reloadRooms]);

  useEffect(() => {
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      return;
    }
    const socket = getRealtimeSocket(session.accessToken);
    const slugs = sourceRooms.map((room) => room.id);
    const watchRooms = () => {
      for (const slug of slugs) {
        socket.emit("room:watch", { roomSlug: slug });
      }
    };
    const onStats = (payload: { roomSlug?: string; onlineUsers?: number; totalMembers?: number }) => {
      if (!payload.roomSlug) {
        return;
      }
      setSourceRooms((prev) =>
        prev.map((room) =>
          room.id === payload.roomSlug
            ? {
                ...room,
                onlineUsers: typeof payload.onlineUsers === "number" ? payload.onlineUsers : room.onlineUsers,
                totalMembers: typeof payload.totalMembers === "number" ? payload.totalMembers : room.totalMembers,
              }
            : room,
        ),
      );
    };
    socket.on("connect", watchRooms);
    socket.on("room:stats", onStats);
    if (socket.connected) {
      watchRooms();
    }
    return () => {
      socket.off("connect", watchRooms);
      socket.off("room:stats", onStats);
    };
  }, [roomSlugKey]);

  useEffect(() => {
    let cancelled = false;
    void listRoomCategories()
      .then((rows) => {
        if (cancelled || rows.length === 0) {
          return;
        }
        const normalized = rows
          .map((row) => row.trim())
          .filter((row, index, arr) => row.length > 0 && arr.indexOf(row) === index);
        if (normalized.length > 0) {
          setRoomCategories(normalized);
          setCreateCategory((prev) => (normalized.includes(prev) ? prev : normalized[0] ?? "Social"));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        moreCategoriesRef.current &&
        !moreCategoriesRef.current.contains(event.target as Node)
      ) {
        setShowMoreCategories(false);
      }
      if (
        mobileFilterRef.current &&
        !mobileFilterRef.current.contains(event.target as Node)
      ) {
        setShowMobileFilter(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filteredRooms = useMemo(() => {
    const byCategory =
      activeCategory === "All"
        ? sourceRooms
        : sourceRooms.filter((room) => room.category === activeCategory);

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return byCategory;
    }

    return byCategory.filter((room) =>
      `${room.name} ${room.summary} ${room.detail ?? ""} ${room.category}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [activeCategory, query, sourceRooms]);

  const groupedFilteredRooms = useMemo(() => {
    const myUserId = viewerId ?? getStoredAuthSession()?.user.id;
    if (!myUserId) {
      return { mine: [] as HomeRoom[], joined: [] as HomeRoom[], other: filteredRooms };
    }

    const mine: HomeRoom[] = [];
    const joined: HomeRoom[] = [];
    const other: HomeRoom[] = [];

    for (const room of filteredRooms) {
      if (room.ownerId === myUserId) {
        mine.push(room);
        continue;
      }
      if (room.isMember) {
        joined.push(room);
        continue;
      }
      other.push(room);
    }

    return { mine, joined, other };
  }, [filteredRooms, viewerId]);

  const moreCategoryActive =
    activeCategory !== "All" &&
    extraCategories.includes(activeCategory);

  async function handleChooseRoomImage(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setCreateError(t("rooms.chooseImage"));
      return;
    }
    setCreateError("");
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    }).catch(() => "");
    if (dataUrl) {
      const compressed = await compressImageDataUrl(dataUrl);
      setCreateImageUrl(compressed);
    } else {
      setCreateError(t("rooms.couldNotLoadImage"));
    }
    input.value = "";
  }

  async function handleCreateRoom(event: React.FormEvent) {
    event.preventDefault();
    const s = getStoredAuthSession();
    if (!s) {
      setCreateError(t("rooms.notSignedIn"));
      return;
    }
    setCreateError("");
    setCreating(true);
    try {
      const raw = createImageUrl.trim();
      const imageUrl =
        raw.length > 0 ? await compressImageDataUrl(raw) : undefined;
      const room = await createRoom(s.accessToken, {
        name: createName.trim(),
        description: createDescription.trim(),
        category: createCategory.trim(),
        imageUrl,
        privacy: createPrivacy,
      });
      const mapped = apiRoomToHomeRoom(room, s.user.id, t("rooms.openConversation"));
      setSourceRooms((prev) => {
        const next = [mapped, ...prev.filter((row) => row.id !== mapped.id)];
        return next;
      });
      setActiveCategory("All");
      setQuery("");
      setIsCreateOpen(false);
      setCreateName("");
      setCreateDescription("");
      setCreateCategory(roomCategories[0] ?? "Social");
      setCreatePrivacy("Public");
      setCreateImageUrl("");
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : t("rooms.couldNotCreate"));
    } finally {
      setCreating(false);
    }
  }

  async function handleRoomAction(room: HomeRoom) {
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      window.alert(t("rooms.signInActions"));
      return;
    }
    if (room.action === "open") {
      router.push(`/app/rooms/view?r=${encodeURIComponent(room.id)}`);
      return;
    }
    if (room.action === "blocked" || room.action === "requested") {
      return;
    }
    setActingRoomId(room.id);
    try {
      if (room.action === "join") {
        await joinRoom(session.accessToken, room.id);
        setSourceRooms((prev) =>
          prev.map((row) =>
            row.id === room.id
              ? {
                  ...row,
                  action: "open",
                  isMember: true,
                  isOwner: row.ownerId === session.user.id,
                  hasPendingRequest: false,
                  totalMembers: row.totalMembers + 1,
                }
              : row,
          ),
        );
        return;
      }
      const result = await requestRoomAccess(session.accessToken, room.id);
      setSourceRooms((prev) =>
        prev.map((row) => {
          if (row.id !== room.id) {
            return row;
          }
          if (result.status === "member") {
            return {
              ...row,
              action: "open",
              isMember: true,
              isOwner: row.ownerId === session.user.id,
              hasPendingRequest: false,
              totalMembers: row.totalMembers + 1,
            };
          }
          return {
            ...row,
            action: "requested",
            hasPendingRequest: true,
          };
        }),
      );
    } finally {
      setActingRoomId(null);
    }
  }

  async function handleCancelRoomRequest(room: HomeRoom) {
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      return;
    }
    setActingRoomId(room.id);
    try {
      const result = await cancelRoomJoinRequest(session.accessToken, room.id);
      setSourceRooms((prev) =>
        prev.map((row) => {
          if (row.id !== room.id) {
            return row;
          }
          if (result.status === "member") {
            return {
              ...row,
              action: "open",
              isMember: true,
              isOwner: row.ownerId === session.user.id,
              hasPendingRequest: false,
              totalMembers: row.totalMembers + 1,
            };
          }
          return {
            ...row,
            hasPendingRequest: false,
            action: nextGuestAction({
              privacy: row.privacy,
              hasPendingRequest: false,
            }),
          };
        }),
      );
    } finally {
      setActingRoomId(null);
    }
  }

  function primaryActionLabel(room: HomeRoom) {
    if (room.action === "open") {
      return t("common.open");
    }
    if (room.action === "join") {
      return t("rooms.join");
    }
    if (room.action === "request") {
      return t("rooms.request");
    }
    if (room.action === "requested") {
      return t("rooms.pending");
    }
    return t("rooms.blocked");
  }

  function categoryLabel(category: string) {
    return category === "All" ? t("friends.all") : category;
  }

  function privacyLabel(privacy: string) {
    const normalized = privacy.toLowerCase();
    if (normalized === "public") return t("common.public");
    if (normalized === "friends") return t("common.friends");
    if (normalized === "private") return t("common.private");
    return privacy;
  }

  function renderRoomRow(room: HomeRoom, index: number) {
    const busy = actingRoomId === room.id;
    const showCancelRequest = room.hasPendingRequest && !room.isMember && !room.isBlocked;

    return (
      <article
        key={room.id}
        className={cx(
          homeRow,
          "flex items-center gap-2.5 px-2.5 py-2 sm:px-3 sm:py-2.5",
          variant === "dashboard" && "suzi-home-chat-room-row",
        )}
      >
        <Link
          href={`/app/rooms/view?r=${encodeURIComponent(room.id)}`}
          className={cx(
            "relative shrink-0 overflow-hidden rounded-[0.7rem] border border-cyan-300/24",
            variant === "dashboard" && "suzi-home-chat-room-thumb",
          )}
          style={
            variant === "dashboard"
              ? undefined
              : {
                  width: "clamp(3.6rem, 5.2vw, 4.4rem)",
                  height: "clamp(2.8rem, 4.5vh + 0.5rem, 3.5rem)",
                }
          }
        >
          <img
            src={room.image}
            alt={`${room.name} cover`}
            className={cx(
              "h-full w-full",
              room.hasCustomImage ? "object-cover" : "bg-[#281a8a] object-contain p-1.5",
            )}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,26,0.05),rgba(4,8,26,0.42))]" />
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={`/app/rooms/view?r=${encodeURIComponent(room.id)}`}
            className={cx(listTitleLinkCyan, "block truncate")}
          >
            {room.name}
            {room.emoji ? ` ${room.emoji}` : ""}
          </Link>

          <p className={listSubtitle}>{room.summary}</p>
          <div className={cx(listMeta, "mt-1 flex items-center gap-1.5")}>
            <span className="rounded-full border border-white/15 bg-white/10 px-1.5 py-0.5">{room.category}</span>
            <span className="inline-flex items-center gap-1">
              <span aria-hidden="true">{room.privacy.toLowerCase() === "public" ? "🌐" : "🔒"}</span>
              {privacyLabel(room.privacy)}
            </span>
            <span>{room.totalMembers} {t("common.members")}</span>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
          <p className={cx(listMeta, "hidden items-center gap-1.5 md:inline-flex")}>
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(92,255,190,0.78)]" />
            {room.onlineUsers} {t("common.online")}
          </p>

          {showCancelRequest ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCancelRoomRequest(room)}
              className={cx(homeBtnSecondary, "px-2.5")}
              style={{ height: "var(--btn-h-sm)" }}
            >
              {t("common.cancel")}
            </button>
          ) : null}

          {!showCancelRequest ? (
            <button
              type="button"
              disabled={busy || room.action === "requested" || room.action === "blocked"}
              onClick={() => void handleRoomAction(room)}
              className={cx(
                room.featured ? homeBtnPrimary : homeBtnSecondary,
                "px-3",
                (room.action === "requested" || room.action === "blocked") && "cursor-not-allowed opacity-70",
              )}
              style={{ height: "var(--btn-h-sm)" }}
            >
              {primaryActionLabel(room)}
            </button>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <Panel
      className={cx(
        "suzi-panel--home overflow-hidden p-[var(--panel-pad)]",
        variant === "dashboard" && "suzi-home-row1-panel flex w-full min-h-0 flex-col",
      )}
    >
      <div className={cx(homePanelHeader, "flex flex-wrap items-center justify-between gap-3", variant === "dashboard" && "shrink-0")}>
        <div className="flex items-center gap-2.5">
          <span className={homePanelIcon}>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 7.5h14a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2h-7l-4 3v-3H7a2 2 0 0 1-2-2V7.5Z" />
              <path d="M10 12h.01M13 12h.01M16 12h.01" />
            </svg>
          </span>
          <h2 className={panelTitle}>{t("rooms.title")}</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className={cx(homeBtnPrimary, "px-3")}
            style={{ height: "var(--btn-h-sm)" }}
          >
            + {t("rooms.createRoom")}
          </button>
        </div>
      </div>

      {/* MOBILE TOOLBAR (< md) — search + single filter button that opens
        * a popover with all categories. Categories chips are hidden on
        * mobile so the panel stays clean and tall. */}
      <div className={cx("mt-3 flex items-center gap-2 md:hidden", variant === "dashboard" && "shrink-0")}>
        <label className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 inline-flex items-center text-cyan-100/58">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.2-3.2" />
            </svg>
          </span>
          <input
            className={cx(
              homeSearchInput,
              "w-full rounded-[0.7rem] border py-1.5 pl-8 pr-3 focus:border-fuchsia-300/52 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/24",
            )}
            placeholder={t("rooms.searchPlaceholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{ height: "var(--btn-h-sm)" }}
          />
        </label>
        <div className="relative shrink-0" ref={mobileFilterRef}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={showMobileFilter}
            aria-label={t("rooms.filterByCategory")}
            onClick={() => setShowMobileFilter((value) => !value)}
            className={cx(
              homeTabClasses(activeCategory !== "All" || showMobileFilter),
              "justify-center gap-1 px-2",
            )}
            style={{ minWidth: "1.35rem" }}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M6 12h12M10 18h4" />
            </svg>
            {activeCategory !== "All" ? (
              <span className={cx(listL1, "max-w-[6rem] truncate font-medium")}>
                {categoryLabel(activeCategory)}
              </span>
            ) : null}
          </button>
          {showMobileFilter ? (
            <div className="suzi-home-dropdown absolute right-0 top-[calc(100%+0.35rem)] z-30 min-w-[9.5rem] rounded-[0.85rem] border p-1 backdrop-blur">
              {[...primaryCategories, ...extraCategories].map((category) => (
                <button
                  key={category}
                  type="button"
                    className={cx(
                      listL1,
                      "flex w-full items-center rounded-[0.45rem] px-1.5 py-1 text-left font-medium leading-none transition",
                      activeCategory === category
                        ? "bg-fuchsia-500/26 text-white"
                        : "text-cyan-100/84 hover:bg-cyan-400/10 hover:text-white",
                    )}
                  onClick={() => {
                    setActiveCategory(category);
                    setShowMobileFilter(false);
                  }}
                >
                  {categoryLabel(category)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* DESKTOP TOOLBAR (>= md) — chips + ... overflow + search. */}
      <div className={cx("mt-3 hidden min-w-0 items-center gap-2 md:flex", variant === "dashboard" && "shrink-0")}>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <div className="suzi-scrollbar flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto pb-1 pr-1">
            {primaryCategories.map((category) => (
              <button
                key={category}
                type="button"
                className={homeTabClasses(activeCategory === category)}
                onClick={() => setActiveCategory(category)}
              >
                {categoryLabel(category)}
              </button>
            ))}
          </div>

          <div className={cx("relative shrink-0 pb-1", showMoreCategories && "z-30")} ref={moreCategoriesRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={showMoreCategories}
              className={homeTabClasses(showMoreCategories || moreCategoryActive)}
              onClick={() => setShowMoreCategories((value) => !value)}
            >
              ...
            </button>
            {showMoreCategories ? (
              <div className="suzi-home-dropdown absolute right-0 top-[calc(100%+0.2rem)] z-30 min-w-[9rem] rounded-[0.8rem] border p-1">
                {extraCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={cx(
                      listL1,
                      "flex w-full items-center rounded-[0.45rem] px-1.5 py-1 text-left font-medium leading-none transition",
                      activeCategory === category
                        ? "bg-fuchsia-500/24 text-white"
                        : "text-cyan-100/84 hover:bg-cyan-400/10 hover:text-white",
                    )}
                    onClick={() => {
                      setActiveCategory(category);
                      setShowMoreCategories(false);
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <label className="relative ml-auto w-44 shrink-0 sm:w-48">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 inline-flex items-center text-cyan-100/58">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.85"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.2-3.2" />
            </svg>
          </span>
          <input
            className={cx(
              homeSearchInput,
              "w-full rounded-[0.7rem] border py-1.5 pl-8 pr-3 focus:border-fuchsia-300/52 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/24",
            )}
            placeholder={t("rooms.searchPlaceholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{ height: "var(--btn-h-sm)" }}
          />
        </label>
      </div>

      <div
        className={cx(
          "suzi-scrollbar mt-4 min-h-0 overflow-y-auto",
          variant === "dashboard"
            ? "suzi-home-chat-rooms-list suzi-home-row1-scroll min-h-0"
            : "h-[550px]",
        )}
      >
        {roomsLoading ? (
          <div className={cx(listEmpty, "flex h-full items-center justify-center px-4")}>{t("rooms.loading")}</div>
        ) : roomsError ? (
          <div className={cx(listEmpty, "flex h-full items-center justify-center px-4 text-center text-pink-100")}>
            {roomsError}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className={cx(listEmpty, "flex h-full items-center justify-center px-4")}>
            {t("rooms.noMatches")}
          </div>
        ) : (
          <div className="p-1">
            <section className={cx(homeInset, "overflow-hidden")}>
              {[
                ...groupedFilteredRooms.mine,
                ...groupedFilteredRooms.joined,
                ...groupedFilteredRooms.other,
              ].map((room, index) => renderRoomRow(room, index))}
            </section>
          </div>
        )}
      </div>

      {createModalMounted && isCreateOpen
        ? createPortal(
            <div
              className="suzi-create-room-overlay fixed inset-0 z-[400] overflow-y-auto bg-[rgba(6,10,28,0.78)] p-4 sm:p-6"
              role="presentation"
              onClick={() => setIsCreateOpen(false)}
            >
              <div className="flex min-h-full items-center justify-center py-2">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="create-room-title"
                  className="suzi-create-room-modal w-full max-w-lg rounded-[1.1rem] border border-cyan-300/24 bg-[linear-gradient(160deg,rgba(34,20,101,0.98),rgba(20,14,76,0.96))] shadow-[0_20px_60px_rgba(7,11,30,0.62)]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="suzi-create-room-modal__header flex shrink-0 items-center justify-between gap-3 border-b border-cyan-300/16 px-4 py-3 sm:px-5 sm:py-4">
                    <h3 id="create-room-title" className="text-base font-bold tracking-tight text-white">
                      {t("rooms.createRoom")}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="suzi-secondary-btn shrink-0 px-3 py-1.5 text-sm"
                      aria-label={t("rooms.closeCreateDialog")}
                    >
                      {t("common.close")}
                    </button>
                  </div>
                  <form onSubmit={handleCreateRoom} className="flex min-h-0 flex-col">
                    <div className="suzi-create-room-modal__body suzi-scrollbar space-y-4 px-4 py-4 sm:px-5">
              <div>
                <label className="suzi-create-room-modal__label">{t("rooms.roomName")}</label>
                <input
                  required
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="Movie Nights"
                  className="suzi-input"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="suzi-create-room-modal__label">{t("rooms.category")}</label>
                  <select
                    value={createCategory}
                    onChange={(event) => setCreateCategory(event.target.value)}
                    className="suzi-input"
                  >
                    {roomCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="suzi-create-room-modal__label">{t("rooms.privacy")}</label>
                  <select
                    value={createPrivacy}
                    onChange={(event) =>
                      setCreatePrivacy(event.target.value as (typeof PRIVACY_OPTIONS)[number])
                    }
                    className="suzi-input"
                  >
                    {PRIVACY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {privacyLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="suzi-create-room-modal__label">{t("rooms.roomImage")}</label>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    value={createImageUrl}
                    onChange={(event) => setCreateImageUrl(event.target.value)}
                    placeholder="https://example.com/room-image.png"
                    className="suzi-input"
                  />
                  <label className="suzi-secondary-btn inline-flex cursor-pointer items-center justify-center px-4 py-2.5 text-sm">
                    {t("rooms.upload")}
                    <input type="file" accept="image/*" onChange={handleChooseRoomImage} className="hidden" />
                  </label>
                </div>
                {createImageUrl ? (
                  <div className="mt-2 inline-flex h-14 w-14 overflow-hidden rounded-[0.65rem] border border-cyan-300/24">
                    <img src={createImageUrl} alt={t("rooms.roomPreview")} className="h-full w-full object-cover" />
                  </div>
                ) : null}
              </div>
              <div>
                <label className="suzi-create-room-modal__label">{t("rooms.description")}</label>
                <textarea
                  value={createDescription}
                  onChange={(event) => setCreateDescription(event.target.value)}
                  placeholder={t("rooms.descriptionPlaceholder")}
                  className="suzi-input min-h-24 resize-none"
                />
              </div>
                      {createError ? <p className="text-sm text-pink-100">{createError}</p> : null}
                    </div>
                    <div className="suzi-create-room-modal__footer flex shrink-0 flex-wrap justify-end gap-2 px-4 py-3 sm:px-5 sm:py-4">
                      <button
                        type="button"
                        onClick={() => setIsCreateOpen(false)}
                        className="suzi-secondary-btn px-4 py-2.5 text-sm"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        type="submit"
                        disabled={creating}
                        className="suzi-primary-btn px-4 py-2.5 text-sm disabled:opacity-60"
                      >
                        {creating ? t("rooms.creating") : t("rooms.createRoom")}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </Panel>
  );
}
