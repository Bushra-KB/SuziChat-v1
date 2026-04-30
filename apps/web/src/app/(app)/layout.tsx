"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AUTH_SESSION_STORAGE_KEY,
  AUTH_SESSION_UPDATED_EVENT,
  clearAuthSession,
  getStoredAuthSession,
  hydrateStoredSession,
  type AuthSession,
} from "@/lib/auth-client";
import { AppShell } from "@/components/app/app-shell";

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

  /** Keep shell session in sync when profile/avatar is saved (same tab + other tabs). */
  useEffect(() => {
    function pullSessionFromStorage() {
      const next = getStoredAuthSession();
      if (!next) {
        router.replace("/login");
        return;
      }
      setSession(next);
    }

    function onStorage(event: StorageEvent) {
      if (event.key === AUTH_SESSION_STORAGE_KEY) {
        pullSessionFromStorage();
      }
    }

    window.addEventListener(AUTH_SESSION_UPDATED_EVENT, pullSessionFromStorage);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(AUTH_SESSION_UPDATED_EVENT, pullSessionFromStorage);
      window.removeEventListener("storage", onStorage);
    };
  }, [router]);

  if (!isReady || !session) {
    return (
      <main className="suzi-hybrid-bg relative flex min-h-screen items-center justify-center px-6 text-white">
        <div className="suzi-panel max-w-xl px-8 py-9 text-center">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-cyan-100/64">
            Protected Area
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            Loading your SuziChat workspace
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-300/76">
            We are validating your session and preparing the dashboard,
            messages, rooms, and social surfaces.
          </p>
        </div>
      </main>
    );
  }

  return (
    <AppShell
      pathname={pathname}
      session={session}
      onLogout={() => {
        clearAuthSession();
        router.push("/login");
      }}
    >
      {children}
    </AppShell>
  );
}
