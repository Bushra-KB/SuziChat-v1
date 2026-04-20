"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { clearAuthSession, hydrateStoredSession } from "@/lib/auth-client";

export function AuthSessionRedirect({ to }: { to: string }) {
  const router = useRouter();

  useEffect(() => {
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
    };
  }, [router, to]);

  return null;
}
