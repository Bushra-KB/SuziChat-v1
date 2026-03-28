"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import type { AuthSession } from "@/lib/auth-client";
import { appNavItems, createMenuItems, mobileNavItems } from "@/lib/v1-mock-data";
import { Icon, cx } from "@/components/ui/suzi-primitives";

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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const createRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }

      if (createRef.current && !createRef.current.contains(target)) {
        setIsCreateOpen(false);
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

      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 lg:px-6">
        <div className="mx-auto flex max-w-[1680px] items-center gap-3 rounded-[1.6rem] border border-white/10 bg-[rgba(8,11,24,0.82)] px-3 py-3 shadow-[0_18px_40px_rgba(4,6,18,0.42)] backdrop-blur-2xl sm:px-4">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setIsMobileNavOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/78 transition hover:bg-white/10 lg:hidden"
          >
            <Icon path="M4 7h16M4 12h16M4 17h16" className="h-5 w-5" />
          </button>

          <Link
            href="/app"
            className="flex min-w-0 items-center gap-3 rounded-[1.2rem] border border-white/8 bg-white/5 px-3 py-2.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(232,77,255,0.96),rgba(82,213,255,0.9))] text-sm font-semibold tracking-[0.14em] text-slate-950">
              SC
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-base font-semibold tracking-tight text-white">
                SuziChat
              </p>
              <p className="truncate text-[0.64rem] uppercase tracking-[0.3em] text-slate-400">
                V1 Hybrid Modern
              </p>
            </div>
          </Link>

          <div className="relative hidden min-w-0 flex-1 md:block">
            <Icon
              path="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              className="suzi-input pl-11"
              placeholder="Search rooms, people, snaps, reels, or reports"
            />
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div ref={createRef} className="relative">
              <button
                type="button"
                onClick={() => setIsCreateOpen((current) => !current)}
                className="suzi-primary-btn inline-flex items-center gap-2 px-4 py-2.5 text-sm"
              >
                <Icon path="M12 5v14M5 12h14" className="h-4 w-4" />
                <span className="hidden sm:inline">Create</span>
              </button>

              {isCreateOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.7rem)] z-50 w-64 rounded-[1.4rem] border border-white/10 bg-[rgba(10,12,26,0.96)] p-2 shadow-[0_18px_40px_rgba(4,6,18,0.48)] backdrop-blur-xl">
                  {createMenuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsCreateOpen(false)}
                      className="flex items-center gap-3 rounded-[1rem] px-3 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/6 hover:text-white"
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

            <Link
              href="/app/notifications"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/78 transition hover:bg-white/10"
              aria-label="Notifications"
            >
              <Icon path="M15 17H5l2-2.5V10a5 5 0 1 1 10 0v4.5L19 17h-4ZM10 20a2 2 0 0 0 4 0" className="h-5 w-5" />
              <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-fuchsia-400 shadow-[0_0_10px_rgba(232,77,255,0.7)]" />
            </Link>

            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen((current) => !current)}
                className="inline-flex items-center gap-3 rounded-[1.1rem] border border-white/10 bg-white/5 px-2.5 py-2 text-left transition hover:bg-white/10 sm:px-3"
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
                  <p className="truncate text-xs text-slate-400">
                    @{session.user.username}
                  </p>
                </div>
                <Icon
                  path={isProfileOpen ? "M7 14l5-5 5 5" : "M7 10l5 5 5-5"}
                  className="hidden h-4 w-4 text-slate-400 sm:block"
                />
              </button>

              {isProfileOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.7rem)] z-50 w-72 rounded-[1.5rem] border border-white/10 bg-[rgba(10,12,26,0.98)] p-3 shadow-[0_18px_40px_rgba(4,6,18,0.48)] backdrop-blur-xl">
                  <div className="flex items-center gap-3 rounded-[1rem] border border-white/8 bg-white/5 p-3">
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
                      <p className="truncate text-xs text-slate-400">
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
                        className="flex items-center gap-3 rounded-[0.95rem] px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/6 hover:text-white"
                      >
                        <Icon path={item.icon} className="h-4 w-4 text-cyan-100" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>

                  <div className="my-3 h-px bg-white/8" />

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
      </header>

      <aside className="fixed bottom-4 left-4 top-[6.25rem] z-40 hidden w-[5.5rem] rounded-[1.8rem] border border-white/10 bg-[rgba(8,11,24,0.82)] p-3 shadow-[0_18px_40px_rgba(4,6,18,0.42)] backdrop-blur-xl lg:flex xl:w-[16.5rem] xl:flex-col">
        <nav className="flex w-full flex-col gap-2">
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
                    : "border-transparent text-slate-300 hover:border-white/8 hover:bg-white/5 hover:text-white",
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
                <span className="hidden xl:inline">{item.label}</span>
                {item.isSoon ? (
                  <span className="ml-auto hidden rounded-full border border-white/10 bg-white/6 px-2 py-0.5 text-[0.56rem] uppercase tracking-[0.24em] text-slate-400 xl:inline">
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
          <aside className="fixed inset-y-0 left-0 z-50 w-[88vw] max-w-sm border-r border-white/10 bg-[rgba(10,12,26,0.98)] p-4 shadow-[0_18px_40px_rgba(4,6,18,0.48)] backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-white">SuziChat</p>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                  Social + Rooms + Games
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/78"
              >
                <Icon path="M6 6l12 12M18 6 6 18" className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5">
              <input className="suzi-input" placeholder="Search SuziChat" />
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
                      : "border-white/8 bg-white/4 text-slate-200",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon path={item.icon} className="h-4 w-4" />
                    <span>{item.label}</span>
                  </span>
                  {item.isSoon ? (
                    <span className="rounded-full border border-white/10 bg-white/6 px-2 py-0.5 text-[0.56rem] uppercase tracking-[0.24em] text-slate-400">
                      Soon
                    </span>
                  ) : null}
                </Link>
              ))}
            </nav>
          </aside>
        </>
      ) : null}

      <div className="relative mx-auto max-w-[1680px] px-3 pb-28 pt-[6.2rem] sm:px-4 lg:pl-[6.9rem] lg:pr-4 xl:pl-[18.2rem]">
        {children}
      </div>

      <Link
        href="/app/rooms/create"
        className="suzi-primary-btn fixed bottom-24 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full lg:hidden"
        aria-label="Create"
      >
        <Icon path="M12 5v14M5 12h14" className="h-5 w-5" />
      </Link>

      <nav className="fixed inset-x-3 bottom-3 z-50 rounded-[1.4rem] border border-white/10 bg-[rgba(8,11,24,0.92)] px-2 py-2 shadow-[0_18px_40px_rgba(4,6,18,0.48)] backdrop-blur-2xl lg:hidden">
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
                    : "text-slate-400 hover:bg-white/5 hover:text-white",
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
