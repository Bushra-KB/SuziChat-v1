"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AUTH_SESSION_STORAGE_KEY,
  AUTH_SESSION_UPDATED_EVENT,
  clearAuthSession,
  getStoredAuthSession,
  hydrateStoredSession,
  type AuthSession,
} from "@/lib/auth-client";

export function AdminAuthLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(() => getStoredAuthSession());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    void hydrateStoredSession()
      .then((nextSession) => {
        if (!nextSession) {
          router.replace("/login");
          return;
        }
        if (nextSession.user.role !== "ADMIN") {
          router.replace("/app");
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
    function pullSessionFromStorage() {
      const next = getStoredAuthSession();
      if (!next) {
        router.replace("/login");
        return;
      }
      if (next.user.role !== "ADMIN") {
        router.replace("/app");
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
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-slate-900">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-medium">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
            Loading admin dashboard...
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
