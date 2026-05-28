"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChatComposer } from "@/components/app/chat-composer";
import { ChatMessageRow, type LiveChatMessage } from "@/components/app/chat-message-row";
import { PersonRow } from "@/components/app/v1-blocks";
import {
  homePanelHeader,
  listActionBtn,
  listEmpty,
  listL2,
  listMeta,
  listSection,
  listSubtitle,
  listTitle,
  panelTitle,
} from "@/components/app/home-typography";
import { Panel, cx } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import {
  assignRoomModerator,
  approveRoomJoinRequest,
  banRoomMember,
  deleteRoom,
  getRoom,
  getRoomAccess,
  getRoomManagement,
  inviteRoomFriend,
  joinRoom,
  listRoomCategories,
  listRoomInviteCandidates,
  listRoomMessages,
  listMyRoomMessages,
  leaveRoom,
  postRoomMessage,
  rejectRoomJoinRequest,
  removeRoomMember,
  removeRoomModerator,
  requestRoomAccess,
  unbanRoomMember,
  updateRoom,
  type ApiRoom,
  type ApiRoomAccess,
  type ApiRoomInviteCandidate,
  type ApiRoomManagement,
  type ApiRoomMessage,
  type ApiRoomPresenceUser,
} from "@/lib/rooms-client";
import { resolveUserAvatarUrl } from "@/lib/avatar-url";
import { getRealtimeSocket } from "@/lib/realtime-client";

function formatShortTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

const DEFAULT_ROOM_IMAGE = "/logo/logo.png";
const lockIconPath = "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z";
const globeIconPath = "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 3v18M3 12h18";
const friendsIconPath =
  "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5H7a3 3 0 0 0-3 3V20M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M20 20v-1a2.8 2.8 0 0 0-2.1-2.7M16.5 5.5a2.5 2.5 0 0 1 0 5";
const membersIconPath =
  "M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75";

type RoomUserSummary = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
};

function displayRoomUserName(user: RoomUserSummary) {
  return user.displayName?.trim() || user.username;
}

function roomPresenceDotClass(online: boolean) {
  return online
    ? "bg-emerald-300 shadow-[0_0_10px_rgba(110,255,178,0.75)]"
    : "bg-slate-500";
}

