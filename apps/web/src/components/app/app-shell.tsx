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
import { languages, useI18n } from "@/lib/i18n";
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

type LegalDialog = "privacy" | "terms" | "help";

const legalDocs: Record<
  LegalDialog,
  {
    titleKey: "legal.privacy" | "legal.terms" | "legal.help";
    sections: Array<{ heading?: string; paragraphs?: string[]; bullets?: string[] }>;
  }
> = {
  privacy: {
    titleKey: "legal.privacy",
    sections: [
      {
        paragraphs: [
          "Suzi Chat collects and stores basic user information required to operate the platform. This may include usernames, email addresses, encrypted passwords, profile information, uploaded photos, uploaded videos, chat room activity, private messages, dating information, game activity, IP addresses, browser type, cookies, session logs, and other technical information necessary for security and website performance.",
          "This information is used for account management, login authentication, moderation, abuse prevention, platform security, performance improvement, advertising support, and the general operation of Suzi Chat.",
          "Suzi Chat does not sell personal user data to third parties. Certain technical data may be processed by trusted hosting providers, analytics providers, advertising partners, or technical service providers where reasonably required for website operation and support.",
          "Users understand that any content posted publicly within profiles, chat rooms, snaps, reels, dating sections, or other public areas may be visible to other users of the platform. Users are responsible for the personal information they choose to share publicly.",
          "Suzi Chat takes reasonable technical and administrative steps to protect user information; however, no online service can guarantee absolute data security.",
          "Users may request account closure, access to personal information, correction of personal information, or removal of account data through Suzi Chat's official contact methods, where applicable under Irish and European Union law.",
          "Certain technical records may be retained where reasonably necessary for legal compliance, fraud prevention, moderation, platform security, or enforcement of platform rules.",
          "Suzi Chat uses cookies and similar technologies to provide login functionality, maintain active user sessions, remember basic settings, improve website speed and performance, monitor platform traffic, and support website advertising.",
          "Cookies may store technical information such as browser details, device information, IP addresses, session identifiers, and user interaction preferences.",
          "Third-party service providers, including analytics or advertising partners, may also use cookies where reasonably required for the normal operation and support of Suzi Chat.",
          "Users may disable cookies through their browser settings; however, some platform features may not function correctly if cookies are disabled.",
          "By continuing to use Suzi Chat, users consent to the collection and use of information as described within this Privacy Policy.",
        ],
      },
    ],
  },
  terms: {
    titleKey: "legal.terms",
    sections: [
      {
        paragraphs: [
          "Welcome to Suzi Chat. Suzi Chat is an adults-only online social platform. By creating an account, accessing, or using Suzi Chat in any way, you confirm that you are 18 years of age or older and agree to comply fully with these Terms & Conditions. If you do not agree with these Terms, you must not use Suzi Chat.",
          "Suzi Chat allows users to create profiles, join chat rooms, send private messages, upload photos and videos, use dating features, participate in games, create user rooms, and interact with other members. All activity carried out through your account remains your sole responsibility.",
          "Users are fully responsible for all content, messages, media, usernames, profile details, room activity, private conversations, dating interactions, game activity, and any other material posted, uploaded, shared, or transmitted through their account.",
          "Suzi Chat does not pre-approve all user-generated content and cannot guarantee the accuracy, legality, safety, or reliability of content posted by users.",
          "Users retain ownership of content they upload to Suzi Chat. By uploading, posting, or sharing content on the platform, users grant Suzi Chat a non-exclusive, worldwide, royalty-free licence to host, store, display, reproduce, process, and distribute such content solely for the operation, moderation, improvement, and promotion of the platform.",
          "The following are strictly prohibited anywhere on Suzi Chat:",
        ],
        bullets: [
          "Any use of the platform by persons under 18",
          "Any content involving minors",
          "Illegal activity",
          "Threats, harassment, stalking, or repeated abuse",
          "Hate speech",
          "Impersonation",
          "Scam behaviour or spam",
          "Malicious links or harmful software",
          "Copyright infringement",
          "Sharing private personal information without consent",
          "Any behaviour considered harmful, unsafe, unlawful, or damaging to users or the platform",
        ],
      },
      {
        paragraphs: [
          "Users must not use Suzi Chat to intimidate, exploit, deceive, endanger, or deliberately disrupt other users.",
          "Room owners and users remain responsible for ensuring that content shared within rooms remains lawful and within platform rules.",
          "Suzi Chat reserves the full right to remove content, suspend accounts, permanently ban users, close rooms, restrict access to features, terminate inactive or suspicious accounts, or take any action considered necessary to protect users, protect the platform, enforce rules, prevent abuse, or comply with legal obligations. Such action may be taken with or without prior warning.",
          "By using Suzi Chat, users understand and accept that all user interactions, including chats, private messages, dating communication, meetings, games, and media sharing, are carried out entirely at their own risk.",
          "Suzi Chat accepts no liability for disputes, losses, damages, financial issues, personal disagreements, emotional harm, offline meetings, or consequences arising from interactions between users, whether on or off the platform.",
          "Suzi Chat aims to provide a stable and enjoyable service; however, we do not guarantee that the website will always be available, uninterrupted, secure, error-free, or compatible with every device. Features may be modified, updated, temporarily paused, or permanently removed at any time without prior notice.",
          "Suzi Chat may cooperate with law enforcement or relevant authorities where legally required.",
          "Suzi Chat reserves the right to amend or update these Terms & Conditions at any time. Continued use of the platform following updates constitutes acceptance of the revised Terms.",
          "These Terms & Conditions shall be governed by and interpreted in accordance with the laws of Ireland.",
          "If you do not agree to these Terms & Conditions, you must discontinue use of Suzi Chat immediately.",
        ],
      },
    ],
  },
  help: {
    titleKey: "legal.help",
    sections: [
      {
        paragraphs: [
          "Users may report illegal content, underage concerns, harassment, impersonation, scams, copyright issues, malicious activity, or any other serious platform abuse through Suzi Chat's official contact methods.",
          "Reports should include as much detail as possible, including usernames, room names, screenshots, and a short explanation of the issue where available.",
          "All serious reports are reviewed and accounts or content found to be in breach of Suzi Chat rules may be suspended, removed, or permanently banned without prior warning.",
          "For abuse reports, safety concerns, copyright complaints, account issues, or general help, users may contact:",
          "suzichatadmin@gmail.com",
        ],
      },
    ],
  },
};

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
  const { language, setLanguage, t } = useI18n();
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
  const [roomInvites, setRoomInvites] = useState<
    Array<{
      roomSlug: string;
      fromUserId: string;
      title: string;
      deepLink: string;
      sentAt: string;
    }>
  >([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMobileCreateOpen, setIsMobileCreateOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileNotificationsOpen, setIsMobileNotificationsOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isMobileLanguageOpen, setIsMobileLanguageOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMobileOverlayOpen, setIsMobileOverlayOpen] = useState(false);
  const [legalDialog, setLegalDialog] = useState<LegalDialog | null>(null);
  const createRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const languageRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const mobileCreateRef = useRef<HTMLDivElement | null>(null);
  const mobileNotificationsRef = useRef<HTMLDivElement | null>(null);
  const mobileLanguageRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (typeof document === "undefined") return;

    const selectors = [
      ".suzi-mobile-modal-root",
      ".suzi-room-members--open",
      ".suzi-m-sheet[data-open='true']",
      ".suzi-account-modal-backdrop",
    ].join(",");
    const syncOverlayState = () => {
      setIsMobileOverlayOpen(Boolean(document.querySelector(selectors)));
    };

    syncOverlayState();
    const observer = new MutationObserver(syncOverlayState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-open"],
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

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
    const shellTriggerRefs = [
      createRef,
      messagesRef,
      languageRef,
      notificationsRef,
      accountRef,
      mobileCreateRef,
      mobileNotificationsRef,
      mobileLanguageRef,
    ];

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
      setIsMobileCreateOpen(false);
      setIsMessagesOpen(false);
      setIsNotificationsOpen(false);
      setIsMobileNotificationsOpen(false);
      setIsLanguageOpen(false);
      setIsMobileLanguageOpen(false);
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
    socket.on("dm:message:updated", refreshThreads);
    socket.on("dm:message:deleted", refreshThreads);
    socket.on("dm:conversation:removed", refreshThreads);
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
    socket.on("room:invite", (payload: {
      roomSlug?: string;
      fromUserId?: string;
      title?: string;
      deepLink?: string;
      sentAt?: string;
    }) => {
      if (!payload.roomSlug || !payload.deepLink) {
        return;
      }
      setRoomInvites((prev) => {
        const next = [
          {
            roomSlug: payload.roomSlug as string,
            fromUserId: String(payload.fromUserId ?? ""),
            title: String(payload.title ?? "Room Invite"),
            deepLink: String(payload.deepLink ?? "/app"),
            sentAt: String(payload.sentAt ?? new Date().toISOString()),
          },
          ...prev.filter((entry) => entry.roomSlug !== payload.roomSlug),
        ];
        return next.slice(0, 4);
      });
    });
    return () => {
      socket.off("dm:message", refreshThreads);
      socket.off("dm:message:updated", refreshThreads);
      socket.off("dm:message:deleted", refreshThreads);
      socket.off("dm:conversation:removed", refreshThreads);
      socket.off("notifications:update", refreshNotifications);
      socket.off("realtime:state", onRealtimeState);
      socket.off("game:invite");
      socket.off("room:invite");
    };
  }, [session.accessToken]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("suzi-app-frame-lock");
    return () => root.classList.remove("suzi-app-frame-lock");
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- close transient shell menus on route change */
    setIsCreateOpen(false);
    setIsMobileCreateOpen(false);
    setIsMessagesOpen(false);
    setIsNotificationsOpen(false);
    setIsLanguageOpen(false);
    setIsAccountOpen(false);
    setIsMobileDrawerOpen(false);
    setIsMobileNotificationsOpen(false);
    setIsMobileLanguageOpen(false);
    setLegalDialog(null);
  }, [pathname]);

  return (
    <main
      data-suzi-app-frame
      className={cx(
        "suzi-hybrid-bg relative flex h-[100dvh] min-h-0 flex-col overflow-hidden text-white",
        isMobileDrawerOpen && "suzi-mobile-drawer-open",
        isMobileOverlayOpen && "suzi-mobile-overlay-open",
      )}
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

      <Link href="/app" className="suzi-shell-logo-overlay" aria-label="SuziChat">
        <Image
          src="/logo/logo.png"
          alt=""
          width={1038}
          height={531}
          priority
          className="suzi-shell-logo-overlay__img"
        />
      </Link>

      <div className="suzi-shell-content relative z-10 mx-auto flex min-h-0 w-full flex-1 flex-col">
        {/* MOBILE TOP BAR — < md only. */}
        <header
          className="suzi-m-top flex shrink-0 items-center justify-between gap-2 md:hidden"
        >
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="suzi-m-icon-btn suzi-m-menu-btn"
          >
            <Icon path="M4 6h16M4 12h16M4 18h16" className="h-5 w-5" />
          </button>

          <Link href="/app" className="suzi-m-logo-pill" aria-label="Suzi Chat home">
            <span className="relative block h-full w-full overflow-visible">
              <Image
                src="/logo/logo.png"
                alt="SuziChat"
                width={1038}
                height={531}
                priority
                className="absolute inset-0 h-full w-full object-contain object-center drop-shadow-[0_0_18px_rgba(232,77,255,0.38)]"
              />
            </span>
          </Link>

          <div className="suzi-m-top-actions flex items-center gap-2">
            <div ref={mobileNotificationsRef} className="relative">
              <button
                type="button"
                aria-label={t("shell.notifications")}
                aria-expanded={isMobileNotificationsOpen}
                onClick={() => {
                  setIsMobileNotificationsOpen((v) => !v);
                  setIsMobileLanguageOpen(false);
                  setIsCreateOpen(false);
                  setIsMobileCreateOpen(false);
                  setIsMessagesOpen(false);
                  setIsNotificationsOpen(false);
                  setIsLanguageOpen(false);
                  setIsAccountOpen(false);
                }}
                className={cx(
                  "suzi-m-icon-btn suzi-m-top-action-btn",
                  (isMobileNotificationsOpen || pathname.startsWith("/app/notifications")) && "is-active",
                )}
              >
                <Icon path="M15 17H5l2-2.5V10a5 5 0 1 1 10 0v4.5L19 17h-4ZM10 20a2 2 0 0 0 4 0" className="h-4 w-4" />
                {unreadNotifications > 0 ? (
                  <span className="suzi-shell-toolbar-badge absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full bg-fuchsia-500 font-semibold text-white">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                ) : null}
              </button>
              {isMobileNotificationsOpen ? (
                <div className="suzi-m-notification-menu">
                  <p className="px-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-cyan-100/66">
                    {t("shell.notifications")}
                  </p>
                  <div className="grid max-h-[16rem] gap-1 overflow-y-auto pr-0.5">
                    {shellNotifications.length === 0 ? (
                      <p className="rounded-[0.78rem] border border-white/10 bg-white/5 px-2.5 py-2 text-[0.72rem] text-slate-300/78">
                        {t("shell.noNotifications")}
                      </p>
                    ) : (
                      shellNotifications.slice(0, 4).map((item) => (
                        <Link
                          key={item.id}
                          href={item.href ?? "/app/notifications"}
                          onClick={() => {
                            void handleMarkNotificationRead(item.id);
                            setIsMobileNotificationsOpen(false);
                          }}
                          className="suzi-m-notification-menu__item"
                        >
                          <span
                            className={cx(
                              "mt-1 h-1.5 w-1.5 shrink-0 rounded-full shadow-[0_0_6px_rgba(82,213,255,0.55)]",
                              item.read ? "bg-slate-500" : "bg-cyan-300",
                            )}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-white">{item.title}</span>
                            <span className="mt-0.5 block truncate text-cyan-100/58">
                              {formatShortNotifTime(item.createdAt)}
                            </span>
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-white/10 pt-1.5">
                    <Link
                      href="/app/notifications"
                      onClick={() => setIsMobileNotificationsOpen(false)}
                      className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-cyan-100/80"
                    >
                      {t("shell.openNotifications")}
                    </Link>
                    {unreadNotifications > 0 ? (
                      <button
                        type="button"
                        onClick={() => void handleMarkAllNotificationsRead()}
                        className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-fuchsia-100"
                      >
                        {t("shell.markAllRead")}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            <div ref={mobileLanguageRef} className="relative">
              <button
                type="button"
                aria-label={t("shell.language")}
                aria-expanded={isMobileLanguageOpen}
                aria-haspopup="listbox"
                onClick={() => {
                  setIsMobileLanguageOpen((v) => !v);
                  setIsMobileNotificationsOpen(false);
                  setIsCreateOpen(false);
                  setIsMobileCreateOpen(false);
                  setIsMessagesOpen(false);
                  setIsNotificationsOpen(false);
                  setIsLanguageOpen(false);
                  setIsAccountOpen(false);
                }}
                className={cx("suzi-m-icon-btn suzi-m-top-action-btn", isMobileLanguageOpen && "is-active")}
              >
                <Icon path={globeIconPath} className="h-4 w-4" />
              </button>
              {isMobileLanguageOpen ? (
                <div className="suzi-m-language-menu" role="listbox" aria-label={t("shell.language")}>
                  <p className="px-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-cyan-100/66">
                    {t("shell.language")}
                  </p>
                  <div className="grid gap-1">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        role="option"
                        aria-selected={language === lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setIsMobileLanguageOpen(false);
                        }}
                        className={cx(
                          "suzi-m-language-menu__item",
                          language === lang.code && "is-active",
                        )}
                      >
                        <span>{lang.label}</span>
                        {language === lang.code ? (
                          <Icon path="M5 13l4 4L19 7" className="h-3.5 w-3.5 text-cyan-200" />
                        ) : (
                          <span className="h-3.5 w-3.5" aria-hidden />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <Link
              href="/app/profile"
              aria-label={t("shell.account")}
              onClick={() => {
                setIsMobileNotificationsOpen(false);
                setIsMobileLanguageOpen(false);
              }}
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
                  aria-label={t("common.close")}
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
                  { href: "/app/messages", label: "Inbox", icon: "M4 6h16v10H8l-4 4V6Z" },
                  { href: "/app/friends", label: "Friends", icon: "M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM6 21a6 6 0 0 1 12 0M8 13a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM2 19a4 4 0 0 1 6-3.5" },
                  { href: "/app#chatrooms", label: "Suzi ChatRooms", icon: "M4 6h16v10H8l-4 4V6Z M8 10h8M8 13h5" },
                  { href: "/app/reels", label: "Suzi Reels", icon: "M8 5h8l4 4v10a2 2 0 0 1-2 2H8a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4Z M11 11.5v4l3-2-3-2Z" },
                  { href: "/app/snaps", label: "Suzi Snaps", icon: "M7 7h10v10H7zM5 5h14v14H5zM9 2v3M15 2v3" },
                  { href: "/app#games", label: "Suzi Games", icon: "M6 12h12M9 9v6M15 9h.01M18 15h.01M8 6h8a6 6 0 0 1 0 12H8A6 6 0 0 1 8 6Z" },
                  { href: "/app/dating", label: "Suzi Dating", icon: "M12 20s-6.5-4.3-8.6-7.4C.8 9.4 2 4.9 6.3 4.3 8.7 4 10.5 5.2 12 7c1.5-1.8 3.3-3 5.7-2.7 4.3.6 5.5 5.1 2.9 8.3C18.5 15.7 12 20 12 20Z" },
                ].map((item) => {
                  const active =
                    item.href === "/app"
                      ? pathname === "/app"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileDrawerOpen(false)}
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
              <nav className="px-3 py-2">
                {[
                  { href: "/app/profile", label: "My Account", icon: "M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" },
                  { href: "/app/settings", label: "Settings", icon: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM19.4 12a7.4 7.4 0 0 0-.1-1.4l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.4-1.4l-.4-2.6h-4l-.4 2.6a7.5 7.5 0 0 0-2.4 1.4l-2.4-1-2 3.4 2 1.6c-.1.5-.1 1-.1 1.4s0 .9.1 1.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2.4 1.4l.4 2.6h4l.4-2.6a7.5 7.5 0 0 0 2.4-1.4l2.4 1 2-3.4-2-1.6c.1-.5.1-1 .1-1.4Z" },
                ].map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileDrawerOpen(false)}
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
              <button
                type="button"
                onClick={onLogout}
                className="mx-3 mb-4 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-[0.95rem] px-3 text-sm text-pink-100 suzi-tap-row hover:bg-pink-400/12 hover:text-white"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-pink-400/14">
                  <Icon path="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" className="h-4.5 w-4.5" />
                </span>
                <span className="font-medium">{t("shell.logout")}</span>
              </button>
            </aside>
          </>
        ) : null}

        <header
          className="suzi-shell-header-desktop relative z-[270] hidden shrink-0 items-center justify-between gap-3 overflow-visible md:flex"
          style={{ minHeight: "var(--shell-header-h)" }}
        >
          <div className="min-w-0 flex-1" aria-hidden="true" />

          <div className="suzi-shell-toolbar pointer-events-auto flex shrink-0 items-center border border-white/10 bg-[linear-gradient(140deg,rgba(15,13,43,0.76),rgba(34,18,79,0.56))] backdrop-blur-md">
          <div ref={createRef} className="relative">
            <button
              type="button"
              aria-label={t("shell.create")}
              onClick={() => {
                setIsCreateOpen((v) => !v);
                setIsMobileCreateOpen(false);
                setIsMessagesOpen(false);
                setIsNotificationsOpen(false);
                  setIsMobileNotificationsOpen(false);
                setIsLanguageOpen(false);
                  setIsMobileLanguageOpen(false);
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
              aria-label={t("shell.inbox")}
              onClick={() => {
                setIsMessagesOpen((v) => !v);
                setIsCreateOpen(false);
                setIsMobileCreateOpen(false);
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
                    {t("shell.openInbox")}
                  </Link>
                </div>
            </AnchoredDropdown>
          </div>

          <div ref={languageRef} className="relative">
            <button
              type="button"
              aria-label={t("shell.language")}
              aria-expanded={isLanguageOpen}
              aria-haspopup="listbox"
              onClick={() => {
                setIsLanguageOpen((v) => !v);
                setIsCreateOpen(false);
                setIsMobileCreateOpen(false);
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
              <div role="listbox" aria-label={t("shell.language")}>
                <p className={shellDropdownHeading}>{t("shell.language")}</p>
                <div className="max-h-[min(22rem,calc(100dvh-8rem))] space-y-0.5 overflow-y-auto suzi-scrollbar pr-0.5">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      role="option"
                      aria-selected={language === lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setIsLanguageOpen(false);
                      }}
                      className={cx(
                        "flex w-full items-center justify-between gap-2 rounded-[0.7rem] px-2 py-1.5 text-left transition",
                        language === lang.code ? shellDropdownItemActive : shellDropdownItem,
                      )}
                    >
                      <span>{lang.label}</span>
                      {language === lang.code ? (
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
              aria-label={t("shell.notifications")}
              onClick={() => {
                setIsNotificationsOpen((v) => !v);
                setIsCreateOpen(false);
                setIsMobileCreateOpen(false);
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
                <p className={shellDropdownHeading}>{t("shell.notifications")}</p>
                <div className="space-y-0.5">
                  {shellNotifications.length === 0 ? (
                    <p className={shellDropdownEmpty}>{t("shell.noNotifications")}</p>
                  ) : (
                    shellNotifications.slice(0, 4).map((item) => (
                      <Link
                        key={item.id}
                        href={item.href ?? "/app/notifications"}
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
                      {t("shell.openNotifications")}
                    </Link>
                    {unreadNotifications > 0 ? (
                      <button
                        type="button"
                        onClick={() => void handleMarkAllNotificationsRead()}
                        className={shellDropdownFooterAction}
                      >
                        {t("shell.markAllRead")}
                      </button>
                    ) : null}
                  </div>
                </div>
            </AnchoredDropdown>
          </div>

          <div ref={accountRef} className="relative">
            <button
              type="button"
              aria-label={t("shell.account")}
              onClick={() => {
                setIsAccountOpen((v) => !v);
                setIsCreateOpen(false);
                setIsMobileCreateOpen(false);
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
                  <span>{t("shell.account")}</span>
                </Link>
                <Link
                  href="/app/notifications"
                  onClick={() => setIsAccountOpen(false)}
                  className={shellDropdownItem}
                >
                  <Icon path="M15 17H5l2-2.5V10a5 5 0 1 1 10 0v4.5L19 17h-4ZM10 20a2 2 0 0 0 4 0" className={shellDropdownIcon} />
                  <span>{t("shell.notifications")}</span>
                </Link>
                <Link
                  href="/app/messages"
                  onClick={() => setIsAccountOpen(false)}
                  className={shellDropdownItem}
                >
                  <Icon path="M4 6h16v10H7l-3 3V6Z" className={shellDropdownIcon} />
                  <span>{t("shell.inbox")}</span>
                </Link>
                <div className="my-1 h-px bg-[var(--border-soft)]" />
                <button
                  type="button"
                  onClick={onLogout}
                  className={shellDropdownLogout}
                >
                  <Icon path="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" className={shellDropdownIcon} />
                  <span>{t("shell.logout")}</span>
                </button>
            </AnchoredDropdown>
          </div>
        </div>
        </header>

        {gameInvites.length > 0 || roomInvites.length > 0 ? (
          <div
            className="suzi-shell-game-invites pointer-events-auto absolute right-3 z-[219] w-[min(26rem,calc(100vw-1.5rem))] space-y-2 sm:right-4"
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
            {roomInvites.map((invite) => (
              <div key={invite.roomSlug} className="rounded-xl border border-cyan-300/28 bg-[linear-gradient(155deg,rgba(30,18,84,0.94),rgba(20,12,60,0.92))] px-3 py-2.5 shadow-[0_10px_30px_rgba(6,9,28,0.48)]">
                <p className="text-[var(--fs-2xs)] uppercase tracking-[0.14em] text-cyan-100/72">Room Invite</p>
                <p className="mt-1 text-[var(--fs-sm)] font-semibold text-white">{invite.title}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <Link href={invite.deepLink} className="suzi-primary-btn px-3 py-1.5 text-[var(--fs-xs)]">
                    Join room
                  </Link>
                  <button
                    type="button"
                    onClick={() => setRoomInvites((prev) => prev.filter((item) => item.roomSlug !== invite.roomSlug))}
                    className="text-[var(--fs-2xs)] font-semibold uppercase tracking-[0.12em] text-cyan-100/78 transition hover:text-white"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div
          className={cx(
            "suzi-app-frame-fill",
            pathname === "/app" && "suzi-home-shell-frame",
            pathname.startsWith("/app/messages") && "suzi-messages-shell-frame",
            pathname.startsWith("/app/friends") && "suzi-friends-shell-frame",
            (pathname.startsWith("/app/reels") || pathname.startsWith("/app/snaps") || pathname.startsWith("/app/dating")) &&
              "suzi-feed-shell-frame",
          )}
        >
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
            <button
              type="button"
              onClick={() => setLegalDialog("privacy")}
              className="transition hover:text-white"
            >
              {t("legal.privacy")}
            </button>
            <span className="opacity-30">·</span>
            <button
              type="button"
              onClick={() => setLegalDialog("terms")}
              className="transition hover:text-white"
            >
              {t("legal.terms")}
            </button>
            <span className="opacity-30">·</span>
            <button
              type="button"
              onClick={() => setLegalDialog("help")}
              className="transition hover:text-white"
            >
              {t("legal.help")}
            </button>
          </span>
        </footer>
      </div>

      {legalDialog ? (
        <LegalDialogPanel
          dialog={legalDialog}
          title={t(legalDocs[legalDialog].titleKey)}
          closeLabel={t("common.close")}
          onClose={() => setLegalDialog(null)}
        />
      ) : null}

      {/* MOBILE BOTTOM NAV — < md only. */}
      <nav
        className="suzi-m-bottom hidden grid-cols-5 items-center md:hidden"
        aria-label="Primary"
      >
        {mobileNavItems.map((item, index) => {
          const active =
            item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <div key={item.href} className="contents">
              <Link
                href={item.href}
                className="suzi-m-bottom__item flex h-full flex-col items-center justify-center gap-[0.18rem] text-[0.66rem] font-semibold tracking-[0.04em]"
                data-active={active ? "true" : "false"}
                aria-current={active ? "page" : undefined}
              >
                <Icon path={item.icon} className="suzi-m-bottom__icon h-[1.45rem] w-[1.45rem] shrink-0" />
                <span>{item.label}</span>
              </Link>
              {index === 1 ? (
                <div ref={mobileCreateRef} className="suzi-m-create-wrap">
                  <button
                    type="button"
                    aria-label={t("shell.create")}
                    aria-expanded={isMobileCreateOpen}
                    onClick={() => {
                      setIsMobileCreateOpen((v) => !v);
                      setIsCreateOpen(false);
                      setIsMessagesOpen(false);
                      setIsNotificationsOpen(false);
                      setIsLanguageOpen(false);
                      setIsAccountOpen(false);
                    }}
                    className="suzi-m-create-btn"
                  >
                    <span className="suzi-m-create-btn__halo" aria-hidden="true" />
                    <Icon path="M12 5v14M5 12h14" className="relative h-6 w-6" />
                  </button>
                  {isMobileCreateOpen ? (
                    <div className="suzi-m-create-menu" data-open="true">
                      {createMenuItems.map((createItem) => (
                        <Link
                          key={createItem.href}
                          href={createItem.href}
                          onClick={() => setIsMobileCreateOpen(false)}
                          className="suzi-m-create-menu__item"
                        >
                          <span className="suzi-m-create-menu__icon">
                            <Icon path={createItem.icon} className="h-4.5 w-4.5" />
                          </span>
                          <span>{createItem.label}</span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </main>
  );
}

function LegalDialogPanel({
  dialog,
  title,
  closeLabel,
  onClose,
}: {
  dialog: LegalDialog;
  title: string;
  closeLabel: string;
  onClose: () => void;
}) {
  const doc = legalDocs[dialog];

  return (
    <div className="suzi-legal-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="suzi-legal-modal suzi-thin-scroll"
        role="dialog"
        aria-modal="true"
        aria-labelledby="suzi-legal-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 -mx-[var(--panel-pad)] -mt-[var(--panel-pad)] mb-3 flex items-center justify-between gap-3 border-b border-white/10 bg-[rgba(44,68,136,0.9)] px-[var(--panel-pad)] py-3 backdrop-blur-xl">
          <h2 id="suzi-legal-modal-title" className="text-[var(--fs-xl)] font-bold uppercase tracking-[0.18em] text-white">
            {title}
          </h2>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/14 bg-white/8 text-white/82 transition hover:bg-white/12 hover:text-white"
          >
            <Icon path="M6 6l12 12M18 6 6 18" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-[var(--fs-sm)] leading-relaxed text-cyan-50/84">
          {doc.sections.map((section, sectionIndex) => (
            <section key={sectionIndex} className="space-y-3">
              {section.heading ? (
                <h3 className="text-[var(--fs-md)] font-bold uppercase tracking-[0.14em] text-cyan-50">
                  {section.heading}
                </h3>
              ) : null}
              {section.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph}
                  className={cx(
                    paragraph.includes("@")
                      ? "font-semibold text-cyan-100"
                      : "text-cyan-50/84",
                  )}
                >
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="space-y-1.5 rounded-[0.85rem] border border-cyan-300/18 bg-[rgba(36,56,112,0.38)] px-4 py-3">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-300 shadow-[0_0_8px_rgba(255,32,121,0.45)]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
