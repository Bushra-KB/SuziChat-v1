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
  const inboxBadgeCount = shellThreads.length;
  const unreadNotifications = shellNotifications.filter((n) => !n.read).length;
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

  return (
    <main className="suzi-hybrid-bg relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0 opacity-12 [background-image:radial-gradient(rgba(255,255,255,0.6)_0.7px,transparent_0.7px)] [background-size:28px_28px]" />
      <div className="absolute left-[-8%] top-[-6%] h-[34rem] w-[34rem] rounded-full bg-sky-300/14 blur-[150px]" />
      <div className="absolute right-[-5%] top-[8%] h-[28rem] w-[28rem] rounded-full bg-blue-400/10 blur-[130px]" />
      <div className="absolute bottom-[-8%] left-[18%] h-[26rem] w-[26rem] rounded-full bg-indigo-500/14 blur-[140px]" />
      <div className="suzi-bottom-stars" aria-hidden="true">
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

      <div className="relative mx-auto w-full max-w-[1460px] px-3 pb-10 pt-6 sm:px-4 lg:px-5">
        <div className="pointer-events-auto absolute left-1/2 top-3 z-40 -translate-x-1/2 sm:top-3.5 lg:top-4">
          <Link href="/app" className="block">
            <span className="relative block h-[3rem] w-[9.8rem] overflow-hidden xs:h-[3.4rem] xs:w-[11.2rem] sm:h-[4.4rem] sm:w-[14.4rem] md:h-[5.3rem] md:w-[17.6rem] lg:h-[6rem] lg:w-[19.8rem]">
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
        </div>

        <div className="pointer-events-auto absolute right-3 top-4 z-40 flex items-center gap-2 rounded-[1.1rem] border border-white/10 bg-[linear-gradient(140deg,rgba(15,13,43,0.76),rgba(34,18,79,0.56))] px-2 py-2 backdrop-blur-md sm:right-4 lg:right-5">
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
                        onClick={() => setIsMessagesOpen(false)}
                        className="flex items-center gap-3 rounded-[0.9rem] px-3 py-2.5 transition hover:bg-white/8"
                      >
                        <Image
                          src="/ppic/ppic1.jpeg"
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
                <div className="max-h-[min(22rem,calc(100vh-8rem))] space-y-1 overflow-y-auto suzi-scrollbar pr-1">
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
                src="/ppic/ppic1.jpeg"
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
                <Link
                  href="/app/settings"
                  onClick={() => setIsAccountOpen(false)}
                  className="flex items-center gap-2 rounded-[0.85rem] px-3 py-2.5 text-sm text-[var(--text-muted)] transition hover:bg-white/8 hover:text-white"
                >
                  <Icon path="M12 3v3M12 18v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M3 12h3M18 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8" className="h-4 w-4 text-cyan-100" />
                  <span>Settings</span>
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

        <div className="pt-[6.1rem] sm:pt-[6.7rem] md:pt-[7.2rem]">{children}</div>

        <footer className="mt-8 pb-3">
          <div className="h-px w-full bg-[linear-gradient(90deg,rgba(165,243,252,0.06),rgba(165,243,252,0.72),rgba(165,243,252,0.06))]" />
          <p className="mt-3 text-center text-[0.9rem] font-medium tracking-[0.12em] text-cyan-100/82">
            © Suzi Chat. All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}