function RoomUserRow({
  user,
  subtitle,
  online,
  action,
}: {
  user: RoomUserSummary;
  subtitle?: string;
  online: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="suzi-home-row flex items-center justify-between gap-2.5 rounded-[0.72rem] px-2.5 py-1.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="relative shrink-0" style={{ width: "var(--avatar-md)", height: "var(--avatar-md)" }}>
          <img
            src={resolveUserAvatarUrl(user.avatarUrl)}
            alt={`${displayRoomUserName(user)} avatar`}
            className="h-full w-full rounded-full border border-white/14 object-cover"
          />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[rgba(24,16,82,0.95)] bg-[rgba(24,16,82,0.95)]">
            <span className={cx("block h-full w-full rounded-full", roomPresenceDotClass(online))} />
          </span>
        </div>
        <div className="min-w-0">
          <p className={cx(listTitle, "truncate")}>{displayRoomUserName(user)}</p>
          <p className={cx(listSubtitle, "truncate")}>{subtitle ?? `@${user.username}`}</p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function RoomChatView({ roomSlug }: { roomSlug: string }) {
  const router = useRouter();
  const [room, setRoom] = useState<ApiRoom | null>(null);
  const [messages, setMessages] = useState<ApiRoomMessage[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [typingName, setTypingName] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [access, setAccess] = useState<ApiRoomAccess | null>(null);
  const [management, setManagement] = useState<ApiRoomManagement | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showDeleteRoomModal, setShowDeleteRoomModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoomImageModal, setShowRoomImageModal] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [inviteFriends, setInviteFriends] = useState<ApiRoomInviteCandidate[]>([]);
  const [inviteMessage, setInviteMessage] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("Social");
  const [editCategories, setEditCategories] = useState<string[]>(["Social"]);
  const [editPrivacy, setEditPrivacy] = useState<"Public" | "Friends" | "Private">("Public");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [mobileMembersOpen, setMobileMembersOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<ApiRoomPresenceUser[]>([]);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const typingHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingAtRef = useRef(0);
  const lastTypingValueRef = useRef(false);
  const roomPeopleRef = useRef(new Map<string, ApiRoomPresenceUser>());

  const refresh = useCallback(async () => {
    setError("");
    const session = getStoredAuthSession();
    const [roomRes, accessRes] = session?.accessToken
      ? await Promise.all([getRoom(roomSlug), getRoomAccess(session.accessToken, roomSlug)])
      : await Promise.all([getRoom(roomSlug), Promise.resolve<ApiRoomAccess | null>(null)]);
    const msgRes = session?.accessToken
      ? await listMyRoomMessages(session.accessToken, roomSlug).catch(() => [])
      : await listRoomMessages(roomSlug);
    setRoom(roomRes);
    setAccess(accessRes);
    setEditName(roomRes.name);
    setEditDescription(roomRes.description ?? "");
    setEditCategory(roomRes.category);
    setEditPrivacy((roomRes.privacy as "Public" | "Friends" | "Private") ?? "Public");
    setEditImageUrl(roomRes.imageUrl ?? "");
    setMessages(msgRes);
  }, [roomSlug]);

  useEffect(() => {
    const s = getStoredAuthSession();
    setMeId(s?.user.id ?? null);
    setHasSession(!!s?.accessToken);
  }, []);

  useEffect(() => {
    const s = getStoredAuthSession();
    if (!s) {
      setSocketReady(false);
      return;
    }
    const socket = getRealtimeSocket(s.accessToken);
    const joinRoom = () => {
      socket.emit("room:join", { roomSlug });
    };
    const onConnect = () => setSocketReady(true);
    const onDisconnect = () => setSocketReady(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect", joinRoom);
    if (socket.connected) {
      setSocketReady(true);
      joinRoom();
    }

    const onRoomMessage = (payload: { roomSlug: string; message: ApiRoomMessage }) => {
      if (payload.roomSlug !== roomSlug) {
        return;
      }
      setMessages((prev) => {
        if (prev.some((row) => row.id === payload.message.id)) {
          return prev;
        }
        return [...prev, payload.message];
      });
    };
    const onRoomPresence = (payload: { roomSlug?: string; onlineUsers?: ApiRoomPresenceUser[] }) => {
      if (payload?.roomSlug !== roomSlug) {
        return;
      }
      setOnlineUsers(payload.onlineUsers ?? []);
    };
    const onRoomTyping = (payload: { roomSlug?: string; userId?: string; typing?: boolean }) => {
      if (!payload?.roomSlug || payload.roomSlug !== roomSlug) {
        return;
      }
      if (!payload.userId || payload.userId === meId) {
        return;
      }
      if (!payload.typing) {
        setTypingName(null);
        if (typingHideTimerRef.current) {
          clearTimeout(typingHideTimerRef.current);
          typingHideTimerRef.current = null;
        }
        return;
      }
      const person = roomPeopleRef.current.get(payload.userId);
      const name = person?.displayName?.trim() || person?.username || "Someone";
      setTypingName(name);
      if (typingHideTimerRef.current) {
        clearTimeout(typingHideTimerRef.current);
      }
      typingHideTimerRef.current = setTimeout(() => {
        setTypingName(null);
      }, 2000);
    };

    socket.on("room:message", onRoomMessage);
    socket.on("room:presence", onRoomPresence);
    socket.on("room:typing", onRoomTyping);
    return () => {
      if (socket.connected) {
        socket.emit("room:leave", { roomSlug });
      }
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect", joinRoom);
      socket.off("room:message", onRoomMessage);
      socket.off("room:presence", onRoomPresence);
      socket.off("room:typing", onRoomTyping);
    };
  }, [meId, roomSlug]);

  useEffect(() => {
    const next = new Map<string, ApiRoomPresenceUser>();
    for (const user of onlineUsers) {
      next.set(user.id, user);
    }
    for (const message of messages) {
      next.set(message.sender.id, message.sender);
    }
    roomPeopleRef.current = next;
  }, [messages, onlineUsers]);

  useEffect(() => {
    setTypingName(null);
    setOnlineUsers([]);
    if (typingHideTimerRef.current) {
      clearTimeout(typingHideTimerRef.current);
      typingHideTimerRef.current = null;
    }
  }, [roomSlug]);

  useEffect(() => {
    const root = messagesScrollRef.current;
    if (!root) {
      return;
    }
    root.scrollTop = root.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (typingHideTimerRef.current) {
        clearTimeout(typingHideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void refresh()
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load room.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    if (!room || (!access?.isOwner && !access?.isModerator)) {
      setManagement(null);
      return;
    }
    void refreshManagement();
  }, [access?.isModerator, access?.isOwner, meId, room?.owner.id]);

  useEffect(() => {
    if (!showEditModal) {
      return;
    }
    void listRoomCategories()
      .then((categories) => {
        const next = categories.map((category) => category.trim()).filter(Boolean);
        setEditCategories(next.length ? next : ["Social"]);
      })
      .catch(() => {
        setEditCategories((prev) => (prev.length ? prev : ["Social"]));
      });
  }, [showEditModal]);

  const onlineCount = onlineUsers.length;
  const authSnap = getStoredAuthSession();
  const myAvatarUrl = authSnap?.user.avatarUrl?.trim() || null;
  const canManageRoom = Boolean(access?.isOwner || access?.isModerator);
  const canAssignModerators = Boolean(access?.isOwner);
  const onlineUserIds = useMemo(
    () => new Set(onlineUsers.map((user) => user.id)),
    [onlineUsers],
  );
  const roomImageUrl = room?.imageUrl?.trim() || DEFAULT_ROOM_IMAGE;
  const roomModerators = room?.moderators?.map((row) => row.user) ?? [];
  const totalRoomMembers = (room?._count?.memberships ?? 0) + (room ? 1 : 0);
  const editCategoryOptions = useMemo(() => {
    const values = new Set(
      [...editCategories, editCategory]
        .map((category) => category.trim())
        .filter(Boolean),
    );
    return [...values];
  }, [editCategories, editCategory]);
  const privacyIconPath =
    room?.privacy === "Private"
      ? lockIconPath
      : room?.privacy === "Friends"
        ? friendsIconPath
        : globeIconPath;

  async function handleSend(body: string) {
    const s = getStoredAuthSession();
    if (!s) {
      return;
    }
    setSending(true);
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: ApiRoomMessage = {
      id: optimisticId,
      body,
      createdAt: new Date().toISOString(),
      sender: {
        id: s.user.id,
        username: s.user.username,
        displayName: s.user.displayName ?? null,
      },
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    try {
      const socket = getRealtimeSocket(s.accessToken);
      socket.emit("room:typing", { roomSlug, typing: false });
      const created = await new Promise<ApiRoomMessage>((resolve, reject) => {
        if (!socket.connected) {
          void postRoomMessage(s.accessToken, roomSlug, body)
            .then(resolve)
            .catch(reject);
          return;
        }
        socket.emit(
          "room:send",
          { roomSlug, body },
          (ack: { ok?: boolean; message?: ApiRoomMessage; error?: string }) => {
            if (ack?.ok && ack.message) {
              resolve(ack.message);
              return;
            }
            reject(new Error(ack?.error || "Send failed."));
          },
        );
      });
      setMessages((prev) => {
        const withoutServerDuplicate = prev.filter((row) => row.id !== created.id);
        return withoutServerDuplicate.map((row) => (row.id === optimisticId ? created : row));
      });
    } catch (e: unknown) {
      setMessages((prev) => prev.filter((row) => row.id !== optimisticId));
      setError(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setSending(false);
    }
  }

  async function handleRoomJoinOrRequest() {
    const s = getStoredAuthSession();
    if (!s?.accessToken || !room) {
      return;
    }
    setActionBusyId("join");
    try {
      if (access?.privacy?.toLowerCase() === "public") {
        await joinRoom(s.accessToken, room.slug);
      } else {
        await requestRoomAccess(s.accessToken, room.slug);
      }
      await refresh();
    } finally {
      setActionBusyId(null);
    }
  }

  async function refreshManagement() {
    const s = getStoredAuthSession();
    if (!s?.accessToken || !room) {
      return;
    }
    const data = await getRoomManagement(s.accessToken, room.slug);
    setManagement(data);
  }

  async function handleOwnerAction(
    action:
      | "approve"
      | "reject"
      | "ban"
      | "remove"
      | "unban"
      | "assignModerator"
      | "removeModerator",
    userId: string,
  ) {
    const s = getStoredAuthSession();
    if (!s?.accessToken || !room) {
      return;
    }
    setActionBusyId(`${action}-${userId}`);
    try {
      if (action === "approve") await approveRoomJoinRequest(s.accessToken, room.slug, userId);
      if (action === "reject") await rejectRoomJoinRequest(s.accessToken, room.slug, userId);
      if (action === "ban") await banRoomMember(s.accessToken, room.slug, userId);
      if (action === "remove") await removeRoomMember(s.accessToken, room.slug, userId);
      if (action === "unban") await unbanRoomMember(s.accessToken, room.slug, userId);
      if (action === "assignModerator") await assignRoomModerator(s.accessToken, room.slug, userId);
      if (action === "removeModerator") await removeRoomModerator(s.accessToken, room.slug, userId);
      await refresh();
      await refreshManagement();
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleSaveRoomEdit(event: React.FormEvent) {
    event.preventDefault();
    const s = getStoredAuthSession();
    if (!s?.accessToken || !room) {
      return;
    }
    setActionBusyId("save-room");
    try {
      await updateRoom(s.accessToken, room.slug, {
        name: editName.trim(),
        description: editDescription.trim(),
        category: editCategory.trim(),
        imageUrl: editImageUrl.trim() || undefined,
        privacy: editPrivacy,
      });
      await refresh();
      setShowEditModal(false);
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleLeaveRoom() {
    const s = getStoredAuthSession();
    if (!s?.accessToken || !room) {
      return;
    }
    setActionBusyId("leave-room");
    try {
      await leaveRoom(s.accessToken, room.slug);
      const socket = getRealtimeSocket(s.accessToken);
      if (socket.connected) {
        socket.emit("room:leave", { roomSlug: room.slug });
      }
      setAccess((prev) =>
        prev
          ? {
              ...prev,
              isMember: false,
              isModerator: false,
              role: null,
              canPost: false,
              canOpen: prev.privacy.toLowerCase() === "public",
            }
          : prev,
      );
      setMessages([]);
      router.replace("/app#chatrooms");
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleDeleteRoomConfirm() {
    const s = getStoredAuthSession();
    if (!s?.accessToken || !room) {
      return;
    }
    setActionBusyId("delete-room");
    setError("");
    try {
      await deleteRoom(s.accessToken, room.slug);
      setShowDeleteRoomModal(false);
      router.replace("/app");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not delete room.");
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleOpenInviteModal() {
    const s = getStoredAuthSession();
    if (!s?.accessToken || !room) {
      return;
    }
    setShowInviteModal(true);
    setInviteMessage("");
    setActionBusyId("load-invites");
    try {
      const candidates = await listRoomInviteCandidates(s.accessToken, room.slug);
      setInviteFriends(candidates);
    } catch (e: unknown) {
      setInviteMessage(e instanceof Error ? e.message : "Could not load friends.");
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleInviteFriend(targetUserId: string) {
    const s = getStoredAuthSession();
    if (!s?.accessToken || !room) {
      return;
    }
    setActionBusyId(`invite-${targetUserId}`);
    setInviteMessage("");
    try {
      await inviteRoomFriend(s.accessToken, room.slug, targetUserId);
      setInviteMessage("Invite sent.");
      setInviteFriends((prev) => prev.filter((friend) => friend.id !== targetUserId));
    } catch (e: unknown) {
      setInviteMessage(e instanceof Error ? e.message : "Could not send invite.");
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleChooseEditImage(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    }).catch(() => "");
    if (dataUrl) {
      setEditImageUrl(dataUrl);
    }
    input.value = "";
  }

  return (
    <section className="suzi-app-frame-fill suzi-room-active">
      <div className="suzi-room-grid">
        <Panel className="suzi-panel--home suzi-room-chat flex h-full min-h-0 flex-col overflow-hidden p-0">
          <div className={cx("suzi-room-chat-header shrink-0", homePanelHeader)}>
            <div className="suzi-room-chat-header-inner flex flex-wrap items-end justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-2">
                <Link
                  href="/app"
                  aria-label="Back"
                  className="suzi-m-icon-btn shrink-0 md:hidden"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowRoomImageModal(true)}
                  className="suzi-room-cover-btn relative h-12 w-12 shrink-0 overflow-hidden rounded-[0.85rem] border border-cyan-300/30 bg-white/8 shadow-[0_0_18px_rgba(0,229,255,0.12)]"
                  aria-label="View room image"
                >
                  <img
                    src={roomImageUrl}
                    alt={`${room?.name ?? roomSlug} room cover`}
                    className="h-full w-full object-cover"
                  />
                </button>
                <div className="suzi-room-chat-title min-w-0">
                  <h1 className={cx(panelTitle, "truncate")}>
                    {loading ? "…" : room?.name ?? roomSlug}
                  </h1>
                  <p className={cx(listL2, "mt-1 max-w-2xl truncate text-cyan-100/82")}>
                    {room?.description ?? ""}
                  </p>
                  <p className={cx(listMeta, "mt-1 flex flex-wrap items-center gap-2 font-bold italic text-cyan-100/78")}>
                    <span>#{room?.category ?? "room"}</span>
                    <span
                      title={room?.privacy ?? "Public"}
                      aria-label={`Room privacy: ${room?.privacy ?? "Public"}`}
                      className="inline-flex items-center"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={privacyIconPath} />
                      </svg>
                    </span>
                    <span className="inline-flex items-center gap-1" title={`${totalRoomMembers} members`}>
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={membersIconPath} />
                      </svg>
                      {totalRoomMembers}
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-200/85">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(110,255,178,0.7)]" />
                      {socketReady ? "live" : "reconnecting"}
                    </span>
                  </p>
                </div>
              </div>
            <div className="suzi-room-chat-actions flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label="Room members"
                onClick={() => setMobileMembersOpen(true)}
                className="suzi-m-icon-btn md:hidden"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                  <circle cx="9.5" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </button>
              {canManageRoom ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className="suzi-room-action-btn suzi-room-action-btn--header"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowManageModal(true);
                      void refreshManagement();
                    }}
                    className="suzi-room-action-btn suzi-room-action-btn--header"
                  >
                    Manage
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {error ? (
          <div className="shrink-0 border-b border-red-300/30 bg-red-500/15 px-[var(--panel-pad)] py-2 text-[var(--fs-xs)] text-red-100">
            {error}
          </div>
        ) : null}

        {!access?.canOpen && hasSession ? (
          <div className="flex flex-1 items-center justify-center bg-[linear-gradient(180deg,rgba(20,16,60,0.6),rgba(14,12,42,0.6))] px-6">
            <div className="max-w-md text-center">
              <p className="text-[var(--fs-sm)] text-cyan-100/82">
                {access?.isBlocked
                  ? "You are blocked from this room."
                  : access?.hasPendingRequest
                    ? "Your join request is pending approval."
                    : "You are not a member of this room yet."}
              </p>
              {!access?.isBlocked && !access?.hasPendingRequest ? (
                <button
                  type="button"
                  disabled={actionBusyId === "join"}
                  onClick={() => void handleRoomJoinOrRequest()}
                  className="suzi-primary-btn mt-3 px-4 py-2 text-[var(--fs-sm)]"
                >
                  {access?.privacy?.toLowerCase() === "public" ? "Join room" : "Request access"}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div
            ref={messagesScrollRef}
            className="suzi-chat-log suzi-thin-scroll mx-[var(--panel-pad-tight)] my-[var(--panel-pad-tight)] flex-1 overflow-y-auto rounded-[var(--panel-radius)] bg-white px-[var(--panel-pad)] py-[var(--panel-pad)] shadow-[inset_0_2px_8px_rgba(7,4,28,0.22),inset_0_0_0_1px_rgba(0,0,0,0.04)]"
          >
            {messages.map((m) => {
              const mine = meId !== null && m.sender.id === meId;
              const live: LiveChatMessage = {
                body: m.body,
                timeLabel: formatShortTime(m.createdAt),
                isMine: mine,
                senderId: mine ? undefined : m.sender.id,
                senderUsername: m.sender.username,
                senderDisplayName: m.sender.displayName ?? m.sender.username,
                senderAvatarUrl: mine ? myAvatarUrl : m.sender.avatarUrl?.trim() || null,
              };
              return <ChatMessageRow key={m.id} variant="live" message={live} />;
            })}
          </div>
        )}

        <div className="suzi-room-composer-shell shrink-0 border-t border-cyan-300/20 bg-[linear-gradient(155deg,rgba(30,19,88,0.84),rgba(17,12,60,0.78))] px-[var(--panel-pad)] py-[var(--panel-pad-tight)]">
          {typingName ? (
            <p className="mb-2 text-xs font-medium text-cyan-100/85">{typingName} is typing...</p>
          ) : null}
          <ChatComposer
            attachInputId={`room-chat-attachment-${roomSlug}`}
            placeholder="Write your message, invite a friend, or call out a game table"
            variant="onDark"
            rows={2}
            disabled={!hasSession || sending || !access?.canPost}
            onTyping={(text) => {
              const s = getStoredAuthSession();
              if (!s) {
                return;
              }
              const nextTyping = text.trim().length > 0;
              const now = Date.now();
              if (
                nextTyping === lastTypingValueRef.current &&
                now - lastTypingAtRef.current < 800
              ) {
                return;
              }
              lastTypingValueRef.current = nextTyping;
              lastTypingAtRef.current = now;
              getRealtimeSocket(s.accessToken).emit("room:typing", {
                roomSlug,
                typing: nextTyping,
              });
            }}
            onSend={handleSend}
          />
        </div>
      </Panel>

      {mobileMembersOpen ? (
        <div
          className="suzi-m-drawer-backdrop md:hidden"
          role="presentation"
          onClick={() => setMobileMembersOpen(false)}
        />
      ) : null}
      <div
        className={cx(
          "suzi-col-stack suzi-room-members",
          mobileMembersOpen && "suzi-room-members--open",
        )}
      >
        {/* Mobile sheet header — only renders on phones */}
        <div className="hidden items-center justify-between border-b border-cyan-300/18 px-4 py-3 max-md:flex">
          <h2 className="text-[var(--fs-lg)] font-semibold text-white">Room Info</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setMobileMembersOpen(false)}
            className="suzi-m-icon-btn"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <Panel className="suzi-panel--home suzi-room-people-panel flex min-h-0 flex-[3_1_0%] flex-col overflow-hidden p-[var(--panel-pad)]">
          <div className={cx(homePanelHeader, "flex shrink-0 items-center justify-between gap-3")}>
            <h2 className={panelTitle}>Room People</h2>
            <span className={cx(listMeta, "inline-flex items-center gap-1 font-semibold text-emerald-100")}>
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,255,178,0.72)]" />
              {onlineCount} online
            </span>
          </div>
          <div className="suzi-home-inset suzi-thin-scroll suzi-room-people-scroll mt-3 flex-1 space-y-3 overflow-y-auto p-2">
            <div>
              <p className={cx(listSection, "mb-1.5 text-cyan-100/76")}>Room Host</p>
              {room ? (
                <RoomUserRow
                  user={room.owner}
                  subtitle="Creator"
                  online={onlineUserIds.has(room.owner.id)}
                  action={
                    room.owner.id !== meId ? (
                      <Link
                        href={`/app/messages?with=${encodeURIComponent(room.owner.id)}`}
                        className={cx(listActionBtn, "border-cyan-300/30 bg-cyan-400/16 text-cyan-50")}
                      >
                        DM
                      </Link>
                    ) : undefined
                  }
                />
              ) : null}
            </div>

            <div>
              <p className={cx(listSection, "mb-1.5 text-cyan-100/76")}>Room Moderators</p>
              <div className="space-y-1">
                {roomModerators.length ? (
                  roomModerators.map((person) => (
                    <RoomUserRow
                      key={`mod-${person.id}`}
                      user={person}
                      subtitle="Moderator"
                      online={onlineUserIds.has(person.id)}
                      action={
                        person.id !== meId ? (
                          <Link
                            href={`/app/messages?with=${encodeURIComponent(person.id)}`}
                            className={cx(listActionBtn, "border-cyan-300/30 bg-cyan-400/16 text-cyan-50")}
                          >
                            DM
                          </Link>
                        ) : undefined
                      }
                    />
                  ))
                ) : (
                  <p className={cx(listEmpty, "px-2 py-1.5")}>No moderators yet.</p>
                )}
              </div>
            </div>

            <div>
              <p className={cx(listSection, "mb-1.5 text-emerald-100/82")}>Online Now</p>
              <div className="space-y-1">
                {onlineUsers.length ? (
                  onlineUsers.map((person) => (
                    <RoomUserRow
                      key={`online-${person.id}`}
                      user={person}
                      subtitle="In this room"
                      online
                      action={
                        person.id !== meId ? (
                          <Link
                            href={`/app/messages?with=${encodeURIComponent(person.id)}`}
                            className={cx(listActionBtn, "border-cyan-300/30 bg-cyan-400/16 text-cyan-50")}
                          >
                            DM
                          </Link>
                        ) : undefined
                      }
                    />
                  ))
                ) : (
                  <p className={cx(listEmpty, "px-2 py-1.5")}>No one else is online right now.</p>
                )}
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="suzi-room-options-panel shrink-0 p-[var(--panel-pad)]">
          <h2 className={panelTitle}>Options</h2>
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              onClick={() => void handleOpenInviteModal()}
              disabled={!access?.isMember || actionBusyId === "load-invites"}
              className="suzi-room-action-btn suzi-room-action-btn--invite"
            >
              {actionBusyId === "load-invites" ? "Loading friends..." : "Invite friend"}
            </button>
            {access?.isMember && !access?.isOwner ? (
              <button
                type="button"
                onClick={() => void handleLeaveRoom()}
                disabled={actionBusyId === "leave-room"}
                className="suzi-room-action-btn suzi-room-action-btn--invite"
              >
                {actionBusyId === "leave-room" ? "Leaving..." : "Leave room"}
              </button>
            ) : null}
            {access?.isOwner ? (
              <button
                type="button"
                onClick={() => {
                  setShowDeleteRoomModal(true);
                }}
                className="suzi-room-action-btn suzi-room-action-btn--danger"
              >
                Delete room…
              </button>
            ) : null}
          </div>
        </Panel>
      </div>
      </div>

      {showRoomImageModal && room ? (
        <div
          className="fixed inset-0 z-[276] flex items-center justify-center bg-[rgba(6,10,28,0.78)] p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${room.name} room image`}
          onClick={() => setShowRoomImageModal(false)}
        >
          <div
            className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-[1.15rem] border border-cyan-300/24 bg-[rgba(12,16,48,0.95)] shadow-[0_24px_70px_rgba(5,8,28,0.58)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-cyan-300/18 px-4 py-3">
              <h3 className={panelTitle}>{room.name}</h3>
              <button
                type="button"
                onClick={() => setShowRoomImageModal(false)}
                className="suzi-secondary-btn px-3 py-1.5 text-xs"
              >
                Close
              </button>
            </div>
            <div className="flex max-h-[74vh] items-center justify-center p-3">
              <img
                src={roomImageUrl}
                alt={`${room.name} room cover`}
                className="max-h-[70vh] w-auto max-w-full rounded-[0.9rem] object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}

      {showEditModal ? (
        <div className="fixed inset-0 z-[270] flex items-center justify-center bg-[rgba(6,10,28,0.72)] p-4">
          <div className="w-full max-w-lg rounded-[1.1rem] border border-cyan-300/24 bg-[linear-gradient(160deg,rgba(34,20,101,0.96),rgba(20,14,76,0.94))] p-4 shadow-[0_20px_60px_rgba(7,11,30,0.62)] sm:p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Edit Room</h3>
              <button type="button" onClick={() => setShowEditModal(false)} className="suzi-secondary-btn px-3 py-1.5 text-xs">
                Close
              </button>
            </div>
            <form onSubmit={handleSaveRoomEdit} className="mt-4 space-y-3">
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="suzi-input" required />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="suzi-input"
                >
                  {editCategoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <select
                  value={editPrivacy}
                  onChange={(e) => setEditPrivacy(e.target.value as "Public" | "Friends" | "Private")}
                  className="suzi-input"
                >
                  <option value="Public">Public</option>
                  <option value="Friends">Friends</option>
                  <option value="Private">Private</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/76">
                  Room image / icon / logo
                </label>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    placeholder="https://example.com/room-image.png"
                    className="suzi-input"
                  />
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-[0.72rem] border border-cyan-300/28 bg-cyan-400/14 px-3 text-xs font-semibold text-cyan-50">
                    Upload
                    <input type="file" accept="image/*" onChange={handleChooseEditImage} className="hidden" />
                  </label>
                </div>
                {editImageUrl ? (
                  <div className="mt-2 inline-flex h-14 w-14 overflow-hidden rounded-[0.65rem] border border-cyan-300/24">
                    <img src={editImageUrl} alt="Room preview" className="h-full w-full object-cover" />
                  </div>
                ) : null}
              </div>
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="suzi-input min-h-24 resize-none" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="suzi-secondary-btn px-3 py-1.5 text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={actionBusyId === "save-room"} className="suzi-primary-btn px-3 py-1.5 text-xs">
                  {actionBusyId === "save-room" ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showInviteModal && room ? (
        <div className="fixed inset-0 z-[272] flex items-center justify-center bg-[rgba(6,10,28,0.72)] p-4">
          <div className="w-full max-w-md rounded-[1.1rem] border border-cyan-300/24 bg-[linear-gradient(160deg,rgba(34,20,101,0.96),rgba(20,14,76,0.94))] p-4 shadow-[0_20px_60px_rgba(7,11,30,0.62)] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-white">Invite friends</h3>
                <p className="mt-1 text-sm text-cyan-100/76">Send a live room invite for {room.name}.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="suzi-secondary-btn px-3 py-1.5 text-xs"
              >
                Close
              </button>
            </div>

            {inviteMessage ? (
              <p className="mt-3 rounded-[0.8rem] border border-cyan-300/18 bg-white/7 px-3 py-2 text-sm text-cyan-50/88">
                {inviteMessage}
              </p>
            ) : null}

            <div className="suzi-thin-scroll mt-4 max-h-[52vh] space-y-3 overflow-y-auto pr-1">
              {actionBusyId === "load-invites" ? (
                <p className="text-sm text-cyan-100/72">Loading friends...</p>
              ) : inviteFriends.length === 0 ? (
                <p className="text-sm text-cyan-100/72">No eligible friends to invite right now.</p>
              ) : (
                inviteFriends.map((friend) => (
                  <PersonRow
                    key={friend.id}
                    person={{
                      id: friend.id,
                      name: friend.displayName?.trim() || friend.username,
                      handle: `@${friend.username}`,
                      avatar: resolveUserAvatarUrl(friend.avatarUrl),
                    }}
                    compact
                    action={
                      <button
                        type="button"
                        onClick={() => void handleInviteFriend(friend.id)}
                        disabled={actionBusyId === `invite-${friend.id}`}
                        className="suzi-primary-btn px-3 py-2 text-xs"
                      >
                        {actionBusyId === `invite-${friend.id}` ? "Sending..." : "Invite"}
                      </button>
                    }
                  />
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteRoomModal && room ? (
        <div className="fixed inset-0 z-[275] flex items-center justify-center bg-[rgba(6,10,28,0.72)] p-4">
          <div className="w-full max-w-md rounded-[1.1rem] border border-red-400/30 bg-[linear-gradient(160deg,rgba(50,18,40,0.97),rgba(20,12,48,0.95))] p-4 shadow-[0_20px_60px_rgba(7,11,30,0.62)] sm:p-5">
            <h3 className="text-xl font-semibold text-white">Delete this room?</h3>
            <p className="mt-2 text-sm text-cyan-100/80">
              This permanently removes the room, all messages, members, and join requests. This cannot be undone.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteRoomModal(false);
                }}
                className="suzi-secondary-btn px-3 py-1.5 text-xs"
              >
                No, keep room
              </button>
              <button
                type="button"
                disabled={actionBusyId === "delete-room"}
                onClick={() => void handleDeleteRoomConfirm()}
                className="rounded-full border border-red-400/50 bg-red-600/85 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionBusyId === "delete-room" ? "Deleting…" : "Yes, delete room"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showManageModal ? (
        <div className="fixed inset-0 z-[270] flex items-center justify-center bg-[rgba(6,10,28,0.72)] p-4">
          <div className="w-full max-w-2xl rounded-[1.1rem] border border-cyan-300/24 bg-[linear-gradient(160deg,rgba(34,20,101,0.96),rgba(20,14,76,0.94))] p-4 shadow-[0_20px_60px_rgba(7,11,30,0.62)] sm:p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Manage Members</h3>
              <button type="button" onClick={() => setShowManageModal(false)} className="suzi-secondary-btn px-3 py-1.5 text-xs">
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/76">Requests</p>
                <div className="space-y-2">
                  {management?.pendingRequests.map((row) => (
                    <div key={row.userId} className="rounded border border-cyan-300/20 p-2 text-xs text-cyan-50">
                      <p>{row.user.displayName?.trim() || row.user.username}</p>
                      <div className="mt-1 flex gap-1">
                        <button type="button" onClick={() => void handleOwnerAction("approve", row.userId)} className="suzi-primary-btn px-2 py-1 text-[11px]">
                          Approve
                        </button>
                        <button type="button" onClick={() => void handleOwnerAction("reject", row.userId)} className="suzi-secondary-btn px-2 py-1 text-[11px]">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/76">Members</p>
                <div className="space-y-2">
                  {management?.members.map((row) => {
                    const isModerator = row.role === "moderator";
                    const canManageThisMember =
                      row.userId !== meId && (!isModerator || canAssignModerators);
                    return (
                      <div key={row.userId} className="rounded border border-cyan-300/20 p-2 text-xs text-cyan-50">
                        <div className="flex items-center justify-between gap-2">
                          <p>{row.user.displayName?.trim() || row.user.username}</p>
                          {isModerator ? (
                            <span className="rounded-full border border-cyan-300/25 bg-cyan-400/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                              Mod
                            </span>
                          ) : null}
                        </div>
                        {canManageThisMember ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {canAssignModerators ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleOwnerAction(
                                    isModerator ? "removeModerator" : "assignModerator",
                                    row.userId,
                                  )
                                }
                                className="suzi-secondary-btn px-2 py-1 text-[11px]"
                              >
                                {isModerator ? "Take mod" : "Make mod"}
                              </button>
                            ) : null}
                            <button type="button" onClick={() => void handleOwnerAction("remove", row.userId)} className="suzi-secondary-btn px-2 py-1 text-[11px]">
                              Remove
                            </button>
                            <button type="button" onClick={() => void handleOwnerAction("ban", row.userId)} className="suzi-secondary-btn px-2 py-1 text-[11px]">
                              Ban
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/76">Banned</p>
                <div className="space-y-2">
                  {management?.bannedUsers.map((row) => (
                    <div key={row.userId} className="rounded border border-cyan-300/20 p-2 text-xs text-cyan-50">
                      <p>{row.user.displayName?.trim() || row.user.username}</p>
                      <button type="button" onClick={() => void handleOwnerAction("unban", row.userId)} className="suzi-secondary-btn mt-1 px-2 py-1 text-[11px]">
                        Unban
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
