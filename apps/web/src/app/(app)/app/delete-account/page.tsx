"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Panel, cx } from "@/components/ui/suzi-primitives";
import { clearAuthSession, getStoredAuthSession } from "@/lib/auth-client";
import { deleteMyAccount } from "@/lib/profile-client";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getStoredAuthSession();
    setUsername(session?.user.username ?? null);
  }, []);

  const canDelete =
    !!username && confirmText.trim() === username && !busy;

  async function handleDelete() {
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      router.replace("/login");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await deleteMyAccount(session.accessToken);
      clearAuthSession();
      router.replace("/?deleted=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete account.");
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <Panel className="p-5 sm:p-7">
        <h1 className="text-2xl font-semibold text-white">Delete your account</h1>
        <p className="mt-3 text-sm leading-6 text-cyan-100/80">
          This permanently deletes your Suzi Chat account and everything tied to it —
          your profile, messages, posts (reels &amp; snaps), dating profile and matches,
          rooms you own, game history, friends, and notifications.{" "}
          <span className="font-semibold text-rose-200">This cannot be undone.</span>
        </p>
        <p className="mt-4 text-sm text-cyan-100/80">
          To confirm, type your username{" "}
          <span className="font-semibold text-white">
            {username ? `@${username}` : "…"}
          </span>{" "}
          below.
        </p>
        <input
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder={username ?? "your username"}
          className="suzi-input mt-3"
          autoComplete="off"
          spellCheck={false}
        />
        {error ? (
          <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-500/12 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Link href="/app" className="suzi-secondary-btn px-4 py-2 text-sm">
            Cancel
          </Link>
          <button
            type="button"
            disabled={!canDelete}
            onClick={() => void handleDelete()}
            className={cx(
              "rounded-full px-4 py-2 text-sm font-bold text-white transition",
              canDelete
                ? "bg-rose-600 hover:bg-rose-500"
                : "cursor-not-allowed bg-white/12 opacity-60",
            )}
          >
            {busy ? "Deleting…" : "Permanently delete account"}
          </button>
        </div>
      </Panel>
    </section>
  );
}
