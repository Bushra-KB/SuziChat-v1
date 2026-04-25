"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatComposer } from "@/components/app/chat-composer";
import { ChatMessageRow, type LiveChatMessage } from "@/components/app/chat-message-row";
import { PersonRow } from "@/components/app/v1-blocks";
import { Panel, cx } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import {
  getRoom,
  listRoomMessages,
  postRoomMessage,
  type ApiRoom,
  type ApiRoomMessage,
} from "@/lib/rooms-client";
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
  const [room, setRoom] = useState<ApiRoom | null>(null);
  const [messages, setMessages] = useState<ApiRoomMessage[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [typingName, setTypingName] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const typingHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingAtRef = useRef(0);
  const lastTypingValueRef = useRef(false);

  const refresh = useCallback(async () => {
    setError("");
    const [roomRes, msgRes] = await Promise.all([
      getRoom(roomSlug),
      listRoomMessages(roomSlug),
    ]);
    setRoom(roomRes);
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

  const participantRows = useMemo(() => {
    const map = new Map<string, ApiRoomMessage["sender"]>();
    for (const message of messages) {
      map.set(message.sender.id, message.sender);
    }
    return [...map.values()];
  }, [messages]);
  const onlineCount = participantRows.length;

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

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Panel className="flex h-[75vh] min-h-[32rem] max-h-[75vh] flex-col overflow-hidden border border-cyan-300/24 bg-[linear-gradient(180deg,rgba(36,45,116,0.52),rgba(40,16,117,0.52))] p-0 shadow-[0_14px_38px_rgba(15,23,42,0.2)]">
        <div className="border-b border-cyan-300/20 bg-[linear-gradient(155deg,rgba(30,19,88,0.84),rgba(17,12,60,0.78))] px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-cyan-100/64">
                Room Chat
              </p>
              <p className="mt-1 text-xs text-cyan-100/64">
                {socketReady ? "Realtime connected" : "Realtime reconnecting..."}
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-white">
                {loading ? "…" : room?.name ?? roomSlug}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-cyan-100/82">
                {room?.description ?? ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-md border border-cyan-300/35 bg-cyan-400/15 px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                {room?.category ?? "—"}
              </span>
              <span
                className={cx(
                  "inline-flex rounded-md border px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.12em]",
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
                <Link href={`/app/rooms/${roomSlug}/edit`} className="suzi-secondary-btn px-4 py-1.5 text-sm">
                  Edit
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        {error ? (
          <div className="border-b border-red-300/30 bg-red-500/15 px-5 py-3 text-sm text-red-100">{error}</div>
        ) : null}

        <div
          ref={messagesScrollRef}
          className="suzi-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto bg-white px-5 py-5 sm:px-6"
        >
          {messages.map((m) => {
            const mine = meId !== null && m.sender.id === meId;
            const live: LiveChatMessage = {
              body: m.body,
              timeLabel: formatShortTime(m.createdAt),
              isMine: mine,
              senderUsername: m.sender.username,
              senderDisplayName: m.sender.displayName ?? m.sender.username,
              senderAvatarUrl: null,
            };
            return <ChatMessageRow key={m.id} variant="live" message={live} />;
          })}
        </div>

        <div className="border-t border-cyan-300/20 bg-[linear-gradient(155deg,rgba(30,19,88,0.84),rgba(17,12,60,0.78))] px-5 py-4 sm:px-6">
          {typingName ? (
            <p className="mb-2 text-xs font-medium text-cyan-100/85">{typingName} is typing...</p>
          ) : null}
          <ChatComposer
            attachInputId={`room-chat-attachment-${roomSlug}`}
            placeholder="Write your message, invite a friend, or call out a game table"
            variant="onDark"
            disabled={!hasSession || sending}
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

      <div className="flex h-[75vh] min-h-[32rem] max-h-[75vh] flex-col gap-6">
        <Panel className="flex min-h-0 flex-1 flex-col p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[1.35rem] font-semibold tracking-tight text-white">Room Members</h2>
            <span className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-emerald-100">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,255,178,0.72)]" />
              {onlineCount} online
            </span>
          </div>
          <div className="suzi-scrollbar mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
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
                      avatar: "/ppic/ppic1.jpeg",
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
                {participantRows.map((person) => (
                  <PersonRow
                    key={person.id}
                    person={{
                      id: person.id,
                      name: person.displayName?.trim() || person.username,
                      handle: `@${person.username}`,
                      avatar: "/ppic/ppic1.jpeg",
                    }}
                    compact
                    action={
                      person.id !== meId ? (
                        <Link
                          href={`/app/messages?with=${encodeURIComponent(person.id)}`}
                          className="suzi-secondary-btn px-3 py-2 text-xs"
                        >
                          DM
                        </Link>
                      ) : undefined
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-[1.35rem] font-semibold tracking-tight text-white">Options</h2>
          <div className="mt-4 grid gap-3">
            <button type="button" className="suzi-secondary-btn px-4 py-3 text-sm">
              Invite friends
            </button>
            <Link href="/app/rooms" className="suzi-secondary-btn px-4 py-3 text-center text-sm">
              Back to rooms
            </Link>
          </div>
        </Panel>
      </div>
    </section>
  );
}
