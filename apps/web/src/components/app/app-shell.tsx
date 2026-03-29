"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import type { AuthSession } from "@/lib/auth-client";
import {
  appNavItems,
  createMenuItems,
  directMessageThreads,
  mobileNavItems,
  notifications,
} from "@/lib/v1-mock-data";
import { Icon, cx } from "@/components/ui/suzi-primitives";
import { ModeToggle } from "@/components/mode-toggle";

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const createRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const unreadMessages = directMessageThreads.reduce((total, thread) => total + thread.unread, 0);
  const unreadNotifications = notifications.filter((item) => item.unread).length;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }

      if (createRef.current && !createRef.current.contains(target)) {
        setIsCreateOpen(false);
      }

      if (messagesRef.current && !messagesRef.current.contains(target)) {
        setIsMessagesOpen(false);
      }

      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  return (
    <main className="suzi-hybrid-bg relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.6)_0.7px,transparent_0.7px)] [background-size:28px_28px]" />
      <div className="absolute left-0 top-0 h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/10 blur-[140px]" />
      <div className="absolute bottom-0 right-0 h-[24rem] w-[24rem] rounded-full bg-cyan-400/10 blur-[120px]" />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/8 bg-[rgba(8,11,24,0.94)] shadow-[0_14px_34px_rgba(4,6,18,0.32)] backdrop-blur-2xl">
        <div className="flex min-h-[5.95rem] items-center">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setIsMobileNavOpen(true)}
            className="suzi-icon-btn ml-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl text-white/78 sm:ml-4 lg:hidden"
          >
            <Icon path="M4 7h16M4 12h16M4 17h16" className="h-5 w-5" />
          </button>

          <div className="hidden h-[5.95rem] shrink-0 items-center border-r border-white/8 px-4 lg:flex lg:w-[15.5rem]">
            <Link href="/app" className="flex items-center">
              <span className="relative block h-[3.5rem] w-[10.8rem] overflow-hidden rounded-[1.15rem]">
                <Image
                  src="/logo/logo.png"
                  alt="SuziChat"
                  width={1536}
                  height={1024}
                  priority
                  className="absolute left-1/2 top-1/2 h-[170%] w-auto max-w-none -translate-x-1/2 -translate-y-[52%] drop-shadow-[0_0_16px_rgba(232,77,255,0.22)]"
                />
              </span>
            </Link>
          </div>

          <Link href="/app" className="ml-3 flex items-center lg:hidden sm:ml-4">
            <span className="relative block h-[3.1rem] w-[9.75rem] overflow-hidden rounded-[1rem]">
              <Image
                src="/logo/logo.png"
                alt="SuziChat"
                width={1536}
                height={1024}
                priority
                className="absolute left-1/2 top-1/2 h-[170%] w-auto max-w-none -translate-x-1/2 -translate-y-[52%] drop-shadow-[0_0_14px_rgba(232,77,255,0.18)]"
              />
            </span>
          </Link>

          <div className="flex min-w-0 flex-1 items-center gap-3 px-3 sm:px-4 lg:px-5">
            <div className="relative hidden min-w-0 flex-1 md:block">
              <Icon
                path="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                className="pointer-events-none absolute left-[1.125rem] top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]"
              />
              <input
                className="suzi-input suzi-search-input"
                placeholder="Search rooms, people, snaps, reels, or reports"
              />
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <ModeToggle className="hidden md:block" />

              <div ref={createRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen((current) => !current);
                    setIsMessagesOpen(false);
                    setIsNotificationsOpen(false);
                    setIsProfileOpen(false);
                  }}
                  className="suzi-primary-btn inline-flex items-center gap-2 px-4 py-2.5 text-sm"
                >
                  <Icon path="M12 5v14M5 12h14" className="h-4 w-4" />
                  <span className="hidden sm:inline">Create</span>
                </button>

                {isCreateOpen ? (
                  <div className="suzi-overlay-panel absolute right-0 top-[calc(100%+0.7rem)] z-50 w-64 rounded-[1.4rem] p-2">
                    {createMenuItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsCreateOpen(false)}
                        className="flex items-center gap-3 rounded-[1rem] px-3 py-3 text-sm font-medium text-[var(--text-muted)] transition hover:bg-white/6 hover:text-white"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-cyan-100">
                          <Icon path={item.icon} />
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>

              <div ref={messagesRef} className="relative">
                <button
                  type="button"
                  aria-label="Unread messages"
                  onClick={() => {
                    setIsMessagesOpen((current) => !current);
                    setIsNotificationsOpen(false);
                    setIsCreateOpen(false);
                    setIsProfileOpen(false);
                  }}
                  className="suzi-icon-btn relative inline-flex h-11 w-11 items-center justify-center rounded-2xl text-white/78"
                >
                  <Icon path="M4 6h16v10H7l-3 3V6Z" className="h-5 w-5" />
                  {unreadMessages > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-fuchsia-500 px-1.5 text-[0.62rem] font-semibold leading-none text-white shadow-[0_0_12px_rgba(232,77,255,0.65)]">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  ) : null}
                </button>

                {isMessagesOpen ? (
                  <div className="suzi-overlay-panel absolute right-0 top-[calc(100%+0.7rem)] z-50 w-[22rem] rounded-[1.4rem] p-2">
                    <div className="flex items-center justify-between px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-white">Messages</p>
                        <p className="text-xs text-[var(--text-soft)]">Recent unread conversations</p>
                      </div>
                      <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-fuchsia-100">
                        {unreadMessages}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {directMessageThreads.map((thread) => (
                        <Link
                          key={thread.id}
                          href={`/app/messages/${thread.id}`}
                          onClick={() => setIsMessagesOpen(false)}
                          className="flex items-start gap-3 rounded-[1rem] px-3 py-3 transition hover:bg-white/6"
                        >
                          <Image
                            src={thread.person.avatar}
                            alt={thread.person.name}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-full border border-white/10 object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-sm font-medium text-white">{thread.person.name}</p>
                              <span className="shrink-0 text-[0.68rem] text-[var(--text-soft)]">{thread.time}</span>
                            </div>
                            <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{thread.preview}</p>
                          </div>
                          {thread.unread > 0 ? (
                            <span className="mt-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-fuchsia-500 px-1.5 text-[0.62rem] font-semibold leading-none text-white">
                              {thread.unread}
                            </span>
                          ) : null}
                        </Link>
                      ))}
                    </div>

                    <div className="mt-2 border-t border-[var(--border-soft)] px-3 pt-2">
                      <Link
                        href="/app/messages"
                        onClick={() => setIsMessagesOpen(false)}
                        className="inline-flex items-center gap-2 text-sm font-medium text-cyan-100 transition hover:text-white"
                      >
                        <span>Open inbox</span>
                        <Icon path="M9 5l7 7-7 7" className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>

              <div ref={notificationsRef} className="relative">
                <button
                  type="button"
                  aria-label="Notifications"
                  onClick={() => {
                    setIsNotificationsOpen((current) => !current);
                    setIsMessagesOpen(false);
                    setIsCreateOpen(false);
                    setIsProfileOpen(false);
                  }}
                  className="suzi-icon-btn relative inline-flex h-11 w-11 items-center justify-center rounded-2xl text-white/78"
                >
                  <Icon path="M15 17H5l2-2.5V10a5 5 0 1 1 10 0v4.5L19 17h-4ZM10 20a2 2 0 0 0 4 0" className="h-5 w-5" />
                  {unreadNotifications > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-fuchsia-500 px-1.5 text-[0.62rem] font-semibold leading-none text-white shadow-[0_0_12px_rgba(232,77,255,0.65)]">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  ) : null}
                </button>

                {isNotificationsOpen ? (
                  <div className="suzi-overlay-panel absolute right-0 top-[calc(100%+0.7rem)] z-50 w-[23rem] rounded-[1.4rem] p-2">
                    <div className="flex items-center justify-between px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-white">Notifications</p>
                        <p className="text-xs text-[var(--text-soft)]">Recent updates across SuziChat</p>
                      </div>
                      <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-fuchsia-100">
                        {unreadNotifications}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {notifications.map((item) => (
                        <Link
                          key={item.id}
                          href="/app/notifications"
                          onClick={() => setIsNotificationsOpen(false)}
                          className="flex items-start gap-3 rounded-[1rem] px-3 py-3 transition hover:bg-white/6"
                        >
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-cyan-100">
                            <Icon
                              path={
                                item.type === "New Message"
                                  ? "M4 6h16v10H7l-3 3V6Z"
                                  : item.type === "Friend Request"
                                    ? "M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"
                                    : item.type === "Dating Match"
                                      ? "M12 21s-7-4.35-7-11a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 6.65-7 11-7 11Z"
                                      : "M5 5h14v14H5z"
                              }
                              className="h-4 w-4"
                            />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-sm font-medium text-white">{item.title}</p>
                              <span className="shrink-0 text-[0.68rem] text-[var(--text-soft)]">{item.time}</span>
                            </div>
                            <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-cyan-100/85">
                              {item.type}
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">{item.copy}</p>
                          </div>
                          {item.unread ? (
                            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-fuchsia-400 shadow-[0_0_10px_rgba(232,77,255,0.7)]" />
                          ) : null}
                        </Link>
                      ))}
                    </div>

                    <div className="mt-2 border-t border-[var(--border-soft)] px-3 pt-2">
                      <Link
                        href="/app/notifications"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="inline-flex items-center gap-2 text-sm font-medium text-cyan-100 transition hover:text-white"
                      >
                        <span>Open notifications</span>
                        <Icon path="M9 5l7 7-7 7" className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>

              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen((current) => !current);
                    setIsCreateOpen(false);
                    setIsMessagesOpen(false);
                    setIsNotificationsOpen(false);
                  }}
                  className="inline-flex items-center gap-3 rounded-[1.1rem] border border-[var(--border-soft)] bg-white/5 px-2.5 py-2 text-left transition hover:bg-white/10 sm:px-3"
                >
                  <Image
                    src="/ppic/ppic1.jpeg"
                    alt="Profile picture"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full border border-white/10 object-cover"
                  />
                  <div className="hidden min-w-0 lg:block">
                    <p className="truncate text-sm font-medium text-white">
                      {session.user.displayName || session.user.username}
                    </p>
                    <p className="truncate text-xs text-[var(--text-soft)]">
                      @{session.user.username}
                    </p>
                  </div>
                  <Icon
                    path={isProfileOpen ? "M7 14l5-5 5 5" : "M7 10l5 5 5-5"}
                    className="hidden h-4 w-4 text-[var(--text-soft)] sm:block"
                  />
                </button>

                {isProfileOpen ? (
                  <div className="suzi-overlay-panel absolute right-0 top-[calc(100%+0.7rem)] z-50 w-72 rounded-[1.5rem] p-3">
                    <div className="flex items-center gap-3 rounded-[1rem] border border-[var(--border-soft)] bg-white/5 p-3">
                      <Image
                        src="/ppic/ppic1.jpeg"
                        alt="Profile picture"
                        width={44}
                        height={44}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">
                          {session.user.displayName || session.user.username}
                        </p>
                        <p className="truncate text-xs text-[var(--text-soft)]">
                          {session.user.email}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      {[
                        { href: "/app/profile", label: "Account", icon: "M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" },
                        { href: "/app/notifications", label: "Notifications", icon: "M15 17H5l2-2.5V10a5 5 0 1 1 10 0v4.5L19 17h-4ZM10 20a2 2 0 0 0 4 0" },
                        { href: "/app/settings", label: "Settings", icon: "M12 3v3M12 18v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M3 12h3M18 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8" },
                        ...(session.user.role === "ADMIN"
                          ? [{ href: "/app/admin", label: "Admin", icon: "M4 5h16v14H4zM8 9h8M8 13h4" }]
                          : []),
                      ].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 rounded-[0.95rem] px-3 py-2.5 text-sm font-medium text-[var(--text-muted)] transition hover:bg-white/6 hover:text-white"
                        >
                          <Icon path={item.icon} className="h-4 w-4 text-cyan-100" />
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </div>

                    <div className="my-3 h-px bg-[var(--border-soft)]" />

                    <button
                      type="button"
                      onClick={onLogout}
                      className="flex w-full items-center gap-3 rounded-[0.95rem] px-3 py-2.5 text-left text-sm font-medium text-pink-100 transition hover:bg-pink-400/10 hover:text-white"
                    >
                      <Icon path="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" className="h-4 w-4" />
                      <span>Log out</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 top-[5.95rem] z-40 hidden w-[15.5rem] border-r border-white/8 bg-[rgba(9,12,26,0.9)] backdrop-blur-2xl lg:flex lg:flex-col">
        <nav className="flex w-full flex-col gap-2 px-4 py-4">
          {appNavItems.map((item) => {
            const active = isActive(pathname, item.href, item.exact);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "group flex items-center gap-3 rounded-[1rem] border px-3 py-3 text-sm font-medium transition",
                  active
                    ? "border-fuchsia-400/20 bg-fuchsia-400/12 text-white"
                    : "border-transparent text-[var(--text-muted)] hover:border-[var(--border-soft)] hover:bg-white/5 hover:text-white",
                )}
              >
                <span
                  className={cx(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    active ? "bg-fuchsia-400/16 text-fuchsia-100" : "bg-white/5",
                  )}
                >
                  <Icon path={item.icon} className="h-4 w-4" />
                </span>
                <span>{item.label}</span>
                {item.isSoon ? (
                  <span className="ml-auto rounded-full border border-white/10 bg-white/6 px-2 py-0.5 text-[0.56rem] uppercase tracking-[0.24em] text-[var(--text-soft)]">
                    Soon
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      {isMobileNavOpen ? (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsMobileNavOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          />
          <aside className="suzi-overlay-panel fixed inset-y-0 left-0 z-50 w-[88vw] max-w-sm rounded-none border-r p-4 lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <Link href="/app" onClick={() => setIsMobileNavOpen(false)}>
                <Image
                  src="/logo/logo.png"
                  alt="SuziChat"
                  width={1536}
                  height={1024}
                  priority
                  className="h-[3.15rem] w-auto max-w-none"
                />
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                className="suzi-icon-btn inline-flex h-11 w-11 items-center justify-center rounded-2xl text-white/78"
              >
                <Icon path="M6 6l12 12M18 6 6 18" className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5">
              <input className="suzi-input" placeholder="Search SuziChat" />
            </div>

            <div className="mt-3">
              <ModeToggle fullWidth />
            </div>

            <nav className="mt-5 space-y-2">
              {appNavItems.map((item) => (
                <Link
                  key={`mobile-${item.href}`}
                  href={item.href}
                  onClick={() => setIsMobileNavOpen(false)}
                  className={cx(
                    "flex items-center justify-between rounded-[1rem] border px-4 py-3 text-sm font-medium",
                    isActive(pathname, item.href, item.exact)
                      ? "border-fuchsia-400/20 bg-fuchsia-400/12 text-white"
                      : "border-[var(--border-soft)] bg-white/4 text-[var(--text-muted)]",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon path={item.icon} className="h-4 w-4" />
                    <span>{item.label}</span>
                  </span>
                  {item.isSoon ? (
                    <span className="rounded-full border border-white/10 bg-white/6 px-2 py-0.5 text-[0.56rem] uppercase tracking-[0.24em] text-[var(--text-soft)]">
                      Soon
                    </span>
                  ) : null}
                </Link>
              ))}
            </nav>
          </aside>
        </>
      ) : null}

      <div className="relative px-3 pb-28 pt-[6.75rem] sm:px-4 lg:ml-[15.5rem] lg:px-5">
        {children}
      </div>

      <Link
        href="/app/rooms/create"
        className="suzi-primary-btn fixed bottom-24 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full lg:hidden"
        aria-label="Create"
      >
        <Icon path="M12 5v14M5 12h14" className="h-5 w-5" />
      </Link>

      <nav className="suzi-shell-panel fixed inset-x-3 bottom-3 z-50 rounded-[1.4rem] px-2 py-2 lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobileNavItems.map((item) => {
            const active = isActive(pathname, item.href, item.exact);

            return (
              <Link
                key={`bottom-${item.href}`}
                href={item.href}
                className={cx(
                  "flex flex-col items-center gap-1 rounded-[1rem] px-2 py-2 text-[0.63rem] font-medium uppercase tracking-[0.18em] transition",
                  active
                    ? "bg-fuchsia-400/12 text-white"
                    : "text-[var(--text-soft)] hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon path={item.icon} className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
