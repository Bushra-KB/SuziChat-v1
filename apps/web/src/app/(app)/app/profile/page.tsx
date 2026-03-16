"use client";

import { useEffect, useState } from "react";
import { getStoredAuthSession, type AuthSession } from "@/lib/auth-client";
import { getMyProfile, updateMyProfile } from "@/lib/profile-client";

type ProfileState = {
  displayName: string;
  bio: string;
  country: string;
};

export default function AppProfilePage() {
  const [session] = useState<AuthSession | null>(() => getStoredAuthSession());
  const [form, setForm] = useState<ProfileState>({
    displayName: "",
    bio: "",
    country: "",
  });
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "error">(() =>
    session ? "loading" : "error",
  );
  const [message, setMessage] = useState(() =>
    session ? "" : "No active session found.",
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    void getMyProfile(session.accessToken)
      .then((profile) => {
        setForm({
          displayName: profile.displayName ?? "",
          bio: profile.bio ?? "",
          country: profile.country ?? "",
        });
        setStatus("idle");
      })
      .catch((error: unknown) => {
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : "Could not load profile.",
        );
      });
  }, [session]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      setStatus("error");
      setMessage("No active session found.");
      return;
    }

    setStatus("saving");
    setMessage("");

    try {
      const profile = await updateMyProfile(session.accessToken, {
        displayName: form.displayName,
        bio: form.bio,
        country: form.country,
      });
      setForm({
        displayName: profile.displayName ?? "",
        bio: profile.bio ?? "",
        country: profile.country ?? "",
      });
      setStatus("idle");
      setMessage("Profile updated.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Profile update failed.",
      );
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(88,70,255,0.34),rgba(57,24,121,0.38))] p-6 shadow-[0_0_30px_rgba(117,84,255,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.35em] text-pink-100/78">
          Profile
        </p>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
          Personalize your presence
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-blue-100/78">
          This is the first user profile foundation for the protected app. It
          stores a display name, short bio, and country through the shared API.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="profile-display-name"
              className="text-xs uppercase tracking-[0.28em] text-cyan-100/70"
            >
              Display name
            </label>
            <input
              id="profile-display-name"
              type="text"
              value={form.displayName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
              placeholder="How your name should appear"
              className="mt-2 w-full rounded-[1.35rem] border border-white/15 bg-white/10 px-4 py-3 text-white outline-none backdrop-blur-md placeholder:text-blue-100/45"
            />
          </div>

          <div>
            <label
              htmlFor="profile-country"
              className="text-xs uppercase tracking-[0.28em] text-cyan-100/70"
            >
              Country
            </label>
            <input
              id="profile-country"
              type="text"
              value={form.country}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  country: event.target.value,
                }))
              }
              placeholder="Where you are based"
              className="mt-2 w-full rounded-[1.35rem] border border-white/15 bg-white/10 px-4 py-3 text-white outline-none backdrop-blur-md placeholder:text-blue-100/45"
            />
          </div>

          <div>
            <label
              htmlFor="profile-bio"
              className="text-xs uppercase tracking-[0.28em] text-cyan-100/70"
            >
              Bio
            </label>
            <textarea
              id="profile-bio"
              rows={5}
              value={form.bio}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  bio: event.target.value,
                }))
              }
              placeholder="Tell people a little about yourself"
              className="mt-2 w-full rounded-[1.35rem] border border-white/15 bg-white/10 px-4 py-3 text-white outline-none backdrop-blur-md placeholder:text-blue-100/45"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full border border-pink-300/45 bg-[linear-gradient(90deg,rgba(246,94,219,0.8),rgba(114,76,255,0.85))] px-5 py-3 text-base font-semibold text-white shadow-[0_0_28px_rgba(255,86,214,0.28)] transition hover:brightness-110"
          >
            {status === "saving" ? "Saving profile..." : "Save profile"}
          </button>
        </form>

        {message ? (
          <p
            className={`mt-5 text-sm ${
              status === "error" ? "text-amber-100/90" : "text-cyan-100/85"
            }`}
          >
            {message}
          </p>
        ) : null}
      </div>

      <aside className="rounded-[2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(255,94,214,0.2),rgba(79,40,149,0.32))] p-6 shadow-[0_0_28px_rgba(255,86,214,0.22),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl">
        <p className="text-sm font-medium uppercase tracking-[0.35em] text-cyan-100/78">
          Profile Preview
        </p>
        <div className="mt-6 rounded-[1.5rem] border border-white/14 bg-white/8 p-5 backdrop-blur-md">
          <p className="text-2xl font-semibold text-white">
            {form.displayName || "Display name"}
          </p>
          <p className="mt-2 text-sm text-blue-100/72">
            {form.country || "No country set yet"}
          </p>
          <p className="mt-5 text-sm leading-7 text-blue-100/78">
            {form.bio || "Your profile bio will appear here once you add it."}
          </p>
        </div>
      </aside>
    </section>
  );
}
