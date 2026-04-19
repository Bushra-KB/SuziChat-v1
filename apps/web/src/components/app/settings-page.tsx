"use client";

import Link from "next/link";
import { useState } from "react";
import { Chip, Panel, SectionHeader, cx } from "@/components/ui/suzi-primitives";
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
            <p className="text-sm text-[var(--text-muted)]">
              Email, username, and password flows stay aligned with auth. Open your profile to change display name,
              bio, and country stored on the server.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/app/profile" className="suzi-primary-btn px-4 py-3 text-sm">
                Account profile
              </Link>
              <Link href="/forgot-password" className="suzi-secondary-btn px-4 py-3 text-sm">
                Reset password
              </Link>
            </div>
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
