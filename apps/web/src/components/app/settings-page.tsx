"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Chip, Panel, SectionHeader, cx } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import {
  getMyProfile,
  parseUsersApiError,
  updateMyProfile,
} from "@/lib/users-client";
import { settingsSections } from "@/lib/v1-mock-data";

const SETTINGS_NAV = [
  { id: "account", label: "Account" },
  { id: "privacy", label: "Privacy" },
  { id: "social", label: "Social" },
  { id: "appearance", label: "Appearance" },
  { id: "notifications", label: "Notifications" },
  { id: "language", label: "Language" },
] as const;

type SectionId = (typeof SETTINGS_NAV)[number]["id"];

export function SettingsPageClient() {
  const [active, setActive] = useState<SectionId>("privacy");
  const [form, setForm] = useState({ displayName: "", bio: "", country: "", avatarUrl: "" });
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (active !== "account") {
      return;
    }
    const session = getStoredAuthSession();
    if (!session) {
      setLoadState("error");
      setMessage("Not signed in.");
      return;
    }
    let cancelled = false;
    setLoadState("loading");
    setMessage("");
    void getMyProfile(session.accessToken)
      .then((profile) => {
        if (cancelled) {
          return;
        }
        setForm({
          displayName: profile.displayName ?? "",
          bio: profile.bio ?? "",
          country: profile.country ?? "",
          avatarUrl: profile.avatarUrl ?? "",
        });
        setLoadState("ready");
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadState("error");
          setMessage(parseUsersApiError(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  async function handleSaveAccountProfile(event: React.FormEvent) {
    event.preventDefault();
    const session = getStoredAuthSession();
    if (!session) {
      setSaveState("error");
      setMessage("Not signed in.");
      return;
    }
    setSaveState("saving");
    setMessage("");
    try {
      await updateMyProfile(session.accessToken, {
        displayName: form.displayName.trim() || undefined,
        bio: form.bio.trim() || undefined,
        country: form.country.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
      });
      setSaveState("success");
      setMessage("Account profile saved.");
    } catch (e: unknown) {
      setSaveState("error");
      setMessage(parseUsersApiError(e));
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
      <Panel className="p-4">
        <nav className="space-y-2" aria-label="Settings sections">
          {SETTINGS_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item.id)}
              className={cx(
                "flex w-full items-center rounded-[1rem] px-4 py-3 text-left text-sm font-medium transition",
                active === item.id
                  ? "border border-fuchsia-300/25 bg-fuchsia-400/14 text-white shadow-[0_0_18px_rgba(232,77,255,0.14)]"
                  : "border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/6 hover:text-white",
              )}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </Panel>

      <Panel className="p-6 sm:p-7">
        <SectionHeader
          eyebrow="Settings"
          title={
            active === "account"
              ? "Account & login"
              : active === "privacy"
                ? "Privacy, safety, appearance, and language"
                : `${SETTINGS_NAV.find((n) => n.id === active)?.label ?? "Preferences"}`
          }
          copy={
            active === "account"
              ? "Identity is managed from your profile. Use quick links below."
              : "Toggle rows are local UI state for now — persist to API in a later pass."
          }
          action={
            <Link href="/app/profile" className="suzi-secondary-btn shrink-0 px-4 py-2.5 text-sm">
              Edit profile
            </Link>
          }
        />

        {active === "account" ? (
          <div className="mt-8 space-y-5 rounded-[1.15rem] border border-white/10 bg-white/5 p-5">
            {loadState === "loading" ? <p className="text-sm text-[var(--text-muted)]">Loading account profile…</p> : null}
            {loadState === "error" ? <p className="text-sm text-amber-100">{message || "Could not load profile."}</p> : null}
            <form onSubmit={handleSaveAccountProfile} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/62">
                  Profile image URL
                </label>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    className="suzi-input"
                    value={form.avatarUrl}
                    onChange={(event) => setForm((prev) => ({ ...prev, avatarUrl: event.target.value }))}
                    placeholder="https://example.com/avatar.jpg or data:image/..."
                    maxLength={4_000_000}
                  />
                  <label className="suzi-secondary-btn cursor-pointer px-4 py-3 text-sm">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (!file) {
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          const result = String(reader.result ?? "");
                          setForm((prev) => ({ ...prev, avatarUrl: result }));
                        };
                        reader.readAsDataURL(file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
                {form.avatarUrl ? (
                  <div className="mt-3 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.avatarUrl} alt="Profile preview" className="h-12 w-12 rounded-full border border-white/15 object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, avatarUrl: "" }))}
                      className="suzi-secondary-btn px-3 py-2 text-xs"
                    >
                      Remove image
                    </button>
                  </div>
                ) : null}
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/62">
                  Display name
                </label>
                <input
                  className="suzi-input"
                  value={form.displayName}
                  onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
                  maxLength={40}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/62">
                  Bio
                </label>
                <textarea
                  className="suzi-input min-h-24 resize-none"
                  value={form.bio}
                  onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
                  maxLength={280}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/62">
                  Country
                </label>
                <input
                  className="suzi-input"
                  value={form.country}
                  onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
                  maxLength={60}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={saveState === "saving"} className="suzi-primary-btn px-4 py-3 text-sm">
                  {saveState === "saving" ? "Saving..." : "Save account profile"}
                </button>
                <Link href="/app/profile" className="suzi-secondary-btn px-4 py-3 text-sm">
                  Full profile
                </Link>
                <Link href="/forgot-password" className="suzi-secondary-btn px-4 py-3 text-sm">
                  Reset password
                </Link>
              </div>
              {message && saveState !== "saving" ? (
                <p className={cx("text-sm", saveState === "success" ? "text-emerald-200" : "text-amber-100")}>
                  {message}
                </p>
              ) : null}
            </form>
          </div>
        ) : null}

        {active === "language" ? (
          <div className="mt-8 rounded-[1.15rem] border border-cyan-300/15 bg-cyan-500/8 p-5">
            <p className="text-sm text-[var(--text-muted)]">
              Use the globe control in the top bar to pick a locale. Stored language keys and translations will sync
              here when the i18n layer ships.
            </p>
          </div>
        ) : null}

        {active !== "account" && active !== "language" ? (
          <div className="mt-6 space-y-6">
            {settingsSections.map((section) => (
              <div key={section.title}>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100/62">
                  {section.title}
                </p>
                <div className="mt-3 space-y-3">
                  {section.items.map((item, index) => (
                    <div
                      key={item}
                      className="flex items-center justify-between gap-4 rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3"
                    >
                      <p className="text-sm text-slate-200">{item}</p>
                      <button
                        type="button"
                        className={cx(
                          "relative h-6 w-11 shrink-0 rounded-full border p-1 transition",
                          index < 2 ? "border-cyan-300/35 bg-cyan-400/18" : "border-white/12 bg-white/6",
                        )}
                        aria-label={item}
                      >
                        <span
                          className={cx(
                            "block h-4 w-4 rounded-full transition-all",
                            index < 2 ? "ml-auto bg-cyan-200" : "bg-slate-400",
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Panel>

      <Panel className="p-5">
        <SectionHeader eyebrow="Accessibility" title="UI mode" />
        <div className="mt-5 flex flex-wrap gap-2">
          <Chip active tone="cyan">
            Reduced transparency
          </Chip>
          <Chip>Reduced motion</Chip>
          <Chip tone="gold">High contrast</Chip>
        </div>
      </Panel>
    </section>
  );
}
