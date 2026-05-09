"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Panel, cx } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import { getRealtimeSocket } from "@/lib/realtime-client";
import {
  cancelRoomJoinRequest,
  createRoom,
  joinRoom,
  leaveRoom,
  listRoomCategories,
  listRooms,
  listRoomsForMe,
  requestRoomAccess,
  type ApiRoom,
} from "@/lib/rooms-client";

type HomeRoom = {
  id: string;
  name: string;
  emoji?: string;
  summary: string;
  detail?: string;
  onlineUsers: number;
  totalMembers: number;
  image: string;
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

const DEFAULT_ROOM_COVER = "/banner/general_chat_banner.png";

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

function apiRoomToHomeRoom(room: ApiRoom, myUserId?: string): HomeRoom {
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

  return {
    id: room.slug,
    name: room.name,
    summary: room.description?.trim() || "Open conversation",
    detail: undefined,
    onlineUsers: 0,
    totalMembers: room._count?.memberships ?? 0,
    image: room.imageUrl?.trim() || DEFAULT_ROOM_COVER,
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

function getTabClasses(active: boolean) {
  return cx(
    "inline-flex shrink-0 items-center rounded-[0.6rem] border px-2 py-1 text-[var(--fs-2xs)] font-medium leading-none transition",
    active
      ? "border-fuchsia-300/50 bg-[linear-gradient(90deg,rgba(157,78,221,0.95),rgba(255,32,121,0.85))] text-white shadow-[0_0_16px_rgba(255,32,121,0.28)]"
      : "border-cyan-300/20 bg-[rgba(26,18,74,0.66)] text-cyan-100/78 hover:border-cyan-300/36 hover:text-white",
  );
}

function roomGroupShellClassName() {
  return cx(
    "overflow-hidden rounded-[0.95rem]",
    "border border-cyan-300/16",
    "bg-[linear-gradient(165deg,rgba(42,26,108,0.45),rgba(18,11,46,0.42))]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_6px_22px_rgba(8,6,34,0.28)]",
  );
}

export function HomeChatRoomsPanel({
  variant = "default",
}: {
  variant?: "default" | "dashboard";
}) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const moreCategoriesRef = useRef<HTMLDivElement>(null);
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

  const roomSlugKey = useMemo(() => sourceRooms.map((room) => room.id).join("\0"), [sourceRooms]);

  useEffect(() => {
    let cancelled = false;
    const session = getStoredAuthSession();
    setViewerId(session?.user.id);
    setRoomsLoading(true);
    setRoomsError("");
    const loader = session?.accessToken ? listRoomsForMe(session.accessToken) : listRooms();
    void loader
      .then((rows) => {
        if (cancelled) {
          return;
        }
        const myId = session?.user.id;
        setSourceRooms(rows.map((row) => apiRoomToHomeRoom(row, myId)));
      })
      .catch((e: unknown) => {
        if (cancelled) {
          return;
        }
        setRoomsError(e instanceof Error ? e.message : "Could not load rooms.");
        setSourceRooms([]);
      })
      .finally(() => {
        if (!cancelled) {
          setRoomsLoading(false);
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
      setCreateError("Please choose an image file.");
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
      setCreateError("Could not load selected image.");
    }
    input.value = "";
  }

  async function handleCreateRoom(event: React.FormEvent) {
    event.preventDefault();
    const s = getStoredAuthSession();
    if (!s) {
      setCreateError("Not signed in.");
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
      const mapped = apiRoomToHomeRoom(room, s.user.id);
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
      setCreateError(e instanceof Error ? e.message : "Could not create room.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRoomAction(room: HomeRoom) {
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      window.alert("Sign in to use room actions.");
      return;
    }
    if (room.action === "open") {
      window.location.href = `/app/rooms/${encodeURIComponent(room.id)}`;
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

  async function handleLeaveRoom(room: HomeRoom) {
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      return;
    }
    if (room.isOwner) {
      return;
    }
    setActingRoomId(room.id);
    try {
      await leaveRoom(session.accessToken, room.id);
      setSourceRooms((prev) =>
        prev.map((row) => {
          if (row.id !== room.id) {
            return row;
          }
          return {
            ...row,
            isMember: false,
            isOwner: false,
            hasPendingRequest: false,
            totalMembers: Math.max(0, row.totalMembers - 1),
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
      return "Open";
    }
    if (room.action === "join") {
      return "Join";
    }
    if (room.action === "request") {
      return "Request";
    }
    if (room.action === "requested") {
      return "Pending";
    }
    return "Blocked";
  }

  function renderRoomRow(room: HomeRoom, index: number) {
    const busy = actingRoomId === room.id;
    const showLeave = room.isMember && !room.isOwner && !room.isBlocked;
    const showCancelRequest = room.hasPendingRequest && !room.isMember && !room.isBlocked;

    return (
      <article
        key={room.id}
        className={cx(
          "flex items-center gap-2.5 px-2.5 py-2 sm:px-3 sm:py-2.5",
          index > 0 && "border-t border-cyan-300/12",
        )}
      >
        <Link
          href={`/app/rooms/${room.id}`}
          className="relative shrink-0 overflow-hidden rounded-[0.7rem] border border-cyan-300/24"
          style={{ width: "clamp(3.6rem, 5.2vw, 4.4rem)", height: "clamp(2.8rem, 4.5vh + 0.5rem, 3.5rem)" }}
        >
          <img src={room.image} alt={`${room.name} cover`} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,26,0.05),rgba(4,8,26,0.42))]" />
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={`/app/rooms/${room.id}`}
            className="block truncate text-[var(--fs-xs)] font-semibold leading-tight text-white transition hover:text-cyan-50"
          >
            {room.name}
            {room.emoji ? ` ${room.emoji}` : ""}
          </Link>

          <p className="mt-0.5 truncate text-[var(--fs-2xs)] text-cyan-50/82">{room.summary}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[var(--fs-2xs)] text-cyan-100/72">
            <span className="rounded-full border border-white/15 bg-white/10 px-1.5 py-0.5">{room.category}</span>
            <span className="inline-flex items-center gap-1">
              <span aria-hidden="true">{room.privacy.toLowerCase() === "public" ? "🌐" : "🔒"}</span>
              {room.privacy}
            </span>
            <span>{room.totalMembers} members</span>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
          <p className="hidden md:inline-flex items-center gap-1.5 text-[var(--fs-2xs)] text-cyan-100/72">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(92,255,190,0.78)]" />
            {room.onlineUsers} online
          </p>

          {showCancelRequest ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCancelRoomRequest(room)}
              className="inline-flex items-center justify-center rounded-[0.7rem] border border-cyan-300/28 bg-[rgba(26,18,74,0.66)] px-2.5 text-[var(--fs-2xs)] font-semibold text-cyan-50 transition hover:border-cyan-300/50 disabled:opacity-60"
              style={{ height: "var(--btn-h-sm)" }}
            >
              Cancel
            </button>
          ) : null}

          {showLeave ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleLeaveRoom(room)}
              className="inline-flex items-center justify-center rounded-[0.7rem] border border-cyan-300/28 bg-[rgba(26,18,74,0.66)] px-2.5 text-[var(--fs-2xs)] font-semibold text-cyan-50 transition hover:border-cyan-300/50 disabled:opacity-60"
              style={{ height: "var(--btn-h-sm)" }}
            >
              Leave
            </button>
          ) : null}

          {!showCancelRequest ? (
            <button
              type="button"
              disabled={busy || room.action === "requested" || room.action === "blocked"}
              onClick={() => void handleRoomAction(room)}
              className={cx(
                "inline-flex items-center justify-center rounded-[0.7rem] border px-3 text-[var(--fs-xs)] font-semibold transition",
                (room.action === "requested" || room.action === "blocked") && "cursor-not-allowed opacity-70",
                room.featured
                  ? "border-fuchsia-300/45 bg-[linear-gradient(90deg,rgba(157,78,221,0.8),rgba(255,32,121,0.76))] text-white hover:border-fuchsia-200/72"
                  : "border-fuchsia-300/28 bg-[rgba(67,28,155,0.52)] text-cyan-100/92 hover:border-fuchsia-300/50",
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
        "overflow-hidden p-[var(--panel-pad)]",
        variant === "dashboard" && "flex h-full min-h-0 flex-col",
      )}
    >
      <div className={cx("flex flex-wrap items-center justify-between gap-3", variant === "dashboard" && "shrink-0")}>
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-[0.7rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-fuchsia-100/92 shadow-[0_0_12px_rgba(157,78,221,0.28)]">
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
          <h2 className="text-[var(--fs-xl)] font-bold tracking-tight text-white">Suzi Chat Rooms</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center rounded-full border border-fuchsia-200/44 bg-[linear-gradient(90deg,#ff2da7,#ce2fff)] px-3 text-[var(--fs-xs)] font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_14px_rgba(255,45,167,0.56),0_8px_22px_rgba(101,24,194,0.45)] transition hover:brightness-110"
            style={{ height: "var(--btn-h-sm)" }}
          >
            + Create Room
          </button>
        </div>
      </div>

      <div className={cx("mt-3 flex items-center gap-2", variant === "dashboard" && "shrink-0")}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="suzi-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto pb-1 pr-1">
            {primaryCategories.map((category) => (
              <button
                key={category}
                type="button"
                className={getTabClasses(activeCategory === category)}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className={cx("relative shrink-0 pb-1", showMoreCategories && "z-30")} ref={moreCategoriesRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={showMoreCategories}
              className={getTabClasses(showMoreCategories || moreCategoryActive)}
              onClick={() => setShowMoreCategories((value) => !value)}
            >
              ...
            </button>
            {showMoreCategories ? (
              <div className="absolute right-0 top-[calc(100%+0.2rem)] z-30 min-w-[9rem] rounded-[0.8rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(24,14,72,0.98),rgba(18,11,56,0.96))] p-1 shadow-[0_10px_24px_rgba(8,6,34,0.55)]">
                {extraCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={cx(
                      "flex w-full items-center rounded-[0.58rem] px-2.5 py-1.5 text-left text-sm transition",
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
            className="w-full rounded-[0.7rem] border border-cyan-300/24 bg-[linear-gradient(95deg,rgba(36,22,101,0.62),rgba(24,14,76,0.7))] py-1.5 pl-8 pr-3 text-[var(--fs-xs)] text-cyan-50/94 placeholder:text-cyan-100/45 focus:border-fuchsia-300/52 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/24"
            placeholder="Search rooms..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{ height: "var(--btn-h-sm)" }}
          />
        </label>
      </div>

      <div
        className={cx(
          "suzi-scrollbar mt-4 overflow-y-auto rounded-[1.15rem] border border-cyan-300/22 bg-transparent",
          variant === "dashboard" ? "min-h-0 flex-1" : "h-[550px]",
        )}
      >
        {roomsLoading ? (
          <div className="flex h-full items-center justify-center px-4 text-sm text-cyan-100/66">Loading rooms…</div>
        ) : roomsError ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-pink-100">{roomsError}</div>
        ) : filteredRooms.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-sm text-cyan-100/66">
            No rooms match this filter.
          </div>
        ) : (
          <div className="p-1">
            <section className={roomGroupShellClassName()}>
              {[
                ...groupedFilteredRooms.mine,
                ...groupedFilteredRooms.joined,
                ...groupedFilteredRooms.other,
              ].map((room, index) => renderRoomRow(room, index))}
            </section>
          </div>
        )}
      </div>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-[rgba(6,10,28,0.72)] p-4">
          <div className="w-full max-w-lg rounded-[1.1rem] border border-cyan-300/24 bg-[linear-gradient(160deg,rgba(34,20,101,0.96),rgba(20,14,76,0.94))] p-4 shadow-[0_20px_60px_rgba(7,11,30,0.62)] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-white">Create Room</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full border border-cyan-300/30 bg-cyan-400/16 px-2 py-1 text-xs font-semibold text-cyan-100"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleCreateRoom} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/76">
                  Room name
                </label>
                <input
                  required
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="Movie Nights"
                  className="h-10 w-full rounded-[0.72rem] border border-cyan-300/24 bg-[rgba(20,13,62,0.66)] px-3 text-sm text-cyan-50 placeholder:text-cyan-100/45 focus:border-fuchsia-300/52 focus:outline-none"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/76">
                    Category
                  </label>
                  <select
                    value={createCategory}
                    onChange={(event) => setCreateCategory(event.target.value)}
                    className="h-10 w-full rounded-[0.72rem] border border-cyan-300/24 bg-[rgba(20,13,62,0.66)] px-3 text-sm text-cyan-50 focus:border-fuchsia-300/52 focus:outline-none"
                  >
                    {roomCategories.map((category) => (
                      <option key={category} value={category} className="text-slate-900">
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/76">
                    Privacy
                  </label>
                  <select
                    value={createPrivacy}
                    onChange={(event) =>
                      setCreatePrivacy(event.target.value as (typeof PRIVACY_OPTIONS)[number])
                    }
                    className="h-10 w-full rounded-[0.72rem] border border-cyan-300/24 bg-[rgba(20,13,62,0.66)] px-3 text-sm text-cyan-50 focus:border-fuchsia-300/52 focus:outline-none"
                  >
                    {PRIVACY_OPTIONS.map((option) => (
                      <option key={option} value={option} className="text-slate-900">
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/76">
                  Room image / icon / logo
                </label>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    value={createImageUrl}
                    onChange={(event) => setCreateImageUrl(event.target.value)}
                    placeholder="https://example.com/room-image.png"
                    className="h-10 w-full rounded-[0.72rem] border border-cyan-300/24 bg-[rgba(20,13,62,0.66)] px-3 text-sm text-cyan-50 placeholder:text-cyan-100/45 focus:border-fuchsia-300/52 focus:outline-none"
                  />
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-[0.72rem] border border-cyan-300/28 bg-cyan-400/14 px-3 text-xs font-semibold text-cyan-50">
                    Upload
                    <input type="file" accept="image/*" onChange={handleChooseRoomImage} className="hidden" />
                  </label>
                </div>
                {createImageUrl ? (
                  <div className="mt-2 inline-flex h-14 w-14 overflow-hidden rounded-[0.65rem] border border-cyan-300/24">
                    <img src={createImageUrl} alt="Room preview" className="h-full w-full object-cover" />
                  </div>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/76">
                  Description
                </label>
                <textarea
                  value={createDescription}
                  onChange={(event) => setCreateDescription(event.target.value)}
                  placeholder="Describe room purpose and vibe"
                  className="min-h-24 w-full resize-none rounded-[0.72rem] border border-cyan-300/24 bg-[rgba(20,13,62,0.66)] px-3 py-2 text-sm text-cyan-50 placeholder:text-cyan-100/45 focus:border-fuchsia-300/52 focus:outline-none"
                />
              </div>
              {createError ? (
                <p className="text-xs text-pink-100">{createError}</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-full border border-cyan-300/28 bg-cyan-400/16 px-3 py-1.5 text-xs font-semibold text-cyan-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-full border border-fuchsia-200/44 bg-[linear-gradient(90deg,#ff2da7,#ce2fff)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {creating ? "Creating..." : "Create room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
