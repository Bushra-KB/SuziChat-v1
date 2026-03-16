"use client";

import { useEffect, useState } from "react";
import {
  clearAuthSession,
  getStoredAuthSession,
  hydrateStoredSession,
  type AuthSession,
} from "@/lib/auth-client";

export function AuthSessionStatus() {
  const [session, setSession] = useState<AuthSession | null>(() =>
    getStoredAuthSession(),
  );
  const [status, setStatus] = useState<"idle" | "loading" | "error">(() =>
    getStoredAuthSession() ? "loading" : "idle",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!session) {
      return;
    }

    void hydrateStoredSession()
      .then((nextSession) => {
        setSession(nextSession);
        setStatus("idle");
        setMessage("");
      })
      .catch((error: unknown) => {
        setSession(null);
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : "Session refresh failed.",
        );
      });
  }, [session]);

  if (!session && status === "idle") {
    return (
      <div className="rounded-[1.6rem] border border-white/14 bg-white/8 px-5 py-4 text-sm text-blue-100/72 backdrop-blur-md">
        No active preview session yet.
      </div>
    );
  }

  return (
    <div className="rounded-[1.6rem] border border-white/14 bg-white/8 px-5 py-4 backdrop-blur-md">
      <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/68">
        Session
      </p>
      {session ? (
        <>
          <p className="mt-2 text-lg font-semibold text-white">
            {session.user.username}
          </p>
          <p className="mt-1 text-sm text-blue-100/75">{session.user.email}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.3em] text-pink-100/70">
            Role: {session.user.role}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-blue-100/75">
          Saved session unavailable.
        </p>
      )}

      {status === "loading" ? (
        <p className="mt-3 text-sm text-cyan-100/75">Refreshing session...</p>
      ) : null}

      {status === "error" && message ? (
        <p className="mt-3 text-sm text-amber-100/85">{message}</p>
      ) : null}

      {session ? (
        <button
          type="button"
          onClick={() => {
            clearAuthSession();
            setSession(null);
            setStatus("idle");
            setMessage("");
          }}
          className="mt-4 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/16"
        >
          Clear local session
        </button>
      ) : null}
    </div>
  );
}
