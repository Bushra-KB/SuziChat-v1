"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { clearAuthSession, hydrateStoredSession } from "@/lib/auth-client";

export function AuthSessionRedirect({ to }: { to: string }) {
  const router = useRouter();

  useEffect(() => {
    // If a user navigates from the locked app shell to auth routes,
    // ensure shell scroll locks are removed so auth uses a single page scrollbar.
    document.documentElement.classList.remove("suzi-app-frame-lock");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    let cancelled = false;

    void hydrateStoredSession()
      .then((session) => {
        if (cancelled || !session) {
          return;
        }
        router.replace(to);
      })
      .catch(() => {
        if (!cancelled) {
          clearAuthSession();
        }
      });

    return () => {
      cancelled = true;
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [router, to]);

  return null;
}
