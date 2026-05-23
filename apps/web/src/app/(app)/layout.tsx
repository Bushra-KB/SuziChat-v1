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
import { LocalizationProvider } from "@/lib/i18n";

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
        if (nextSession.user.role === "ADMIN") {
          router.replace("/app/admin");
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
      if (next.user.role === "ADMIN") {
        router.replace("/app/admin");
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
      <main className="suzi-hybrid-bg relative flex h-[100dvh] min-h-0 items-center justify-center overflow-hidden px-6 text-white">
        <div className="inline-flex items-center gap-3 rounded-full border border-cyan-300/18 bg-[rgba(12,16,38,0.58)] px-4 py-2.5 shadow-[0_0_24px_rgba(0,229,255,0.12)] backdrop-blur-md">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-100/25 border-t-cyan-100" />
          <span className="text-sm font-medium text-cyan-50/88">
            Loading SuziChat...
          </span>
        </div>
      </main>
    );
  }

  return (
    <LocalizationProvider>
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
    </LocalizationProvider>
  );
}
