"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatComposer } from "@/components/app/chat-composer";
import { ChatMessageRow, type LiveChatMessage } from "@/components/app/chat-message-row";
import { useCall } from "@/components/app/calls/call-provider";
import { PersonRow, ThreadRow } from "@/components/app/v1-blocks";
import { Icon, Panel, cx } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import {
  deleteDirectMessage,
  getConversationPeer,
  listConversationThreads,
  listDirectMessages,
  removeConversation,
  sendDirectMessage,
  updateDirectMessage,
  type ConversationThread,
  type DirectMessageRow,
} from "@/lib/conversations-client";
import { resolveUserAvatarUrl } from "@/lib/avatar-url";
import {
  attachmentPreviewLabel,
  toAttachmentPayload,
  type ChatAttachment,
} from "@/lib/chat-attachments";
import { getRealtimeSocket } from "@/lib/realtime-client";
import { subscribeUserProfileUpdates } from "@/lib/realtime-feed";
import { useIsMobile } from "@/lib/use-is-mobile";
import type { Person } from "@/lib/v1-mock-data";

function peerToPerson(peer: ConversationThread["peer"]): Person {
  return {
    id: peer.id,
    name: peer.displayName?.trim() || peer.username,
    handle: `@${peer.username}`,
    avatar: resolveUserAvatarUrl(peer.avatarUrl),
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

type Presence = "online" | "away" | "offline";

function presenceLabel(status: Presence) {
  if (status === "online") {
    return "Online";
  }
  if (status === "away") {
    return "Away";
  }
  return "Offline";
}

function presenceSubtitleClass(status: Presence) {
  if (status === "online") {
    return "text-emerald-300/85";
  }
  if (status === "away") {
    return "text-amber-300/85";
  }
  return "text-cyan-100/55";
}

function presenceDotClass(status: Presence) {
  if (status === "online") {
    return "bg-emerald-400 shadow-[0_0_8px_rgba(110,255,178,0.7)]";
  }
  if (status === "away") {
    return "bg-amber-300 shadow-[0_0_8px_rgba(255,204,110,0.55)]";
  }
  return "bg-slate-500";
}

export function MessagesInbox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const withParam = searchParams.get("with");
  const { isMobile } = useIsMobile();

  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [threadQuery, setThreadQuery] = useState("");
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
  const [accessToken, setAccessToken] = useState("");
  const { startCall } = useCall();
  const [presenceById, setPresenceById] = useState<Record<string, Presence>>({});
  const [confirmRemovePeer, setConfirmRemovePeer] = useState<ConversationThread["peer"] | null>(null);
  const [confirmDeleteMessage, setConfirmDeleteMessage] = useState<DirectMessageRow | null>(null);
  const [removingPeerId, setRemovingPeerId] = useState<string | null>(null);
  const [messageActionId, setMessageActionId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
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
    setAccessToken(s?.accessToken ?? "");
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
    // On mobile, /app/messages always lands on the conversation list first.
    // The user picks a thread to open it (CSS-driven via ?with=). Desktop
    // keeps the side-by-side experience and auto-selects the first thread.
    if (isMobile) {
      return null;
    }
    return threads[0]?.peer.id ?? null;
  }, [withParam, threads, isMobile]);

  useEffect(() => {
    // Don't auto-rewrite the URL on mobile — that would re-open a thread
    // every time the user navigates back to /app/messages.
    if (isMobile) {
      return;
    }
    if (!threads.length || !selectedPeerId || withParam) {
      return;
    }
    router.replace(`/app/messages?with=${encodeURIComponent(selectedPeerId)}`, { scroll: false });
  }, [threads, selectedPeerId, withParam, router, isMobile]);

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
    const onDmMessageUpdated = (row: DirectMessageRow) => {
      setMessages((prev) => {
        const relevant =
          row.sender.id === selectedPeerId || row.recipient.id === selectedPeerId;
        if (!relevant) {
          return prev;
        }
        return prev.map((message) => (message.id === row.id ? row : message));
      });
      void loadThreads();
    };
    const onDmMessageDeleted = (payload: { messageId?: string; senderId?: string; recipientId?: string }) => {
      if (!payload?.messageId) {
        return;
      }
      setMessages((prev) => prev.filter((message) => message.id !== payload.messageId));
      void loadThreads();
    };
    const onDmConversationRemoved = (payload: { peerId?: string }) => {
      if (!payload?.peerId) {
        return;
      }
      setThreads((prev) => prev.filter((thread) => thread.peer.id !== payload.peerId));
      if (payload.peerId === selectedPeerId) {
        setMessages([]);
      }
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
    socket.on("dm:message:updated", onDmMessageUpdated);
    socket.on("dm:message:deleted", onDmMessageDeleted);
    socket.on("dm:conversation:removed", onDmConversationRemoved);
    socket.on("dm:typing", onDmTyping);
    const unsubProfile = subscribeUserProfileUpdates(s.accessToken, (payload) => {
      const user = payload.user;
      if (!user?.id) {
        return;
      }
      const updatedUser = user;
      function patchPeer<
        T extends {
          id: string;
          username: string;
          displayName: string | null;
          avatarUrl?: string | null;
          country?: string | null;
        },
      >(peer: T): T {
        if (peer.id !== updatedUser.id) {
          return peer;
        }
        return {
          ...peer,
          username: updatedUser.username,
          displayName: updatedUser.displayName ?? null,
          avatarUrl: updatedUser.avatarUrl,
          country: updatedUser.country ?? peer.country ?? null,
        };
      }
      setThreads((prev) =>
        prev.map((thread) => ({
          ...thread,
          peer: patchPeer(thread.peer),
        })),
      );
      setDraftPeer((prev) => (prev ? patchPeer(prev) : prev));
      setMessages((prev) =>
        prev.map((message) => ({
          ...message,
          sender: patchPeer(message.sender),
        })),
      );
    });
    return () => {
      socket.off("connect", joinSelectedPeer);
      socket.off("dm:message", onDmMessage);
      socket.off("dm:message:updated", onDmMessageUpdated);
      socket.off("dm:message:deleted", onDmMessageDeleted);
      socket.off("dm:conversation:removed", onDmConversationRemoved);
      socket.off("dm:typing", onDmTyping);
      unsubProfile();
    };
  }, [draftPeer, loadThreads, selectedPeerId, threads]);

  useEffect(() => {
    setTypingName(null);
    setEditingMessageId(null);
    setEditingBody("");
    setConfirmDeleteMessage(null);
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

  const presenceWatchIds = useMemo(() => {
    const ids = new Set<string>();
    for (const thread of threads) {
      ids.add(thread.peer.id);
    }
    if (draftPeer) {
      ids.add(draftPeer.id);
    }
    if (selectedPeerId) {
      ids.add(selectedPeerId);
    }
    return [...ids];
  }, [draftPeer, selectedPeerId, threads]);

  useEffect(() => {
    const s = getStoredAuthSession();
    if (!s) {
      return;
    }
    const socket = getRealtimeSocket(s.accessToken);
    const onPresenceUpdate = (payload: {
      userId?: string;
      status?: Presence;
      online?: boolean;
    }) => {
      if (!payload?.userId) {
        return;
      }
      const nextStatus: Presence =
        payload.status ?? (payload.online ? "online" : "offline");
      setPresenceById((prev) => ({ ...prev, [payload.userId as string]: nextStatus }));
    };
    socket.on("presence:update", onPresenceUpdate);
    return () => {
      socket.off("presence:update", onPresenceUpdate);
    };
  }, []);

  useEffect(() => {
    const s = getStoredAuthSession();
    if (!s || presenceWatchIds.length === 0) {
      return;
    }
    const socket = getRealtimeSocket(s.accessToken);
    socket.emit(
      "presence:watch",
      { userIds: presenceWatchIds },
      (ack?: { ok?: boolean; statuses?: Record<string, Presence> }) => {
        if (!ack?.ok || !ack.statuses) {
          return;
        }
        setPresenceById((prev) => ({ ...prev, ...ack.statuses }));
      },
    );
  }, [presenceWatchIds]);

  const peerPresence: Presence = selectedPeerId
    ? (presenceById[selectedPeerId] ?? "offline")
    : "offline";

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
    const rows =
      !draftPeer || !selectedPeerId || threads.some((t) => t.peer.id === selectedPeerId)
        ? threads
        : [
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
    const normalizedSearch = threadQuery.trim().toLowerCase();
    if (!normalizedSearch) {
      return rows;
    }
    return rows.filter((thread) => {
      const peerName = thread.peer.displayName?.trim() || thread.peer.username;
      return `${peerName} ${thread.peer.username} ${thread.lastMessage.body}`
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [draftPeer, selectedPeerId, threads, threadQuery]);

  async function handleSend(text: string, attachments: ChatAttachment[] = []) {
    const s = getStoredAuthSession();
    if (!s || !selectedPeerId) {
      return;
    }
    if (!text.trim() && attachments.length === 0) {
      return;
    }
    setSending(true);
    const optimisticId = `optimistic-dm-${Date.now()}`;
    const optimistic: DirectMessageRow = {
      id: optimisticId,
      kind: attachments.some((a) => a.kind === "VOICE")
        ? "VOICE"
        : attachments.length > 0
          ? "FILE"
          : "TEXT",
      body: text,
      createdAt: new Date().toISOString(),
      attachments,
      sender: {
        id: s.user.id,
        username: s.user.username,
        displayName: s.user.displayName,
        country: null,
        avatarUrl: s.user.avatarUrl,
      },
      recipient: { id: selectedPeerId },
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const socket = getRealtimeSocket(s.accessToken);
      socket.emit("dm:typing", { peerId: selectedPeerId, typing: false });
      const payloadAttachments = attachments.map(toAttachmentPayload);
      const row = await new Promise<DirectMessageRow>((resolve, reject) => {
        if (!socket.connected) {
          void sendDirectMessage(s.accessToken, selectedPeerId, text, attachments)
            .then(resolve)
            .catch(reject);
          return;
        }

        socket.emit(
          "dm:send",
          { peerId: selectedPeerId, body: text, attachments: payloadAttachments },
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

  function beginEditMessage(message: DirectMessageRow) {
    setConfirmDeleteMessage(null);
    setEditingMessageId(message.id);
    setEditingBody(message.body);
  }

  async function handleUpdateMessage(message: DirectMessageRow) {
    const s = getStoredAuthSession();
    const nextBody = editingBody.trim();
    if (!s || !nextBody || nextBody === message.body) {
      setEditingMessageId(null);
      setEditingBody("");
      return;
    }
    setMessageActionId(message.id);
    setError("");
    try {
      const updated = await updateDirectMessage(s.accessToken, message.id, nextBody);
      setMessages((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setEditingMessageId(null);
      setEditingBody("");
      await loadThreads();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not update message.");
    } finally {
      setMessageActionId(null);
    }
  }

  async function handleDeleteMessage(message: DirectMessageRow) {
    const s = getStoredAuthSession();
    if (!s) {
      setError("Not signed in.");
      return;
    }
    setMessageActionId(message.id);
    setError("");
    try {
      await deleteDirectMessage(s.accessToken, message.id);
      setMessages((prev) => prev.filter((row) => row.id !== message.id));
      setConfirmDeleteMessage(null);
      if (editingMessageId === message.id) {
        setEditingMessageId(null);
        setEditingBody("");
      }
      await loadThreads();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not delete message.");
    } finally {
      setMessageActionId(null);
    }
  }

  async function handleRemoveConversation(peerId: string) {
    const s = getStoredAuthSession();
    if (!s) {
      setError("Not signed in.");
      return;
    }
    setRemovingPeerId(peerId);
    setError("");
    try {
      await removeConversation(s.accessToken, peerId);
      setThreads((prev) => prev.filter((thread) => thread.peer.id !== peerId));
      setDraftPeer((prev) => (prev?.id === peerId ? null : prev));
      setConfirmRemovePeer(null);
      if (selectedPeerId === peerId) {
        setMessages([]);
        router.replace("/app/messages", { scroll: false });
      }
      await loadThreads();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not remove conversation.");
    } finally {
      setRemovingPeerId(null);
    }
  }

  const authSnap = getStoredAuthSession();
  const myAvatarUrl = authSnap?.user.avatarUrl?.trim() || null;

  return (
    <section
      className={`suzi-app-frame-fill suzi-messages-page ${selectedPeerId ? "suzi-msg-with-active" : "suzi-msg-without-active"}`}
    >
      <div className="suzi-messages-grid">
        {/* INBOX — left rail */}
        <Panel className="suzi-panel--home suzi-msg-inbox flex h-full min-h-0 flex-col overflow-hidden p-[var(--panel-pad)]">
          <div className="suzi-home-panel-header shrink-0">
            <p className="text-[var(--fs-2xs)] font-semibold uppercase tracking-[0.22em] text-cyan-100/65">Inbox</p>
            <h2 className="mt-1 text-[var(--fs-xl)] font-bold tracking-tight text-white">Direct messages</h2>
          </div>
          <div className="mt-3 shrink-0">
            <input
              className="suzi-input text-[var(--fs-sm)]"
              placeholder="Search conversations"
              value={threadQuery}
              onChange={(event) => setThreadQuery(event.target.value)}
            />
          </div>
          <p className="mt-2 shrink-0 text-[var(--fs-2xs)] text-cyan-100/60">
            {socketReady ? "Realtime connected" : "Realtime reconnecting…"}
          </p>
          {error ? (
            <p className="mt-2 shrink-0 text-[var(--fs-xs)] text-amber-100">{error}</p>
          ) : null}
          <div className="suzi-game-lobby-scroll suzi-thin-scroll mt-3 flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-1">
            {loading ? (
              <p className="text-[var(--fs-sm)] text-[var(--text-muted)]">Loading conversations…</p>
            ) : visibleThreads.length === 0 ? (
              <p className="text-[var(--fs-sm)] text-[var(--text-muted)]">
                {threadQuery.trim() ? "No conversations found." : "No conversations yet — message someone from Friends."}
              </p>
            ) : (
              visibleThreads.map((thread) => (
                <ThreadRow
                  key={thread.peer.id}
                  person={peerToPerson(thread.peer)}
                  preview={
                    thread.lastMessage.body ||
                    attachmentPreviewLabel(thread.lastMessage.kind ?? "TEXT")
                  }
                  time={shortTime(thread.lastMessage.createdAt)}
                  unread={0}
                  href={`/app/messages?with=${encodeURIComponent(thread.peer.id)}`}
                  active={thread.peer.id === selectedPeerId}
                />
              ))
            )}
          </div>
        </Panel>

        {/* THREAD — center column */}
        <Panel className="suzi-panel--home suzi-msg-thread flex h-full min-h-0 flex-col overflow-hidden p-0">
          <div className="suzi-home-panel-header flex shrink-0 items-center justify-between gap-3 border-b border-white/8 px-[var(--panel-pad)] py-[var(--panel-pad-tight)]">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/app/messages"
                aria-label="Back to inbox"
                className="suzi-m-icon-btn -ml-1 md:hidden"
              >
                <Icon path="M15 18l-6-6 6-6" className="h-4.5 w-4.5" />
              </Link>
              {activeThread ? (
                <>
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10">
                    <Image
                      src={resolveUserAvatarUrl(activeThread.peer.avatarUrl)}
                      alt=""
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[var(--fs-md)] font-semibold text-white">
                      {activeThread.peer.displayName ?? activeThread.peer.username}
                    </p>
                    <p
                      className={cx(
                        "truncate text-[var(--fs-xs)]",
                        typingName ? "text-cyan-100/80" : presenceSubtitleClass(peerPresence),
                      )}
                    >
                      {typingName ? (
                        "Typing…"
                      ) : (
                        <>
                          <span
                            className={cx(
                              "mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle",
                              presenceDotClass(peerPresence),
                            )}
                          />
                          {presenceLabel(peerPresence)}
                        </>
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-[var(--fs-md)] font-semibold text-white">Select a thread</div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                aria-label="Voice call"
                disabled={!activeThread}
                onClick={() =>
                  activeThread &&
                  void startCall({
                    context: "DM",
                    targetKey: activeThread.peer.id,
                    media: "AUDIO",
                    peer: activeThread.peer,
                  })
                }
                className="suzi-game-board-top-btn px-0 inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/80 disabled:opacity-40"
              >
                <Icon path="M5 3h3l2 5-2 1a11 11 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2Z" className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Video call"
                disabled={!activeThread}
                onClick={() =>
                  activeThread &&
                  void startCall({
                    context: "DM",
                    targetKey: activeThread.peer.id,
                    media: "VIDEO",
                    peer: activeThread.peer,
                  })
                }
                className="suzi-game-board-top-btn px-0 inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/80 disabled:opacity-40"
              >
                <Icon path="M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm13 3 5-3v10l-5-3V10Z" className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Delete conversation"
                title="Delete conversation"
                disabled={!activeThread || removingPeerId === activeThread.peer.id}
                onClick={() => {
                  if (activeThread) {
                    setConfirmRemovePeer(activeThread.peer);
                  }
                }}
                className="suzi-game-board-top-btn px-0 inline-flex h-9 w-9 items-center justify-center rounded-xl text-pink-100/85 disabled:opacity-45"
              >
                <Icon path="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div
            ref={messagesScrollRef}
            className="suzi-chat-log suzi-game-lobby-scroll suzi-thin-scroll mx-[var(--panel-pad-tight)] my-[var(--panel-pad-tight)] flex-1 overflow-y-auto rounded-[var(--panel-radius)] bg-white px-[var(--panel-pad)] py-[var(--panel-pad)] shadow-[inset_0_2px_8px_rgba(7,4,28,0.22),inset_0_0_0_1px_rgba(0,0,0,0.04)]"
          >
            {msgLoading ? (
              <p className="text-[var(--fs-sm)] text-[var(--text-muted)]">Loading messages…</p>
            ) : messages.length === 0 ? (
              <p className="text-[var(--fs-sm)] text-[var(--text-muted)]">
                No messages yet. Start the conversation.
              </p>
            ) : (
              messages.map((m) => {
                const mine = meId !== null && m.sender.id === meId;
                const live: LiveChatMessage = {
                  kind: m.kind,
                  body: m.body,
                  timeLabel: shortTime(m.createdAt),
                  isMine: mine,
                  senderId: mine ? undefined : m.sender.id,
                  senderUsername: m.sender.username,
                  senderDisplayName: m.sender.displayName ?? m.sender.username,
                  senderAvatarUrl: mine ? myAvatarUrl : m.sender.avatarUrl?.trim() || null,
                  attachments: m.attachments,
                };
                const canEditMessage = mine && !m.id.startsWith("optimistic-");
                const isEditing = editingMessageId === m.id;
                return (
                  <ChatMessageRow
                    key={m.id}
                    variant="live"
                    message={live}
                    bodyOverride={
                      isEditing ? (
                        <form
                          className="suzi-dm-edit-form"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void handleUpdateMessage(m);
                          }}
                        >
                          <textarea
                            value={editingBody}
                            onChange={(event) => setEditingBody(event.target.value)}
                            className="suzi-dm-edit-textarea"
                            rows={3}
                            autoFocus
                          />
                          <div className="suzi-dm-edit-actions">
                            <button
                              type="button"
                              className="suzi-dm-message-action"
                              disabled={messageActionId === m.id}
                              onClick={() => {
                                setEditingMessageId(null);
                                setEditingBody("");
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="suzi-dm-message-action suzi-dm-message-action--primary"
                              disabled={messageActionId === m.id || !editingBody.trim()}
                            >
                              {messageActionId === m.id ? "Saving..." : "Save"}
                            </button>
                          </div>
                        </form>
                      ) : undefined
                    }
                    actions={
                      canEditMessage && !isEditing ? (
                        <>
                          <button
                            type="button"
                            className="suzi-dm-message-action"
                            onClick={() => beginEditMessage(m)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="suzi-dm-message-action suzi-dm-message-action--danger"
                            disabled={messageActionId === m.id}
                            onClick={() => setConfirmDeleteMessage(m)}
                          >
                            Delete
                          </button>
                        </>
                      ) : undefined
                    }
                  />
                );
              })
            )}
          </div>
          <div className="suzi-room-composer-shell shrink-0 border-t border-cyan-300/20 px-[var(--panel-pad)] py-[var(--panel-pad-tight)]">
            {typingName ? (
              <p className="mb-2 text-[var(--fs-2xs)] font-medium text-cyan-100/85">
                {typingName} is typing...
              </p>
            ) : null}
            <ChatComposer
              attachInputId="dm-chat-attachment"
              accessToken={accessToken}
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

        {/* QUICK INVITE — right rail */}
        <Panel className="suzi-panel--home suzi-msg-invite flex h-full min-h-0 flex-col overflow-hidden p-[var(--panel-pad)]">
          <div className="suzi-home-panel-header shrink-0">
            <p className="text-[var(--fs-2xs)] font-semibold uppercase tracking-[0.22em] text-cyan-100/65">Friends</p>
            <h2 className="mt-1 text-[var(--fs-xl)] font-bold tracking-tight text-white">Quick invite</h2>
          </div>
          <div className="mt-3 shrink-0">
            <input className="suzi-input text-[var(--fs-sm)]" placeholder="Search friends" readOnly disabled />
          </div>
          <div className="suzi-game-lobby-scroll suzi-thin-scroll mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
            {threads.slice(0, 12).map((thread) => (
              <PersonRow
                key={thread.peer.id}
                person={peerToPerson(thread.peer)}
                compact
                action={
                  <button
                    type="button"
                    className="suzi-secondary-btn px-3 py-1.5 text-[var(--fs-xs)]"
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
              <p className="text-[var(--fs-sm)] text-[var(--text-muted)]">
                Start from <Link className="text-cyan-200 underline" href="/app/profile">your profile</Link> after you
                connect with someone.
              </p>
            ) : null}
          </div>
        </Panel>
      </div>
      {confirmRemovePeer ? (
        <div
          className="suzi-account-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!removingPeerId) {
              setConfirmRemovePeer(null);
            }
          }}
        >
          <div
            className="suzi-account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-dm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[var(--fs-2xs)] font-semibold uppercase tracking-[0.16em] text-cyan-100/66">
                  Direct Messages
                </p>
                <h3 id="remove-dm-title" className="mt-1 text-[var(--fs-lg)] font-semibold text-white">
                  Delete conversation?
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close"
                disabled={!!removingPeerId}
                onClick={() => setConfirmRemovePeer(null)}
                className="suzi-icon-btn inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/80 disabled:opacity-45"
              >
                <Icon path="M6 6l12 12M18 6 6 18" className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-[var(--fs-sm)] leading-6 text-cyan-100/82">
              This removes the conversation with{" "}
              <span className="font-semibold text-white">
                {confirmRemovePeer.displayName?.trim() || confirmRemovePeer.username}
              </span>{" "}
              for you only. It will not delete it for the other person.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={!!removingPeerId}
                onClick={() => setConfirmRemovePeer(null)}
                className="suzi-secondary-btn px-4 py-2 text-[var(--fs-sm)] disabled:opacity-45"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!removingPeerId}
                onClick={() => void handleRemoveConversation(confirmRemovePeer.id)}
                className="suzi-primary-btn px-4 py-2 text-[var(--fs-sm)] disabled:opacity-45"
              >
                {removingPeerId === confirmRemovePeer.id ? "Deleting..." : "Delete for me"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {confirmDeleteMessage ? (
        <div
          className="suzi-account-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!messageActionId) {
              setConfirmDeleteMessage(null);
            }
          }}
        >
          <div
            className="suzi-account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dm-message-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[var(--fs-2xs)] font-semibold uppercase tracking-[0.16em] text-cyan-100/66">
                  Direct Message
                </p>
                <h3 id="delete-dm-message-title" className="mt-1 text-[var(--fs-lg)] font-semibold text-white">
                  Delete this message?
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close"
                disabled={!!messageActionId}
                onClick={() => setConfirmDeleteMessage(null)}
                className="suzi-game-board-top-btn px-0 inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/80 disabled:opacity-45"
              >
                <Icon path="M6 6l12 12M18 6 6 18" className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-[var(--fs-sm)] leading-6 text-cyan-100/82">
              This permanently deletes the message you sent from this conversation.
            </p>
            <div className="mt-3 rounded-2xl border border-pink-200/18 bg-white/8 px-3 py-2 text-[var(--fs-sm)] leading-5 text-white/88">
              {confirmDeleteMessage.body}
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={!!messageActionId}
                onClick={() => setConfirmDeleteMessage(null)}
                className="suzi-game-board-top-btn disabled:opacity-45"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!messageActionId}
                onClick={() => void handleDeleteMessage(confirmDeleteMessage)}
                className="suzi-game-side-btn suzi-game-side-btn--danger w-auto disabled:opacity-45"
              >
                {messageActionId === confirmDeleteMessage.id ? "Deleting..." : "Delete message"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
