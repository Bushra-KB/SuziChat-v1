"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatComposer } from "@/components/app/chat-composer";
import { ChatMessageRow, type LiveChatMessage } from "@/components/app/chat-message-row";
import { PersonRow, ThreadRow } from "@/components/app/v1-blocks";
import { Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import {
  getConversationPeer,
  listConversationThreads,
  listDirectMessages,
  sendDirectMessage,
  type ConversationThread,
  type DirectMessageRow,
} from "@/lib/conversations-client";
import { getRealtimeSocket } from "@/lib/realtime-client";
import type { Person } from "@/lib/v1-mock-data";

const defaultAvatar = "/ppic/ppic1.jpeg";

function peerToPerson(peer: ConversationThread["peer"]): Person {
  return {
    id: peer.id,
    name: peer.displayName?.trim() || peer.username,
    handle: `@${peer.username}`,
    avatar: defaultAvatar,
    location: peer.country ?? undefined,
  };
}

function shortTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function MessagesInbox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const withParam = searchParams.get("with");

  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<DirectMessageRow[]>([]);
  const [draftPeer, setDraftPeer] = useState<ConversationThread["peer"] | null>(null);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [typingName, setTypingName] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const typingHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingAtRef = useRef(0);
  const lastTypingValueRef = useRef(false);

  const loadThreads = useCallback(async () => {
    const s = getStoredAuthSession();
    if (!s) {
      setError("Not signed in.");
      return;
    }
    setError("");
    const data = await listConversationThreads(s.accessToken);
    setThreads(data);
  }, []);

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
    const onConnect = () => setSocketReady(true);
    const onDisconnect = () => setSocketReady(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (socket.connected) {
      setSocketReady(true);
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadThreads()
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load inbox.");
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
  }, [loadThreads]);

  const selectedPeerId = useMemo(() => {
    if (withParam) {
      return withParam;
    }
    return threads[0]?.peer.id ?? null;
  }, [withParam, threads]);

  useEffect(() => {
    if (!threads.length || !selectedPeerId || withParam) {
      return;
    }
    router.replace(`/app/messages?with=${encodeURIComponent(selectedPeerId)}`, { scroll: false });
  }, [threads, selectedPeerId, withParam, router]);

  useEffect(() => {
    const s = getStoredAuthSession();
    if (!s || !selectedPeerId) {
      setDraftPeer(null);
      return;
    }
    if (threads.some((t) => t.peer.id === selectedPeerId)) {
      setDraftPeer(null);
      return;
    }
    let cancelled = false;
    void getConversationPeer(s.accessToken, selectedPeerId)
      .then((peer) => {
        if (!cancelled) {
          setDraftPeer(peer);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDraftPeer(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPeerId, threads]);

  useEffect(() => {
    const s = getStoredAuthSession();
    if (!s || !selectedPeerId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setMsgLoading(true);
    void listDirectMessages(s.accessToken, selectedPeerId)
      .then((rows) => {
        if (!cancelled) {
          setMessages(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessages([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMsgLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPeerId]);

  useEffect(() => {
    const s = getStoredAuthSession();
    if (!s) {
      return;
    }
    const socket = getRealtimeSocket(s.accessToken);
    const joinSelectedPeer = () => {
      if (selectedPeerId) {
        socket.emit("dm:join", { peerId: selectedPeerId });
      }
    };

    joinSelectedPeer();
    socket.on("connect", joinSelectedPeer);

    const onDmMessage = (row: DirectMessageRow) => {
      setMessages((prev) => {
        const relevant =
          row.sender.id === selectedPeerId || row.recipient.id === selectedPeerId;
        if (!relevant) {
          return prev;
        }
        if (prev.some((m) => m.id === row.id)) {
          return prev;
        }
        return [...prev, row];
      });
      void loadThreads();
    };
    const onDmTyping = (payload: { userId?: string; peerId?: string; typing?: boolean }) => {
      if (!payload?.userId || payload.userId !== selectedPeerId) {
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
      const threadPeer = threads.find((t) => t.peer.id === selectedPeerId)?.peer;
      const personName =
        threadPeer?.displayName?.trim() ||
        threadPeer?.username ||
        draftPeer?.displayName?.trim() ||
        draftPeer?.username ||
        "Someone";
      setTypingName(personName);
      if (typingHideTimerRef.current) {
        clearTimeout(typingHideTimerRef.current);
      }
      typingHideTimerRef.current = setTimeout(() => {
        setTypingName(null);
      }, 2000);
    };

    socket.on("dm:message", onDmMessage);
    socket.on("dm:typing", onDmTyping);
    return () => {
      socket.off("connect", joinSelectedPeer);
      socket.off("dm:message", onDmMessage);
      socket.off("dm:typing", onDmTyping);
    };
  }, [draftPeer, loadThreads, selectedPeerId, threads]);

  useEffect(() => {
    setTypingName(null);
    if (typingHideTimerRef.current) {
      clearTimeout(typingHideTimerRef.current);
      typingHideTimerRef.current = null;
    }
  }, [selectedPeerId]);

  useEffect(() => {
    const root = messagesScrollRef.current;
    if (!root) {
      return;
    }
    root.scrollTop = root.scrollHeight;
  }, [messages, msgLoading]);

  useEffect(() => {
    return () => {
      if (typingHideTimerRef.current) {
        clearTimeout(typingHideTimerRef.current);
      }
    };
  }, []);

  const activeThread = useMemo(() => {
    const found = threads.find((t) => t.peer.id === selectedPeerId);
    if (found) {
      return found;
    }
    if (!selectedPeerId || !draftPeer) {
      return null;
    }
    return {
      peer: draftPeer,
      lastMessage: {
        id: "draft",
        body: "No messages yet",
        createdAt: new Date().toISOString(),
        senderId: draftPeer.id,
      },
    };
  }, [threads, selectedPeerId, draftPeer]);

  const visibleThreads = useMemo(() => {
    if (!draftPeer || !selectedPeerId || threads.some((t) => t.peer.id === selectedPeerId)) {
      return threads;
    }
    return [
      ...threads,
      {
        peer: draftPeer,
        lastMessage: {
          id: "draft",
          body: "New conversation",
          createdAt: new Date().toISOString(),
          senderId: draftPeer.id,
        },
      },
    ];
  }, [draftPeer, selectedPeerId, threads]);

  async function handleSend(text: string) {
    const s = getStoredAuthSession();
    if (!s || !selectedPeerId) {
      return;
    }
    setSending(true);
    const optimisticId = `optimistic-dm-${Date.now()}`;
    const optimistic: DirectMessageRow = {
      id: optimisticId,
      body: text,
      createdAt: new Date().toISOString(),
      sender: {
        id: s.user.id,
        username: s.user.username,
        displayName: s.user.displayName,
        country: null,
      },
      recipient: { id: selectedPeerId },
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const socket = getRealtimeSocket(s.accessToken);
      socket.emit("dm:typing", { peerId: selectedPeerId, typing: false });
      const row = await new Promise<DirectMessageRow>((resolve, reject) => {
        if (!socket.connected) {
          void sendDirectMessage(s.accessToken, selectedPeerId, text)
            .then(resolve)
            .catch(reject);
          return;
        }

        socket.emit(
          "dm:send",
          { peerId: selectedPeerId, body: text },
          (ack: { ok?: boolean; message?: DirectMessageRow; error?: string }) => {
            if (ack?.ok && ack.message) {
              resolve(ack.message);
              return;
            }
            reject(new Error(ack?.error || "Send failed."));
          },
        );
      });
      setMessages((prev) => {
        const withoutServerDuplicate = prev.filter((m) => m.id !== row.id);
        return withoutServerDuplicate.map((m) => (m.id === optimisticId ? row : m));
      });
      await loadThreads();
    } catch (e: unknown) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setError(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_300px]">
      <Panel className="flex h-[75vh] min-h-[32rem] max-h-[75vh] flex-col p-5">
        <SectionHeader eyebrow="Inbox" title="Direct messages" />
        <div className="mt-5">
          <input className="suzi-input" placeholder="Search conversations" readOnly disabled />
        </div>
        <p className="mt-3 text-xs text-cyan-100/70">
          {socketReady ? "Realtime connected" : "Realtime reconnecting..."}
        </p>
        {error ? <p className="mt-3 text-sm text-amber-100">{error}</p> : null}
        <div className="suzi-scrollbar mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading conversations…</p>
          ) : visibleThreads.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              No conversations yet — message someone from Friends.
            </p>
          ) : (
            visibleThreads.map((thread) => (
              <ThreadRow
                key={thread.peer.id}
                person={peerToPerson(thread.peer)}
                preview={thread.lastMessage.body}
                time={shortTime(thread.lastMessage.createdAt)}
                unread={0}
                href={`/app/messages?with=${encodeURIComponent(thread.peer.id)}`}
                active={thread.peer.id === selectedPeerId}
              />
            ))
          )}
        </div>
      </Panel>

      <Panel className="flex h-[75vh] min-h-[32rem] max-h-[75vh] flex-col overflow-hidden p-0">
        <div className="border-b border-white/8 px-6 py-5">
          <SectionHeader
            eyebrow="Conversation"
            title={
              activeThread
                ? activeThread.peer.displayName ?? activeThread.peer.username
                : "Select a thread"
            }
            copy={activeThread?.peer.country ?? ""}
          />
        </div>
        <div
          ref={messagesScrollRef}
          className="suzi-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto bg-white px-6 py-6"
        >
          {msgLoading ? (
            <p className="text-sm text-slate-500">Loading messages…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-slate-500">No messages yet. Start the conversation.</p>
          ) : (
            messages.map((m) => {
              const mine = meId !== null && m.sender.id === meId;
              const live: LiveChatMessage = {
                body: m.body,
                timeLabel: shortTime(m.createdAt),
                isMine: mine,
                senderUsername: m.sender.username,
                senderDisplayName: m.sender.displayName ?? m.sender.username,
                senderAvatarUrl: null,
              };
              return <ChatMessageRow key={m.id} variant="live" message={live} />;
            })
          )}
        </div>
        <div className="border-t border-white/8 px-6 py-5">
          {typingName ? (
            <p className="mb-2 text-xs font-medium text-cyan-100/85">{typingName} is typing...</p>
          ) : null}
          <ChatComposer
            attachInputId="dm-chat-attachment"
            placeholder="Write a direct message…"
            variant="onDark"
            disabled={!hasSession || !selectedPeerId || sending}
            onTyping={(text) => {
              const s = getStoredAuthSession();
              if (!s || !selectedPeerId) {
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
              getRealtimeSocket(s.accessToken).emit("dm:typing", {
                peerId: selectedPeerId,
                typing: nextTyping,
              });
            }}
            onSend={handleSend}
          />
        </div>
      </Panel>

      <Panel className="flex h-[75vh] min-h-[32rem] max-h-[75vh] flex-col p-5">
        <SectionHeader eyebrow="Friends" title="Quick invite" />
        <div className="mt-5">
          <input className="suzi-input" placeholder="Search friends" readOnly disabled />
        </div>
        <div className="suzi-scrollbar mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {threads.slice(0, 8).map((thread) => (
            <PersonRow
              key={thread.peer.id}
              person={peerToPerson(thread.peer)}
              compact
              action={
                <button
                  type="button"
                  className="suzi-secondary-btn px-3 py-2 text-xs"
                  onClick={() =>
                    router.push(`/app/messages?with=${encodeURIComponent(thread.peer.id)}`)
                  }
                >
                  Open
                </button>
              }
            />
          ))}
          {threads.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Start from <a className="text-cyan-200 underline" href="/app/friends">Friends</a> after you connect with
              someone.
            </p>
          ) : null}
        </div>
      </Panel>
    </section>
  );
}
