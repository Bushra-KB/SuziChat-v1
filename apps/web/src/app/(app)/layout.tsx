"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  clearAuthSession,
  getStoredAuthSession,
  hydrateStoredSession,
  type AuthSession,
} from "@/lib/auth-client";

function NavIcon({ path }: { path: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

export default function ProtectedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(() =>
    getStoredAuthSession(),
  );
  const [isReady, setIsReady] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storedSession = getStoredAuthSession();

    if (!storedSession) {
      router.replace("/login");
      return;
    }

    void hydrateStoredSession()
      .then((nextSession) => {
        if (!nextSession) {
          router.replace("/login");
          return;
        }

        setSession(nextSession);
        setIsReady(true);
      })
      .catch(() => {
        clearAuthSession();
        router.replace("/login");
      });
  }, [router]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  if (!isReady || !session) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,108,214,0.22),_transparent_22%),radial-gradient(circle_at_15%_18%,_rgba(122,125,255,0.36),_transparent_28%),radial-gradient(circle_at_82%_18%,_rgba(86,208,255,0.16),_transparent_24%),linear-gradient(180deg,_#1b2aaa_0%,_#321f96_38%,_#22124b_100%)] px-6 py-10 text-white">
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.84)_0.65px,transparent_0.65px)] [background-size:24px_24px]" />
        <section className="relative mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center">
          <div className="rounded-[2rem] border border-white/16 bg-white/8 px-8 py-8 text-center shadow-[0_0_28px_rgba(78,102,255,0.22)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-100/70">
              Protected Area
            </p>
            <h1 className="mt-4 text-3xl font-semibold">
              Checking your session
            </h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-blue-100/78">
              We are validating your local auth session before opening the app
              area.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,108,214,0.24),_transparent_24%),radial-gradient(circle_at_14%_18%,_rgba(122,125,255,0.38),_transparent_30%),radial-gradient(circle_at_84%_18%,_rgba(86,208,255,0.16),_transparent_24%),linear-gradient(180deg,_#1b2aaa_0%,_#321f96_38%,_#22124b_100%)] px-6 py-8 text-white">
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.84)_0.65px,transparent_0.65px)] [background-size:24px_24px]" />
      <div className="absolute left-1/2 top-32 h-px w-[90%] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,168,243,0.95),transparent)] shadow-[0_0_22px_rgba(255,140,230,0.72)]" />

      <div className="relative mx-auto max-w-[1440px]">
        <div className="grid gap-4 xl:grid-cols-[auto_1fr_auto] xl:items-center">
          <Link
            href="/"
            className="w-fit rounded-[1.65rem] border border-pink-300/65 bg-[linear-gradient(180deg,rgba(231,97,255,0.68),rgba(111,47,255,0.5))] px-6 py-4 shadow-[0_0_36px_rgba(255,69,214,0.48),inset_0_0_18px_rgba(255,255,255,0.2)] backdrop-blur-xl"
          >
            <span className="text-3xl font-semibold tracking-tight text-white">
              Suzi Chat
            </span>
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-3 xl:px-6">
            {[
              {
                href: "/app",
                label: "Home",
                icon: "M3 11.5 12 4l9 7.5M6.5 10.5V20h11v-9.5",
              },
              {
                href: "/app/friends",
                label: "Friends",
                icon: "M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 11a3 3 0 1 0 0-6M21 21v-2a3 3 0 0 0-2-2.85",
              },
              {
                href: "/app/profile",
                label: "Profile",
                icon: "M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
              },
              {
                href: "/app/rooms",
                label: "Rooms",
                icon: "M4 7h16M4 12h10M4 17h13M18 10l3 2-3 2",
              },
            ].map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-md transition ${
                    isActive
                      ? "border-pink-300/45 bg-pink-400/18 text-white shadow-[0_0_22px_rgba(255,86,214,0.2)]"
                      : "border-white/16 bg-white/8 text-blue-100/80 hover:bg-white/12"
                  }`}
                >
                  <NavIcon path={item.icon} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div
            ref={profileMenuRef}
            className="relative flex justify-start xl:justify-end"
          >
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((current) => !current)}
              className="flex items-center gap-3 rounded-full border border-white/14 bg-white/8 px-3 py-2 text-left text-sm text-blue-100/78 backdrop-blur-md transition hover:bg-white/12"
            >
              <Image
                src="/ppic/ppic1.jpeg"
                alt="Profile picture"
                width={40}
                height={40}
                className="h-10 w-10 rounded-full border border-cyan-300/40 object-cover shadow-[0_0_14px_rgba(86,208,255,0.24)]"
              />
              <div className="hidden min-w-0 sm:block">
                <p className="truncate font-medium text-white">
                  {session.user.displayName || session.user.username}
                </p>
                <p className="truncate text-xs text-blue-100/60">
                  @{session.user.username}
                </p>
              </div>
              <span className="text-xs text-white/60">{isProfileMenuOpen ? "▲" : "▼"}</span>
            </button>

            {isProfileMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-64 rounded-[1.6rem] border border-white/14 bg-[linear-gradient(180deg,rgba(38,12,72,0.96),rgba(23,7,49,0.98))] p-3 shadow-[0_24px_48px_rgba(7,2,24,0.52),0_0_22px_rgba(99,84,255,0.12)] backdrop-blur-xl">
                <div className="flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/6 px-3 py-3">
                  <Image
                    src="/ppic/ppic1.jpeg"
                    alt="Profile picture"
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full border border-cyan-300/40 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">
                      {session.user.displayName || session.user.username}
                    </p>
                    <p className="truncate text-xs text-blue-100/60">
                      {session.user.email}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  {[
                    {
                      href: "/app/profile",
                      label: "Profile",
                      icon: "M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
                    },
                    {
                      href: "/app/friends",
                      label: "Friends",
                      icon: "M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 11a3 3 0 1 0 0-6M21 21v-2a3 3 0 0 0-2-2.85",
                    },
                    {
                      href: "/app/rooms",
                      label: "Rooms",
                      icon: "M4 7h16M4 12h10M4 17h13M18 10l3 2-3 2",
                    },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-[1rem] px-3 py-2.5 text-sm font-medium text-blue-100/80 transition hover:bg-white/8 hover:text-white"
                    >
                      <NavIcon path={item.icon} />
                      {item.label}
                    </Link>
                  ))}
                </div>

                <div className="my-3 h-px bg-white/10" />

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    clearAuthSession();
                    router.push("/login");
                  }}
                  className="block w-full rounded-[1rem] px-3 py-2.5 text-left text-sm font-medium text-pink-100 transition hover:bg-pink-400/12 hover:text-white"
                >
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
