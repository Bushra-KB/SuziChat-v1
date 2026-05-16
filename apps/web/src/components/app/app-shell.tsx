"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
import { createMenuItems, mobileNavItems } from "@/lib/v1-mock-data";
import {
  AnchoredDropdown,
  isEventInsideAnchor,
  isEventInsideShellDropdown,
} from "@/components/ui/anchored-dropdown";
import {
  shellDropdownEmpty,
  shellDropdownFooterAction,
  shellDropdownFooterLink,
  shellDropdownHeading,
  shellDropdownIcon,
  shellDropdownItem,
  shellDropdownItemActive,
  shellDropdownLogout,
  shellDropdownRow,
  shellDropdownRowSubtitle,
  shellDropdownRowTime,
  shellDropdownRowTitle,
} from "@/components/app/home-typography";
import { Icon, cx } from "@/components/ui/suzi-primitives";

const shellDropdownPanel = "suzi-shell-dropdown rounded-[0.85rem] p-1.5";

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
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
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
    setSeenInboxMessageIds(readSeenInboxMessageIds(session.user.id));
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
    /** Capture phase so we run before controls that stop propagation; pointer covers mouse + touch. */
    const shellTriggerRefs = [createRef, messagesRef, languageRef, notificationsRef, accountRef];

    function handlePointerDownCapture(event: PointerEvent) {
      if (event.button !== undefined && event.button !== 0) {
        return;
      }

      if (isEventInsideShellDropdown(event)) {
        return;
      }

      if (shellTriggerRefs.some((ref) => isEventInsideAnchor(event, ref))) {
        return;
      }

      setIsCreateOpen(false);
      setIsMessagesOpen(false);
      setIsNotificationsOpen(false);
      setIsLanguageOpen(false);
      setIsAccountOpen(false);
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

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- close drawer on route change */
    setIsMobileDrawerOpen(false);
  }, [pathname]);

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

      <div className="suzi-shell-content relative z-10 mx-auto flex min-h-0 w-full flex-1 flex-col">
        <Link href="/app" className="suzi-shell-logo-overlay" aria-label="SuziChat">
          <span className="suzi-shell-logo-overlay__frame">
            <Image
              src="/logo/logo.png"
              alt="SuziChat"
              width={1536}
              height={1024}
              priority
              className="object-contain"
            />
          </span>
        </Link>

        {/* MOBILE TOP BAR — < md only. */}
        <header
          className="suzi-m-top relative z-[220] flex shrink-0 items-center justify-between gap-2 md:hidden"
        >
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="suzi-m-icon-btn"
          >
            <Icon path="M4 6h16M4 12h16M4 18h16" className="h-5 w-5" />
          </button>

          <Link href="/app" className="suzi-m-logo-pill" aria-label="Suzi Chat home">
            <span className="relative block w-full h-full overflow-hidden">
              <Image
                src="/logo/logo.png"
                alt="SuziChat"
                width={1536}
                height={1024}
                priority
                className="absolute left-1/2 top-1/2 h-[185%] w-auto max-w-none -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_18px_rgba(232,77,255,0.32)]"
              />
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/app/notifications"
              aria-label="Notifications"
              className="suzi-m-icon-btn"
            >
              <Icon path="M15 17H5l2-2.5V10a5 5 0 1 1 10 0v4.5L19 17h-4ZM10 20a2 2 0 0 0 4 0" className="h-4.5 w-4.5" />
              {unreadNotifications > 0 ? (
                <span className="suzi-shell-toolbar-badge absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full bg-fuchsia-500 font-semibold text-white">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              ) : null}
            </Link>
            <Link
              href="/app/profile"
              aria-label="Account"
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-fuchsia-300/40 ring-2 ring-fuchsia-400/20"
            >
              <Image
                src={accountAvatarSrc}
                alt={`${accountName} avatar`}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0e0a30] bg-emerald-400" />
            </Link>
          </div>
        </header>

        {/* MOBILE DRAWER */}
        {isMobileDrawerOpen ? (
          <>
            <div
              className="suzi-m-drawer-backdrop md:hidden"
              role="presentation"
              onClick={() => setIsMobileDrawerOpen(false)}
            />
            <aside
              className="suzi-m-drawer md:hidden"
              data-open="true"
              aria-label="Main menu"
            >
              <div className="flex items-center justify-between gap-2 px-5 pb-3 pt-5">
                <div className="flex items-center gap-3">
                  <Image
                    src={accountAvatarSrc}
                    alt={`${accountName} avatar`}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full border border-white/10 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{accountName}</p>
                    <p className="truncate text-xs text-[var(--text-soft)]">{accountHandle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="suzi-m-icon-btn"
                >
                  <Icon path="M6 6l12 12M18 6L6 18" className="h-4.5 w-4.5" />
                </button>
              </div>
              <div className="suzi-divider mx-5 my-2" />
              <nav className="px-3 py-2">
                {[
                  { href: "/app", label: "Home", icon: "M3 11.5 12 4l9 7.5M6.5 10.5V20h11v-9.5" },
                  { href: "/app/messages", label: "Chat", icon: "M4 6h16v10H8l-4 4V6Z" },
                  { href: "/app/friends", label: "Friends", icon: "M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM6 21a6 6 0 0 1 12 0M8 13a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM2 19a4 4 0 0 1 6-3.5" },
                  { href: "/app/reels", label: "Reels", icon: "M8 5h8l4 4v10a2 2 0 0 1-2 2H8a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4Z M11 11.5v4l3-2-3-2Z" },
                  { href: "/app/snaps", label: "Snaps", icon: "M7 7h10v10H7zM5 5h14v14H5zM9 2v3M15 2v3" },
                  { href: "/app/dating", label: "Dating", icon: "M12 20s-6.5-4.3-8.6-7.4C.8 9.4 2 4.9 6.3 4.3 8.7 4 10.5 5.2 12 7c1.5-1.8 3.3-3 5.7-2.7 4.3.6 5.5 5.1 2.9 8.3C18.5 15.7 12 20 12 20Z" },
                  { href: "/app/notifications", label: "Notifications", icon: "M15 17H5l2-2.5V10a5 5 0 1 1 10 0v4.5L19 17h-4ZM10 20a2 2 0 0 0 4 0" },
                  { href: "/app/profile", label: "My account", icon: "M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" },
                  { href: "/app/settings", label: "Settings", icon: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM19.4 12a7.4 7.4 0 0 0-.1-1.4l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.4-1.4l-.4-2.6h-4l-.4 2.6a7.5 7.5 0 0 0-2.4 1.4l-2.4-1-2 3.4 2 1.6c-.1.5-.1 1-.1 1.4s0 .9.1 1.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2.4 1.4l.4 2.6h4l.4-2.6a7.5 7.5 0 0 0 2.4-1.4l2.4 1 2-3.4-2-1.6c.1-.5.1-1 .1-1.4Z" },
                ].map((item) => {
                  const active =
                    item.href === "/app"
                      ? pathname === "/app"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cx(
                        "flex items-center gap-3 rounded-[0.95rem] px-3 text-sm transition suzi-tap-row",
                        active
                          ? "bg-fuchsia-400/16 text-white shadow-[inset_0_0_0_1px_rgba(255,32,121,0.32)]"
                          : "text-[var(--text-muted)] hover:bg-white/8 hover:text-white",
                      )}
                    >
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/6">
                        <Icon path={item.icon} className="h-4.5 w-4.5 text-cyan-100" />
                      </span>
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="suzi-divider mx-5 my-2" />
              <button
                type="button"
                onClick={onLogout}
                className="mx-3 mb-4 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-[0.95rem] px-3 text-sm text-pink-100 suzi-tap-row hover:bg-pink-400/12 hover:text-white"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-pink-400/14">
                  <Icon path="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" className="h-4.5 w-4.5" />
                </span>
                <span className="font-medium">Log out</span>
              </button>
            </aside>
          </>
        ) : null}

        <header
          className="relative z-[220] hidden shrink-0 items-center justify-between gap-3 overflow-visible md:flex"
          style={{ minHeight: "var(--shell-header-h)" }}
        >
        <div className="min-w-0 flex-1" aria-hidden="true" />

        <div className="suzi-shell-toolbar pointer-events-auto flex items-center border border-white/10 bg-[linear-gradient(140deg,rgba(15,13,43,0.76),rgba(34,18,79,0.56))] backdrop-blur-md">
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
                "suzi-icon-btn suzi-shell-toolbar-btn relative inline-flex items-center justify-center text-white/80",
                isCreateOpen && "border-fuchsia-300/30 bg-fuchsia-400/12 text-white",
              )}
            >
              <Icon path="M12 5v14M5 12h14" />
            </button>

            <AnchoredDropdown
              open={isCreateOpen}
              anchorRef={createRef}
              positionAnchorRef={createRef}
              align="start"
              className={cx(shellDropdownPanel, "w-52")}
            >
              {createMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsCreateOpen(false)}
                  className={shellDropdownItem}
                >
                  <Icon path={item.icon} className={shellDropdownIcon} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </AnchoredDropdown>
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
                "suzi-icon-btn suzi-shell-toolbar-btn relative inline-flex items-center justify-center text-white/80",
                (isMessagesOpen || pathname.startsWith("/app/messages")) &&
                  "border-fuchsia-300/30 bg-fuchsia-400/12 text-white",
              )}
            >
              <Icon path="M4 6h16v10H7l-3 3V6Z" />
              {inboxBadgeCount > 0 ? (
                <span className="suzi-shell-toolbar-badge absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full bg-fuchsia-500 font-semibold text-white">
                  {inboxBadgeCount > 9 ? "9+" : inboxBadgeCount}
                </span>
              ) : null}
            </button>

            <AnchoredDropdown
              open={isMessagesOpen}
              anchorRef={messagesRef}
              positionAnchorRef={createRef}
              align="start"
              className={cx(shellDropdownPanel, "w-[17.5rem]")}
            >
                <p className={shellDropdownHeading}>Inbox</p>
                <div className="space-y-0.5">
                  {shellThreads.length === 0 ? (
                    <p className={shellDropdownEmpty}>No conversations yet.</p>
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
                        className={shellDropdownRow}
                      >
                        <Image
                          src={resolveUserAvatarUrl(thread.peer.avatarUrl)}
                          alt=""
                          width={24}
                          height={24}
                          className="h-6 w-6 shrink-0 rounded-full border border-white/10 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={shellDropdownRowTitle}>
                            {thread.peer.displayName ?? thread.peer.username}
                          </p>
                          <p className={shellDropdownRowSubtitle}>{thread.lastMessage.body}</p>
                        </div>
                        <span className={shellDropdownRowTime}>
                          {formatShortNotifTime(thread.lastMessage.createdAt)}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
                <div className="mt-1.5 border-t border-[var(--border-soft)] px-2 pt-1.5">
                  <Link
                    href="/app/messages"
                    onClick={() => setIsMessagesOpen(false)}
                    className={shellDropdownFooterLink}
                  >
                    Open inbox
                  </Link>
                </div>
            </AnchoredDropdown>
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
                "suzi-icon-btn suzi-shell-toolbar-btn relative inline-flex items-center justify-center text-white/80",
                isLanguageOpen && "border-fuchsia-300/30 bg-fuchsia-400/12 text-white",
              )}
            >
              <Icon path={globeIconPath} />
            </button>

            <AnchoredDropdown
              open={isLanguageOpen}
              anchorRef={languageRef}
              positionAnchorRef={createRef}
              align="start"
              className={cx(shellDropdownPanel, "w-52")}
            >
              <div role="listbox" aria-label="Language">
                <p className={shellDropdownHeading}>Language</p>
                <div className="max-h-[min(22rem,calc(100dvh-8rem))] space-y-0.5 overflow-y-auto suzi-scrollbar pr-0.5">
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
                        "flex w-full items-center justify-between gap-2 rounded-[0.7rem] px-2 py-1.5 text-left transition",
                        selectedLanguage === lang.code ? shellDropdownItemActive : shellDropdownItem,
                      )}
                    >
                      <span>{lang.label}</span>
                      {selectedLanguage === lang.code ? (
                        <Icon path="M5 13l4 4L19 7" className={cx(shellDropdownIcon, "text-cyan-200")} />
                      ) : (
                        <span className="w-3 shrink-0" aria-hidden />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </AnchoredDropdown>
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
                "suzi-icon-btn suzi-shell-toolbar-btn relative inline-flex items-center justify-center text-white/80",
                (isNotificationsOpen || pathname.startsWith("/app/notifications")) &&
                  "border-fuchsia-300/30 bg-fuchsia-400/12 text-white",
              )}
            >
              <Icon path="M15 17H5l2-2.5V10a5 5 0 1 1 10 0v4.5L19 17h-4ZM10 20a2 2 0 0 0 4 0" />
              {unreadNotifications > 0 ? (
                <span className="suzi-shell-toolbar-badge absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full bg-fuchsia-500 font-semibold text-white">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              ) : null}
            </button>

            <AnchoredDropdown
              open={isNotificationsOpen}
              anchorRef={notificationsRef}
              positionAnchorRef={createRef}
              align="start"
              className={cx(shellDropdownPanel, "w-[17.5rem]")}
            >
                <p className={shellDropdownHeading}>Notifications</p>
                <div className="space-y-0.5">
                  {shellNotifications.length === 0 ? (
                    <p className={shellDropdownEmpty}>No notifications.</p>
                  ) : (
                    shellNotifications.slice(0, 4).map((item) => (
                      <Link
                        key={item.id}
                        href="/app/notifications"
                        onClick={() => {
                          void handleMarkNotificationRead(item.id);
                          setIsNotificationsOpen(false);
                        }}
                        className={cx(shellDropdownRow, "items-start")}
                      >
                        <span
                          className={cx(
                            "mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full shadow-[0_0_6px_rgba(82,213,255,0.55)]",
                            item.read ? "bg-slate-500" : "bg-cyan-300",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={shellDropdownRowTitle}>{item.title}</p>
                          <p className={shellDropdownRowSubtitle}>
                            {formatShortNotifTime(item.createdAt)}
                          </p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
                <div className="mt-1.5 border-t border-[var(--border-soft)] px-2 pt-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href="/app/notifications"
                      onClick={() => setIsNotificationsOpen(false)}
                      className={shellDropdownFooterLink}
                    >
                      Open notifications
                    </Link>
                    {unreadNotifications > 0 ? (
                      <button
                        type="button"
                        onClick={() => void handleMarkAllNotificationsRead()}
                        className={shellDropdownFooterAction}
                      >
                        Mark all read
                      </button>
                    ) : null}
                  </div>
                </div>
            </AnchoredDropdown>
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
                "suzi-shell-account-btn inline-flex items-center border border-[var(--border-soft)] bg-white/5 transition hover:bg-white/10",
                isAccountOpen && "border-fuchsia-300/30 bg-fuchsia-400/12",
              )}
            >
              <Image
                src={accountAvatarSrc}
                alt={`${accountName} avatar`}
                width={28}
                height={28}
                className="rounded-full border border-white/10 object-cover"
              />
              <span className="hidden min-w-0 text-left sm:block">
                <span className="suzi-shell-account-name block max-w-[7.5rem] truncate text-white">
                  {accountName}
                </span>
                <span className="suzi-shell-account-handle block max-w-[7.5rem] truncate text-[var(--text-soft)]">
                  {accountHandle}
                </span>
              </span>
              <Icon
                path={isAccountOpen ? "M7 14l5-5 5 5" : "M7 10l5 5 5-5"}
                className="suzi-shell-account-chevron text-[var(--text-soft)]"
              />
            </button>

            <AnchoredDropdown
              open={isAccountOpen}
              anchorRef={accountRef}
              positionAnchorRef={createRef}
              align="start"
              className={cx(shellDropdownPanel, "w-52")}
            >
                <Link
                  href="/app/profile"
                  onClick={() => setIsAccountOpen(false)}
                  className={shellDropdownItem}
                >
                  <Icon path="M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" className={shellDropdownIcon} />
                  <span>Account</span>
                </Link>
                <Link
                  href="/app/notifications"
                  onClick={() => setIsAccountOpen(false)}
                  className={shellDropdownItem}
                >
                  <Icon path="M15 17H5l2-2.5V10a5 5 0 1 1 10 0v4.5L19 17h-4ZM10 20a2 2 0 0 0 4 0" className={shellDropdownIcon} />
                  <span>Notifications</span>
                </Link>
                <Link
                  href="/app/messages"
                  onClick={() => setIsAccountOpen(false)}
                  className={shellDropdownItem}
                >
                  <Icon path="M4 6h16v10H7l-3 3V6Z" className={shellDropdownIcon} />
                  <span>Inbox</span>
                </Link>
                <div className="my-1 h-px bg-[var(--border-soft)]" />
                <button
                  type="button"
                  onClick={onLogout}
                  className={shellDropdownLogout}
                >
                  <Icon path="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" className={shellDropdownIcon} />
                  <span>Log out</span>
                </button>
            </AnchoredDropdown>
          </div>
        </div>
        </header>

        {gameInvites.length > 0 ? (
          <div
            className="pointer-events-auto absolute right-3 z-[219] w-[min(26rem,calc(100vw-1.5rem))] space-y-2 sm:right-4"
            style={{ top: "calc(var(--shell-header-h) + 0.5rem)" }}
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
          className="mt-auto hidden shrink-0 grid-cols-3 items-center gap-2 px-1 py-0.5 font-medium leading-none tracking-[0.08em] text-cyan-100/72 md:grid"
          style={{
            minHeight: "var(--shell-footer-h)",
            fontSize: "clamp(0.45rem, 0.22vw + 0.3rem, 0.52rem)",
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

      {/* MOBILE BOTTOM NAV — < md only. */}
      <nav
        className="suzi-m-bottom fixed inset-x-0 bottom-0 z-40 hidden h-[calc(var(--m-bottom-h,4rem)+env(safe-area-inset-bottom,0px))] grid-cols-5 items-center md:hidden"
        aria-label="Primary"
      >
        {mobileNavItems.map((item) => {
          const active =
            item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="suzi-m-bottom__item flex h-full flex-col items-center justify-center gap-[0.18rem] text-[0.66rem] font-semibold tracking-[0.04em]"
              data-active={active ? "true" : "false"}
              aria-current={active ? "page" : undefined}
            >
              <Icon path={item.icon} className="suzi-m-bottom__icon h-[1.45rem] w-[1.45rem] shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
