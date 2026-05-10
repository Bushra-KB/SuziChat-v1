"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatComposer } from "@/components/app/chat-composer";
import { ChatMessageRow, type LiveChatMessage } from "@/components/app/chat-message-row";
import { PersonRow } from "@/components/app/v1-blocks";
import { Panel, cx } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import {
  approveRoomJoinRequest,
  banRoomMember,
  deleteRoom,
  getRoom,
  getRoomAccess,
  getRoomManagement,
  joinRoom,
  listRoomMessages,
  listMyRoomMessages,
  leaveRoom,
  postRoomMessage,
  rejectRoomJoinRequest,
  removeRoomMember,
  requestRoomAccess,
  unbanRoomMember,
  updateRoom,
  type ApiRoom,
  type ApiRoomAccess,
  type ApiRoomManagement,
  type ApiRoomMessage,
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
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("Social");
  const [editPrivacy, setEditPrivacy] = useState<"Public" | "Friends" | "Private">("Public");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [mobileMembersOpen, setMobileMembersOpen] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const typingHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingAtRef = useRef(0);
  const lastTypingValueRef = useRef(false);

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
      const person = messages.find((row) => row.sender.id === payload.userId)?.sender;
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
    socket.on("room:typing", onRoomTyping);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect", joinRoom);
      socket.off("room:message", onRoomMessage);
      socket.off("room:typing", onRoomTyping);
    };
  }, [meId, messages, roomSlug]);

  useEffect(() => {
    setTypingName(null);
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
    if (!room || room.owner.id !== meId) {
      setManagement(null);
      return;
    }
    void refreshManagement();
  }, [meId, room?.owner.id]);

  const participantRows = useMemo(() => {
    const map = new Map<string, ApiRoomMessage["sender"]>();
    for (const message of messages) {
      map.set(message.sender.id, message.sender);
    }
    return [...map.values()];
  }, [messages]);
  const onlineCount = participantRows.length;
  const authSnap = getStoredAuthSession();
  const myAvatarUrl = authSnap?.user.avatarUrl?.trim() || null;

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

  async function handleOwnerAction(action: "approve" | "reject" | "ban" | "remove" | "unban", userId: string) {
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
      await refresh();
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleDeleteRoomConfirm() {
    const s = getStoredAuthSession();
    if (!s?.accessToken || !room) {
      return;
    }
    if (deleteConfirmName.trim() !== room.name.trim()) {
      return;
    }
    setActionBusyId("delete-room");
    setError("");
    try {
      await deleteRoom(s.accessToken, room.slug);
      setShowDeleteRoomModal(false);
      setDeleteConfirmName("");
      router.replace("/app");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not delete room.");
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
      <Panel className="suzi-room-chat flex h-full min-h-0 flex-col overflow-hidden border border-cyan-300/24 bg-[linear-gradient(180deg,rgba(36,45,116,0.52),rgba(40,16,117,0.52))] p-0 shadow-[0_14px_38px_rgba(15,23,42,0.2)]">
        <div className="shrink-0 border-b border-cyan-300/20 bg-[linear-gradient(155deg,rgba(30,19,88,0.84),rgba(17,12,60,0.78))] px-[var(--panel-pad)] py-[var(--panel-pad-tight)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
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
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[var(--fs-2xs)] font-semibold uppercase tracking-[0.3em] text-cyan-100/64">
                <span>Room Chat</span>
                <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-emerald-300/85">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(110,255,178,0.7)]" />
                  {socketReady ? "Realtime connected" : "Reconnecting…"}
                </span>
              </p>
              <h1 className="mt-1 truncate text-[var(--fs-2xl)] font-semibold text-white">
                {loading ? "…" : room?.name ?? roomSlug}
              </h1>
              <p className="mt-1 max-w-2xl truncate text-[var(--fs-sm)] text-cyan-100/82">
                {room?.description ?? ""}
              </p>
            </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
              <span className="inline-flex rounded-md border border-cyan-300/35 bg-cyan-400/15 px-3 py-1 text-[var(--fs-2xs)] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                {room?.category ?? "—"}
              </span>
              <span
                className={cx(
                  "inline-flex rounded-md border px-3 py-1 text-[var(--fs-2xs)] font-semibold uppercase tracking-[0.12em]",
                  room?.privacy === "Private"
                    ? "border-pink-300/35 bg-pink-400/15 text-pink-100"
                    : room?.privacy === "Friends"
                      ? "border-violet-300/35 bg-violet-400/15 text-violet-100"
                      : "border-white/14 bg-white/7 text-cyan-100/86",
                )}
              >
                {room?.privacy ?? "—"}
              </span>
              {meId && room?.owner.id === meId ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className="suzi-secondary-btn px-3 py-1 text-[var(--fs-xs)]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowManageModal(true);
                      void refreshManagement();
                    }}
                    className="suzi-secondary-btn px-3 py-1 text-[var(--fs-xs)]"
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
            className="suzi-thin-scroll mx-[var(--panel-pad-tight)] my-[var(--panel-pad-tight)] flex-1 space-y-3 overflow-y-auto rounded-[var(--panel-radius)] bg-white px-[var(--panel-pad)] py-[var(--panel-pad)] shadow-[inset_0_2px_8px_rgba(7,4,28,0.22),inset_0_0_0_1px_rgba(0,0,0,0.04)]"
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

        <div className="shrink-0 border-t border-cyan-300/20 bg-[linear-gradient(155deg,rgba(30,19,88,0.84),rgba(17,12,60,0.78))] px-[var(--panel-pad)] py-[var(--panel-pad-tight)]">
          {typingName ? (
            <p className="mb-2 text-xs font-medium text-cyan-100/85">{typingName} is typing...</p>
          ) : null}
          <ChatComposer
            attachInputId={`room-chat-attachment-${roomSlug}`}
            placeholder="Write your message, invite a friend, or call out a game table"
            variant="onDark"
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
        <Panel className="flex min-h-0 flex-[3_1_0%] flex-col overflow-hidden p-[var(--panel-pad)]">
          <div className="flex shrink-0 items-center justify-between gap-3">
            <h2 className="text-[var(--fs-lg)] font-semibold tracking-tight text-white">Room Members</h2>
            <span className="inline-flex items-center gap-1.5 text-[var(--fs-xs)] font-semibold text-emerald-100">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,255,178,0.72)]" />
              {onlineCount} online
            </span>
          </div>
          <div className="suzi-thin-scroll mt-3 flex-1 space-y-4 overflow-y-auto pr-1">
            <div>
              <p className="mb-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
                Room Hosts
              </p>
              <div className="space-y-3">
                {room ? (
                  <PersonRow
                    key={room?.owner.id ?? "owner"}
                    person={{
                      id: room?.owner.id ?? "owner",
                      name: room?.owner.displayName?.trim() || room?.owner.username || "Owner",
                      handle: `@${room?.owner.username ?? "owner"}`,
                      avatar: resolveUserAvatarUrl(room?.owner.avatarUrl),
                    }}
                    compact
                    action={
                      room?.owner.id && room.owner.id !== meId ? (
                        <Link
                          href={`/app/messages?with=${encodeURIComponent(room.owner.id)}`}
                          className="suzi-secondary-btn px-3 py-2 text-xs"
                        >
                          DM
                        </Link>
                      ) : undefined
                    }
                  />
                ) : null}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
                Room Members
              </p>
              <div className="space-y-3">
                {(room?.owner.id === meId ? management?.members.map((row) => row.user) ?? [] : participantRows).map((person) => (
                  <PersonRow
                    key={person.id}
                    person={{
                      id: person.id,
                      name: person.displayName?.trim() || person.username,
                      handle: `@${person.username}`,
                      avatar: resolveUserAvatarUrl(person.avatarUrl),
                    }}
                    compact
                    action={
                      person.id !== meId ? (
                        <div className="flex gap-1">
                          <Link
                            href={`/app/messages?with=${encodeURIComponent(person.id)}`}
                            className="suzi-secondary-btn px-3 py-2 text-xs"
                          >
                            DM
                          </Link>
                          {room?.owner.id === meId ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleOwnerAction("remove", person.id)}
                                disabled={actionBusyId === `remove-${person.id}`}
                                className="suzi-secondary-btn px-2 py-2 text-[11px]"
                              >
                                Remove
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleOwnerAction("ban", person.id)}
                                disabled={actionBusyId === `ban-${person.id}`}
                                className="suzi-secondary-btn px-2 py-2 text-[11px]"
                              >
                                Ban
                              </button>
                            </>
                          ) : null}
                        </div>
                      ) : undefined
                    }
                  />
                ))}
              </div>
            </div>

            {room?.owner.id === meId ? (
              <>
                <div>
                  <p className="mb-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
                    Pending Requests
                  </p>
                  <div className="space-y-3">
                    {management?.pendingRequests.length ? management.pendingRequests.map((row) => (
                      <PersonRow
                        key={`req-${row.userId}`}
                        person={{
                          id: row.user.id,
                          name: row.user.displayName?.trim() || row.user.username,
                          handle: `@${row.user.username}`,
                          avatar: resolveUserAvatarUrl(row.user.avatarUrl),
                        }}
                        compact
                        action={
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => void handleOwnerAction("approve", row.userId)}
                              disabled={actionBusyId === `approve-${row.userId}`}
                              className="suzi-primary-btn px-2 py-2 text-[11px]"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleOwnerAction("reject", row.userId)}
                              disabled={actionBusyId === `reject-${row.userId}`}
                              className="suzi-secondary-btn px-2 py-2 text-[11px]"
                            >
                              Reject
                            </button>
                          </div>
                        }
                      />
                    )) : (
                      <p className="text-xs text-cyan-100/64">No pending requests.</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
                    Banned Users
                  </p>
                  <div className="space-y-3">
                    {management?.bannedUsers.length ? management.bannedUsers.map((row) => (
                      <PersonRow
                        key={`ban-${row.userId}`}
                        person={{
                          id: row.user.id,
                          name: row.user.displayName?.trim() || row.user.username,
                          handle: `@${row.user.username}`,
                          avatar: resolveUserAvatarUrl(row.user.avatarUrl),
                        }}
                        compact
                        action={
                          <button
                            type="button"
                            onClick={() => void handleOwnerAction("unban", row.userId)}
                            disabled={actionBusyId === `unban-${row.userId}`}
                            className="suzi-secondary-btn px-2 py-2 text-[11px]"
                          >
                            Unban
                          </button>
                        }
                      />
                    )) : (
                      <p className="text-xs text-cyan-100/64">No banned users.</p>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </Panel>

        <Panel className="shrink-0 p-[var(--panel-pad)]">
          <h2 className="text-[var(--fs-lg)] font-semibold tracking-tight text-white">Options</h2>
          <div className="mt-3 grid gap-2">
            <button type="button" className="suzi-secondary-btn px-3 py-2 text-[var(--fs-sm)]">
              Invite friends
            </button>
            {access?.isMember && !access?.isOwner ? (
              <button
                type="button"
                onClick={() => void handleLeaveRoom()}
                disabled={actionBusyId === "leave-room"}
                className="suzi-secondary-btn px-3 py-2 text-[var(--fs-sm)]"
              >
                {actionBusyId === "leave-room" ? "Leaving..." : "Leave room"}
              </button>
            ) : null}
            {access?.isOwner ? (
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmName("");
                  setShowDeleteRoomModal(true);
                }}
                className="rounded-[0.75rem] border border-red-400/40 bg-red-500/10 px-3 py-2 text-[var(--fs-sm)] font-semibold text-red-100/95 transition hover:border-red-300/55 hover:bg-red-500/18"
              >
                Delete room…
              </button>
            ) : null}
          </div>
        </Panel>
      </div>
      </div>

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
                <input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="suzi-input" />
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

      {showDeleteRoomModal && room ? (
        <div className="fixed inset-0 z-[275] flex items-center justify-center bg-[rgba(6,10,28,0.72)] p-4">
          <div className="w-full max-w-md rounded-[1.1rem] border border-red-400/30 bg-[linear-gradient(160deg,rgba(50,18,40,0.97),rgba(20,12,48,0.95))] p-4 shadow-[0_20px_60px_rgba(7,11,30,0.62)] sm:p-5">
            <h3 className="text-xl font-semibold text-white">Delete this room?</h3>
            <p className="mt-2 text-sm text-cyan-100/80">
              This permanently removes the room, all messages, members, and join requests. This cannot be undone.
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100/64">
              Type the room name to confirm
            </p>
            <input
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={room.name}
              className="suzi-input mt-1.5 w-full"
              autoComplete="off"
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteRoomModal(false);
                  setDeleteConfirmName("");
                }}
                className="suzi-secondary-btn px-3 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  actionBusyId === "delete-room" || deleteConfirmName.trim() !== room.name.trim()
                }
                onClick={() => void handleDeleteRoomConfirm()}
                className="rounded-full border border-red-400/50 bg-red-600/85 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionBusyId === "delete-room" ? "Deleting…" : "Delete room permanently"}
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
                  {management?.members.map((row) => (
                    <div key={row.userId} className="rounded border border-cyan-300/20 p-2 text-xs text-cyan-50">
                      <p>{row.user.displayName?.trim() || row.user.username}</p>
                      <div className="mt-1 flex gap-1">
                        <button type="button" onClick={() => void handleOwnerAction("remove", row.userId)} className="suzi-secondary-btn px-2 py-1 text-[11px]">
                          Remove
                        </button>
                        <button type="button" onClick={() => void handleOwnerAction("ban", row.userId)} className="suzi-secondary-btn px-2 py-1 text-[11px]">
                          Ban
                        </button>
                      </div>
                    </div>
                  ))}
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
