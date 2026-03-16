"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  clearAuthSession,
  getStoredAuthSession,
  hydrateStoredSession,
  type AuthSession,
} from "@/lib/auth-client";

export default function ProtectedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(() =>
    getStoredAuthSession(),
  );
  const [isReady, setIsReady] = useState(false);

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

  if (!isReady || !session) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,108,214,0.26),_transparent_24%),radial-gradient(circle_at_15%_20%,_rgba(122,125,255,0.42),_transparent_30%),radial-gradient(circle_at_82%_18%,_rgba(86,208,255,0.18),_transparent_26%),linear-gradient(180deg,_#1b2aaa_0%,_#321f96_38%,_#22124b_100%)] px-6 py-10 text-white">
        <section className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center">
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
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,108,214,0.26),_transparent_24%),radial-gradient(circle_at_15%_20%,_rgba(122,125,255,0.42),_transparent_30%),radial-gradient(circle_at_82%_18%,_rgba(86,208,255,0.18),_transparent_26%),linear-gradient(180deg,_#1b2aaa_0%,_#321f96_38%,_#22124b_100%)] px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-[1.65rem] border border-pink-300/65 bg-[linear-gradient(180deg,rgba(231,97,255,0.68),rgba(111,47,255,0.5))] px-6 py-4 shadow-[0_0_36px_rgba(255,69,214,0.48),inset_0_0_18px_rgba(255,255,255,0.2)] backdrop-blur-xl"
          >
            <span className="text-3xl font-semibold tracking-tight text-white">
              Suzi Chat
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-3 rounded-full border border-white/14 bg-white/8 px-4 py-2 text-sm text-blue-100/78 backdrop-blur-md">
            <span className="font-medium text-white">{session.user.username}</span>
            <span className="text-white/45">•</span>
            <span>{session.user.email}</span>
            <button
              type="button"
              onClick={() => {
                clearAuthSession();
                router.push("/login");
              }}
              className="rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/16"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
