"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { AuthSession } from "@/lib/auth-client";
import {
  listConversationThreads,
  type ConversationThread,
} from "@/lib/conversations-client";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
} from "@/lib/notifications-client";
import { getRealtimeSocket } from "@/lib/realtime-client";
import { resolveUserAvatarUrl } from "@/lib/avatar-url";
import { createMenuItems } from "@/lib/v1-mock-data";
import { Icon, cx } from "@/components/ui/suzi-primitives";

const globeIconPath = "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 3v18M3 12h18";

function formatShortNotifTime(iso: string) {
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

const languages = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
] as const;

function readSeenInboxMessageIds(userId: string) {
  if (typeof window === "undefined") {
    return new Set<string>();
  }
  try {
    const raw = window.localStorage.getItem(`suzi:seen-inbox:${userId}`);
    if (!raw) {
      return new Set<string>();
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set<string>();
  }
}

function writeSeenInboxMessageIds(userId: string, ids: Set<string>) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(`suzi:seen-inbox:${userId}`, JSON.stringify([...ids]));
}

export function AppShell({
  children,
  pathname,
  session,
  onLogout,
}: {
  children: ReactNode;
  pathname: string;
  session: AuthSession;
  onLogout: () => void;
}) {
  const [gameInvites, setGameInvites] = useState<
    Array<{
      lobbyId: string;
      fromUserId: string;
      gameType: string;
      title: string;
      deepLink: string;
      sentAt: string;
    }>
  >([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const createRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const languageRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const [shellThreads, setShellThreads] = useState<ConversationThread[]>([]);
  const [shellNotifications, setShellNotifications] = useState<ApiNotification[]>([]);
  const [seenInboxMessageIds, setSeenInboxMessageIds] = useState<Set<string>>(new Set());
  const [seenInboxHydrated, setSeenInboxHydrated] = useState(false);
  const [liveState, setLiveState] = useState<{
    inboxCount: number;
    unreadNotifications: number;
    incomingFriendRequests: number;
    outgoingFriendRequests: number;
  } | null>(null);
  const inboxBadgeCount = shellThreads.filter((thread) => {
    const isIncoming = thread.lastMessage.senderId === thread.peer.id;
    return isIncoming && !seenInboxMessageIds.has(thread.lastMessage.id);
  }).length;
  const unreadNotifications =
    liveState?.unreadNotifications ?? shellNotifications.filter((n) => !n.read).length;
  const refreshShellNotifications = async () => {
    const list = await listNotifications(session.accessToken);
    setShellNotifications(list);
  };

  async function handleMarkNotificationRead(id: string) {
    setShellNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
    try {
      await markNotificationRead(session.accessToken, id);
    } catch {
      await refreshShellNotifications();
    }
  }

  async function handleMarkAllNotificationsRead() {
    setShellNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    try {
      await markAllNotificationsRead(session.accessToken);
    } catch {
      await refreshShellNotifications();
    }
  }

  const accountName = session.user.displayName ?? session.user.username;
  const accountHandle = `@${session.user.username}`;
  const accountAvatarSrc = resolveUserAvatarUrl(session.user.avatarUrl);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate persisted seen-inbox ids on user change */
    setSeenInboxHydrated(false);
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate persisted seen-inbox ids on user change */
    setSeenInboxMessageIds(readSeenInboxMessageIds(session.user.id));
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate persisted seen-inbox ids on user change */
    setSeenInboxHydrated(true);
  }, [session.user.id]);

  useEffect(() => {
    if (!seenInboxHydrated) {
      return;
    }
    writeSeenInboxMessageIds(session.user.id, seenInboxMessageIds);
  }, [seenInboxHydrated, seenInboxMessageIds, session.user.id]);

  useEffect(() => {
    if (!pathname.startsWith("/app/messages")) {
      return;
    }
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- mark inbox messages seen when entering /app/messages */
    setSeenInboxMessageIds((prev) => {
      const next = new Set(prev);
      for (const thread of shellThreads) {
        const isIncoming = thread.lastMessage.senderId === thread.peer.id;
        if (isIncoming) {
          next.add(thread.lastMessage.id);
        }
      }
      return next;
    });
  }, [pathname, shellThreads]);

  useEffect(() => {
    function clickInside(ref: RefObject<HTMLDivElement | null>, event: PointerEvent): boolean {
      const root = ref.current;
      if (!root) {
        return false;
      }

      const path =
        typeof event.composedPath === "function"
          ? event.composedPath()
          : ([event.target].filter(Boolean) as EventTarget[]);

      return path.some(
        (node) =>
          node instanceof Node && (node === root || root.contains(node)),
      );
    }

    /** Capture phase so we run before controls that stop propagation; pointer covers mouse + touch. */
    function handlePointerDownCapture(event: PointerEvent) {
      if (event.button !== undefined && event.button !== 0) {
        return;
      }

      if (!clickInside(createRef, event)) {
        setIsCreateOpen(false);
      }
      if (!clickInside(messagesRef, event)) {
        setIsMessagesOpen(false);
      }
      if (!clickInside(notificationsRef, event)) {
        setIsNotificationsOpen(false);
      }
      if (!clickInside(languageRef, event)) {
        setIsLanguageOpen(false);
      }
      if (!clickInside(accountRef, event)) {
        setIsAccountOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDownCapture, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDownCapture, true);
    };
  }, []);

  useEffect(() => {
    const token = session.accessToken;
    let cancelled = false;
    void Promise.all([
      listConversationThreads(token).then((threads) => {
        if (!cancelled) {
          setShellThreads(threads);
        }
      }),
      listNotifications(token).then((list) => {
        if (!cancelled) {
          setShellNotifications(list);
        }
      }),
    ]).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session.accessToken]);

  useEffect(() => {
    const socket = getRealtimeSocket(session.accessToken);
    const refreshThreads = () => {
      void listConversationThreads(session.accessToken)
        .then((threads) => setShellThreads(threads))
        .catch(() => {});
    };
    const refreshNotifications = () => {
      void listNotifications(session.accessToken)
        .then((list) => setShellNotifications(list))
        .catch(() => {});
    };
    const onRealtimeState = (payload: {
      inboxCount: number;
      unreadNotifications: number;
      incomingFriendRequests: number;
      outgoingFriendRequests: number;
    }) => {
      setLiveState(payload);
    };
    socket.on("dm:message", refreshThreads);
    socket.on("notifications:update", refreshNotifications);
    socket.on("realtime:state", onRealtimeState);
    socket.on("game:invite", (payload: {
      lobbyId?: string;
      fromUserId?: string;
      gameType?: string;
      title?: string;
      deepLink?: string;
      sentAt?: string;
    }) => {
      if (!payload.lobbyId || !payload.deepLink) {
        return;
      }
      setGameInvites((prev) => {
        const next = [
          {
            lobbyId: payload.lobbyId as string,
            fromUserId: String(payload.fromUserId ?? ""),
            gameType: String(payload.gameType ?? ""),
            title: String(payload.title ?? "Game Invite"),
            deepLink: String(payload.deepLink ?? "/app"),
            sentAt: String(payload.sentAt ?? new Date().toISOString()),
          },
          ...prev.filter((entry) => entry.lobbyId !== payload.lobbyId),
        ];
        return next.slice(0, 4);
      });
    });
    return () => {
      socket.off("dm:message", refreshThreads);
      socket.off("notifications:update", refreshNotifications);
      socket.off("realtime:state", onRealtimeState);
      socket.off("game:invite");
    };
  }, [session.accessToken]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("suzi-app-frame-lock");
    return () => root.classList.remove("suzi-app-frame-lock");
  }, []);

  return (
    <main
      data-suzi-app-frame
      className="suzi-hybrid-bg relative flex h-[100dvh] min-h-0 flex-col overflow-hidden text-white"
    >
      <div className="pointer-events-none absolute inset-0 opacity-12 [background-image:radial-gradient(rgba(255,255,255,0.6)_0.7px,transparent_0.7px)] [background-size:28px_28px]" />
      <div className="pointer-events-none absolute left-[-8%] top-[-6%] h-[34rem] w-[34rem] rounded-full bg-sky-300/14 blur-[150px]" />
      <div className="pointer-events-none absolute right-[-5%] top-[8%] h-[28rem] w-[28rem] rounded-full bg-blue-400/10 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-[-8%] left-[18%] h-[26rem] w-[26rem] rounded-full bg-indigo-500/14 blur-[140px]" />
      <div className="suzi-bottom-stars pointer-events-none" aria-hidden="true">
        <span className="suzi-bottom-star suzi-bottom-star-1" />
        <span className="suzi-bottom-star suzi-bottom-star-2" />
        <span className="suzi-bottom-star suzi-bottom-star-3" />
        <span className="suzi-bottom-star suzi-bottom-star-4" />
        <span className="suzi-bottom-star suzi-bottom-star-5" />
        <span className="suzi-bottom-star suzi-bottom-star-6" />
        <span className="suzi-bottom-star suzi-bottom-star-7" />
        <span className="suzi-bottom-star suzi-bottom-star-8" />
        <span className="suzi-bottom-star suzi-bottom-star-9" />
        <span className="suzi-bottom-star suzi-bottom-star-10" />
      </div>

      <div
        className="relative z-10 mx-auto flex min-h-0 w-full flex-1 flex-col"
        style={{
          maxWidth: "var(--shell-max-w)",
          paddingLeft: "var(--shell-pad-x)",
          paddingRight: "var(--shell-pad-x)",
          paddingTop: "var(--shell-pad-y)",
          paddingBottom: "var(--shell-pad-y)",
          rowGap: "var(--shell-pad-y)",
        }}
      >
        <header
          className="relative z-[220] flex shrink-0 items-center justify-between gap-3"
          style={{ minHeight: "var(--shell-header-h)" }}
        >
        <div className="flex items-center gap-2">
          <Link
            href="/app"
            className="suzi-home-pill"
            aria-label="Home"
          >
            <Icon path="M4 6h16M4 12h16M4 18h16" className="h-4 w-4 opacity-80" />
            <span className="hidden h-4 w-px bg-white/15 sm:inline" aria-hidden />
            <Icon path="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2v-9Z" className="h-4 w-4 text-cyan-100" />
            <span className="text-[var(--fs-sm)] font-semibold tracking-wide">Home</span>
          </Link>
        </div>

        <Link
          href="/app"
          className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          aria-label="SuziChat"
        >
          <span
            className="relative block overflow-hidden"
            style={{
              width: "var(--logo-w)",
              height: "var(--logo-h)",
            }}
          >
            <Image
              src="/logo/logo.png"
              alt="SuziChat"
              width={1536}
              height={1024}
              priority
              className="absolute left-1/2 top-1/2 h-[188%] w-auto max-w-none -translate-x-1/2 -translate-y-[52%] drop-shadow-[0_0_18px_rgba(232,77,255,0.32)]"
            />
          </span>
        </Link>

        <div className="pointer-events-auto flex items-center gap-2 rounded-[1.1rem] border border-white/10 bg-[linear-gradient(140deg,rgba(15,13,43,0.76),rgba(34,18,79,0.56))] px-2 py-1.5 backdrop-blur-md">
          <div ref={createRef} className="relative">
            <button
              type="button"
              aria-label="Create"
              onClick={() => {
                setIsCreateOpen((v) => !v);
                setIsMessagesOpen(false);
                setIsNotificationsOpen(false);
                setIsLanguageOpen(false);
                setIsAccountOpen(false);
              }}
              className={cx(
                "suzi-icon-btn relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/80",
                isCreateOpen && "border-fuchsia-300/30 bg-fuchsia-400/12 text-white",
              )}
            >
              <Icon path="M12 5v14M5 12h14" className="h-4 w-4" />
            </button>

            {isCreateOpen ? (
              <div className="suzi-overlay-panel absolute right-0 top-[calc(100%+0.6rem)] z-50 w-56 rounded-[1.1rem] p-2">
                {createMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsCreateOpen(false)}
                    className="flex items-center gap-2 rounded-[0.85rem] px-3 py-2.5 text-sm text-[var(--text-muted)] transition hover:bg-white/8 hover:text-white"
                  >
                    <Icon path={item.icon} className="h-4 w-4 text-cyan-100" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div ref={messagesRef} className="relative">
            <button
              type="button"
              aria-label="Inbox"
              onClick={() => {
                setIsMessagesOpen((v) => !v);
                setIsCreateOpen(false);
                setIsNotificationsOpen(false);
                setIsLanguageOpen(false);
                setIsAccountOpen(false);
              }}
              className={cx(
                "suzi-icon-btn relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/80",
                (isMessagesOpen || pathname.startsWith("/app/messages")) &&
                  "border-fuchsia-300/30 bg-fuchsia-400/12 text-white",
              )}
            >
              <Icon path="M4 6h16v10H7l-3 3V6Z" className="h-4 w-4" />
              {inboxBadgeCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-fuchsia-500 px-1 text-[0.58rem] font-semibold leading-none text-white">
                  {inboxBadgeCount > 9 ? "9+" : inboxBadgeCount}
                </span>
              ) : null}
            </button>

            {isMessagesOpen ? (
              <div className="suzi-overlay-panel absolute right-0 top-[calc(100%+0.6rem)] z-50 w-[22rem] rounded-[1.15rem] p-2">
                <p className="px-3 py-2 text-sm font-semibold text-white">Inbox</p>
                <div className="space-y-1">
                  {shellThreads.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-[var(--text-soft)]">No conversations yet.</p>
                  ) : (
                    shellThreads.slice(0, 4).map((thread) => (
                      <Link
                        key={thread.peer.id}
                        href={`/app/messages?with=${encodeURIComponent(thread.peer.id)}`}
                        onClick={() => {
                          setSeenInboxMessageIds((prev) => {
                            const next = new Set(prev);
                            next.add(thread.lastMessage.id);
                            return next;
                          });
                          setIsMessagesOpen(false);
                        }}
                        className="flex items-center gap-3 rounded-[0.9rem] px-3 py-2.5 transition hover:bg-white/8"
                      >
                        <Image
                          src={resolveUserAvatarUrl(thread.peer.avatarUrl)}
                          alt=""
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-full border border-white/10 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {thread.peer.displayName ?? thread.peer.username}
                          </p>
                          <p className="truncate text-xs text-[var(--text-soft)]">{thread.lastMessage.body}</p>
                        </div>
                        <span className="text-[0.68rem] text-[var(--text-soft)]">
                          {formatShortNotifTime(thread.lastMessage.createdAt)}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
                <div className="mt-2 border-t border-[var(--border-soft)] px-3 pt-2">
                  <Link
                    href="/app/messages"
                    onClick={() => setIsMessagesOpen(false)}
                    className="text-sm font-medium text-cyan-100 transition hover:text-white"
                  >
                    Open inbox
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          <div ref={languageRef} className="relative">
            <button
              type="button"
              aria-label="Language"
              aria-expanded={isLanguageOpen}
              aria-haspopup="listbox"
              onClick={() => {
                setIsLanguageOpen((v) => !v);
                setIsCreateOpen(false);
                setIsMessagesOpen(false);
                setIsNotificationsOpen(false);
                setIsAccountOpen(false);
              }}
              className={cx(
                "suzi-icon-btn relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/80",
                isLanguageOpen && "border-fuchsia-300/30 bg-fuchsia-400/12 text-white",
              )}
            >
              <Icon path={globeIconPath} className="h-4 w-4" />
            </button>

            {isLanguageOpen ? (
              <div
                className="suzi-overlay-panel absolute right-0 top-[calc(100%+0.6rem)] z-50 w-56 rounded-[1.15rem] p-2"
                role="listbox"
                aria-label="Language"
              >
                <p className="px-3 py-2 text-sm font-semibold text-white">Language</p>
                <div className="max-h-[min(22rem,calc(100dvh-8rem))] space-y-1 overflow-y-auto suzi-scrollbar pr-1">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      role="option"
                      aria-selected={selectedLanguage === lang.code}
                      onClick={() => {
                        setSelectedLanguage(lang.code);
                        setIsLanguageOpen(false);
                      }}
                      className={cx(
                        "flex w-full items-center justify-between gap-2 rounded-[0.9rem] px-3 py-2.5 text-left text-sm transition hover:bg-white/8",
                        selectedLanguage === lang.code
                          ? "bg-white/12 text-white"
                          : "text-[var(--text-muted)] hover:text-white",
                      )}
                    >
                      <span className="font-medium">{lang.label}</span>
                      {selectedLanguage === lang.code ? (
                        <Icon path="M5 13l4 4L19 7" className="h-4 w-4 shrink-0 text-cyan-200" />
                      ) : (
                        <span className="w-4 shrink-0" aria-hidden />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => {
                setIsNotificationsOpen((v) => !v);
                setIsCreateOpen(false);
                setIsMessagesOpen(false);
                setIsLanguageOpen(false);
                setIsAccountOpen(false);
              }}
              className={cx(
                "suzi-icon-btn relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/80",
                (isNotificationsOpen || pathname.startsWith("/app/notifications")) &&
                  "border-fuchsia-300/30 bg-fuchsia-400/12 text-white",
              )}
            >
              <Icon path="M15 17H5l2-2.5V10a5 5 0 1 1 10 0v4.5L19 17h-4ZM10 20a2 2 0 0 0 4 0" className="h-4 w-4" />
              {unreadNotifications > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-fuchsia-500 px-1 text-[0.58rem] font-semibold leading-none text-white">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              ) : null}
            </button>

            {isNotificationsOpen ? (
              <div className="suzi-overlay-panel absolute right-0 top-[calc(100%+0.6rem)] z-50 w-[22rem] rounded-[1.15rem] p-2">
                <p className="px-3 py-2 text-sm font-semibold text-white">Notifications</p>
                <div className="space-y-1">
                  {shellNotifications.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-[var(--text-soft)]">No notifications.</p>
                  ) : (
                    shellNotifications.slice(0, 4).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          void handleMarkNotificationRead(item.id);
                          setIsNotificationsOpen(false);
                          window.location.href = "/app/notifications";
                        }}
                        className="flex w-full items-start gap-2 rounded-[0.9rem] px-3 py-2.5 text-left transition hover:bg-white/8"
                      >
                        <span
                          className={cx(
                            "mt-1 h-2 w-2 rounded-full shadow-[0_0_8px_rgba(82,213,255,0.6)]",
                            item.read ? "bg-slate-500" : "bg-cyan-300",
                          )}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{item.title}</p>
                          <p className="truncate text-xs text-[var(--text-soft)]">
                            {formatShortNotifTime(item.createdAt)}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <div className="mt-2 border-t border-[var(--border-soft)] px-3 pt-2">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href="/app/notifications"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-sm font-medium text-cyan-100 transition hover:text-white"
                    >
                      Open notifications
                    </Link>
                    {unreadNotifications > 0 ? (
                      <button
                        type="button"
                        onClick={() => void handleMarkAllNotificationsRead()}
                        className="text-xs font-semibold uppercase tracking-[0.08em] text-fuchsia-100/90 transition hover:text-white"
                      >
                        Mark all read
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div ref={accountRef} className="relative">
            <button
              type="button"
              aria-label="Account"
              onClick={() => {
                setIsAccountOpen((v) => !v);
                setIsCreateOpen(false);
                setIsMessagesOpen(false);
                setIsNotificationsOpen(false);
                setIsLanguageOpen(false);
              }}
              className={cx(
                "inline-flex items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-white/5 px-2 py-1.5 transition hover:bg-white/10",
                isAccountOpen && "border-fuchsia-300/30 bg-fuchsia-400/12",
              )}
            >
              <Image
                src={accountAvatarSrc}
                alt={`${accountName} avatar`}
                width={34}
                height={34}
                className="h-8 w-8 rounded-full border border-white/10 object-cover"
              />
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block max-w-[8.5rem] truncate text-sm font-semibold leading-tight text-white">
                  {accountName}
                </span>
                <span className="block max-w-[8.5rem] truncate text-[0.7rem] leading-tight text-[var(--text-soft)]">
                  {accountHandle}
                </span>
              </span>
              <Icon
                path={isAccountOpen ? "M7 14l5-5 5 5" : "M7 10l5 5 5-5"}
                className="h-4 w-4 text-[var(--text-soft)]"
              />
            </button>

            {isAccountOpen ? (
              <div className="suzi-overlay-panel absolute right-0 top-[calc(100%+0.6rem)] z-50 w-56 rounded-[1.15rem] p-2">
                <Link
                  href="/app/profile"
                  onClick={() => setIsAccountOpen(false)}
                  className="flex items-center gap-2 rounded-[0.85rem] px-3 py-2.5 text-sm text-[var(--text-muted)] transition hover:bg-white/8 hover:text-white"
                >
                  <Icon path="M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" className="h-4 w-4 text-cyan-100" />
                  <span>Account</span>
                </Link>
                <Link
                  href="/app/notifications"
                  onClick={() => setIsAccountOpen(false)}
                  className="flex items-center gap-2 rounded-[0.85rem] px-3 py-2.5 text-sm text-[var(--text-muted)] transition hover:bg-white/8 hover:text-white"
                >
                  <Icon path="M15 17H5l2-2.5V10a5 5 0 1 1 10 0v4.5L19 17h-4ZM10 20a2 2 0 0 0 4 0" className="h-4 w-4 text-cyan-100" />
                  <span>Notifications</span>
                </Link>
                <Link
                  href="/app/messages"
                  onClick={() => setIsAccountOpen(false)}
                  className="flex items-center gap-2 rounded-[0.85rem] px-3 py-2.5 text-sm text-[var(--text-muted)] transition hover:bg-white/8 hover:text-white"
                >
                  <Icon path="M4 6h16v10H7l-3 3V6Z" className="h-4 w-4 text-cyan-100" />
                  <span>Inbox</span>
                </Link>
                <div className="my-2 h-px bg-[var(--border-soft)]" />
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-2 rounded-[0.85rem] px-3 py-2.5 text-left text-sm text-pink-100 transition hover:bg-pink-400/12 hover:text-white"
                >
                  <Icon path="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" className="h-4 w-4" />
                  <span>Log out</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
        </header>

        {gameInvites.length > 0 ? (
          <div
            className="pointer-events-auto absolute right-3 z-[219] w-[min(26rem,calc(100vw-1.5rem))] space-y-2 sm:right-4"
            style={{ top: "calc(var(--shell-header-h) + var(--shell-pad-y) + 0.5rem)" }}
          >
            {gameInvites.map((invite) => (
              <div key={invite.lobbyId} className="rounded-xl border border-cyan-300/28 bg-[linear-gradient(155deg,rgba(30,18,84,0.94),rgba(20,12,60,0.92))] px-3 py-2.5 shadow-[0_10px_30px_rgba(6,9,28,0.48)]">
                <p className="text-[var(--fs-2xs)] uppercase tracking-[0.14em] text-cyan-100/72">Game Invite</p>
                <p className="mt-1 text-[var(--fs-sm)] font-semibold text-white">{invite.title}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <Link href={invite.deepLink} className="suzi-primary-btn px-3 py-1.5 text-[var(--fs-xs)]">
                    Join now
                  </Link>
                  <button
                    type="button"
                    onClick={() => setGameInvites((prev) => prev.filter((item) => item.lobbyId !== invite.lobbyId))}
                    className="text-[var(--fs-2xs)] font-semibold uppercase tracking-[0.12em] text-cyan-100/78 transition hover:text-white"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="suzi-app-frame-fill">
          {children}
        </div>

        <footer
          className="mt-auto grid shrink-0 grid-cols-3 items-center gap-3 px-1 font-medium tracking-[0.1em] text-cyan-100/72"
          style={{
            minHeight: "var(--shell-footer-h)",
            fontSize: "clamp(0.5rem, 0.28vw + 0.34rem, 0.6rem)",
          }}
        >
          <span aria-hidden="true" />
          <span className="text-center">© Suzi Chat. All rights reserved.</span>
          <span className="hidden items-center justify-end gap-2.5 sm:flex">
            <Link href="#" className="transition hover:text-white">Privacy</Link>
            <span className="opacity-30">·</span>
            <Link href="#" className="transition hover:text-white">Terms</Link>
            <span className="opacity-30">·</span>
            <Link href="#" className="transition hover:text-white">Help</Link>
          </span>
        </footer>
      </div>
    </main>
  );
}
