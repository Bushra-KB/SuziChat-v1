"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  listL1,
  listL2,
  listL3,
  listSection,
  panelLink,
  panelTitle,
} from "@/components/app/app-typography";
import { ProfilePageFriendsSection } from "@/components/app/profile-page-friends";
import { ProfilePageShell } from "@/components/app/profile-page-shell";
import { Icon, Panel, cx } from "@/components/ui/suzi-primitives";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { loadProfilePrefs, saveProfilePrefs } from "@/lib/profile-prefs-storage";
import { useMyProfileRealtime } from "@/lib/use-profile-realtime";
import {
  getStoredAuthSession,
  saveAuthSession,
  type AuthSession,
} from "@/lib/auth-client";
import {
  getMyProfile,
  parseUsersApiError,
  updateMyProfile,
  uploadProfileAvatar,
  type UserProfile,
} from "@/lib/users-client";
import { getFriendsSummary, type FriendsSummary } from "@/lib/friends-client";
import { listMyAuthoredPosts } from "@/lib/posts-client";
import type { ApiRoom } from "@/lib/rooms-client";
import { listRoomsForMe } from "@/lib/rooms-client";

const DEFAULT_AVATAR = "/ppic/ppic1.jpeg";

const COUNTRY_OPTIONS = [
  "",
  "Ethiopia",
  "United States",
  "United Kingdom",
  "Canada",
  "Germany",
  "France",
  "Kenya",
  "Nigeria",
  "South Africa",
  "India",
  "United Arab Emirates",
  "Saudi Arabia",
  "Australia",
  "Other",
] as const;

const LISTED_COUNTRIES = COUNTRY_OPTIONS.filter((c) => c && c !== "Other");

function isListedCountry(value: string) {
  return LISTED_COUNTRIES.includes(value as (typeof LISTED_COUNTRIES)[number]);
}

function resolveCountrySelectValue(country: string) {
  const trimmed = country.trim();
  if (!trimmed) {
    return "";
  }
  if (isListedCountry(trimmed)) {
    return trimmed;
  }
  return "Other";
}

function sessionFromStorage(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  return getStoredAuthSession();
}

function profileToForm(p: UserProfile) {
  return {
    displayName: p.displayName ?? "",
    bio: p.bio ?? "",
    country: p.country ?? "",
  };
}

function resolveAvatarSrc(profile: UserProfile | null, session: AuthSession | null): string {
  const u = profile?.avatarUrl?.trim() || session?.user.avatarUrl?.trim();
  if (!u) {
    return DEFAULT_AVATAR;
  }
  return u;
}

const QUICK_DEFAULTS: Array<{ id: string; label: string; copy: string }> = [
  {
    id: "showOnline",
    label: "Show online status",
    copy: "Let friends see when you're online",
  },
  {
    id: "snapsFriends",
    label: "Default snaps to friends",
    copy: "Your snaps will be visible to friends by default",
  },
  {
    id: "roomInvites",
    label: "Allow room invitations from friends",
    copy: "Let friends invite you to rooms",
  },
];

const PRIVACY_FIELDS: Array<{ id: string; label: string; options: string[] }> = [
  { id: "messages", label: "Who can send you messages", options: ["Friends", "Everyone", "Nobody"] },
  { id: "snaps", label: "Who can see your snaps", options: ["Friends", "Everyone", "Nobody"] },
  { id: "reels", label: "Who can see your reels", options: ["Everyone", "Friends", "Nobody"] },
];

function SectionIcon({ path }: { path: string }) {
  return (
    <span className="suzi-account-section-icon" aria-hidden>
      <Icon path={path} className="h-4 w-4" />
    </span>
  );
}

export function AccountProfilePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({ displayName: "", bio: "", country: "" });
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [loadMessage, setLoadMessage] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [prefToggles, setPrefToggles] = useState<Record<string, boolean>>({
    showOnline: true,
    snapsFriends: true,
    roomInvites: true,
  });
  const [privacy, setPrivacy] = useState<Record<string, string>>({
    messages: "Friends",
    snaps: "Friends",
    reels: "Everyone",
  });
  const [dashFriends, setDashFriends] = useState<FriendsSummary | null>(null);
  const [dashRooms, setDashRooms] = useState<ApiRoom[]>([]);
  const [snapsCount, setSnapsCount] = useState(0);
  const [reelsCount, setReelsCount] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const displayLabel = useMemo(() => {
    if (!session) {
      return "Account";
    }
    return session.user.displayName?.trim() || session.user.username;
  }, [session]);

  const myRooms = useMemo(
    () => dashRooms.filter((r) => r.actor?.isMember === true),
    [dashRooms],
  );

  const refreshOwnedContent = useCallback(async (token: string) => {
    const [roomList, snapList, reelList] = await Promise.all([
      listRoomsForMe(token),
      listMyAuthoredPosts(token, "SNAP", 80),
      listMyAuthoredPosts(token, "REEL", 80),
    ]);
    setDashRooms(roomList);
    setSnapsCount(snapList.length);
    setReelsCount(reelList.length);
  }, []);

  const refreshDashboard = useCallback(async () => {
    const s = sessionFromStorage();
    if (!s) {
      return;
    }
    try {
      const friends = await getFriendsSummary(s.accessToken);
      setDashFriends(friends);
      await refreshOwnedContent(s.accessToken);
    } catch {
      // keep last good state
    }
  }, [refreshOwnedContent]);

  useMyProfileRealtime(session?.accessToken ?? null, () => {
    void refreshDashboard();
  });

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const s = sessionFromStorage();
    if (!s) {
      setLoadState("error");
      setLoadMessage("Not signed in.");
      return;
    }
    setSession(s);
    setForm((f) => ({ ...f, displayName: s.user.displayName ?? "" }));
    setLoadState("loading");
    setLoadMessage("");

    let cancelled = false;
    void getMyProfile(s.accessToken)
      .then((p) => {
        if (cancelled) {
          return;
        }
        setProfile(p);
        setForm(profileToForm(p));
        setLoadState("ready");
      })
      .catch((e) => {
        if (cancelled) {
          return;
        }
        setLoadState("error");
        setLoadMessage(parseUsersApiError(e));
        setProfile(null);
        setForm((f) => ({ ...f, displayName: s.user.displayName ?? "" }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session || loadState !== "ready") {
      return;
    }
    let cancelled = false;
    void Promise.all([
      getFriendsSummary(session.accessToken),
      refreshOwnedContent(session.accessToken),
    ])
      .then(([friends]) => {
        if (cancelled) {
          return;
        }
        setDashFriends(friends);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [session, loadState, refreshOwnedContent]);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    const stored = loadProfilePrefs(session.user.id);
    setPrefToggles(stored.prefToggles);
    setPrivacy(stored.privacy);
  }, [session?.user.id]);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    saveProfilePrefs(session.user.id, { prefToggles, privacy });
  }, [session?.user.id, prefToggles, privacy]);

  function scrollToAbout() {
    document.getElementById("account-about")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSaveProfile(event: React.FormEvent) {
    event.preventDefault();
    const s = sessionFromStorage();
    if (!s) {
      return;
    }
    setSaveState("saving");
    setSaveMessage("");
    void updateMyProfile(s.accessToken, {
      displayName: form.displayName.trim() || undefined,
      bio: form.bio.trim() || undefined,
      country: form.country.trim() || undefined,
    })
      .then((updated) => {
        setProfile(updated);
        setForm(profileToForm(updated));
        const next: AuthSession = {
          ...s,
          user: {
            ...s.user,
            displayName: updated.displayName,
            avatarUrl: updated.avatarUrl ?? s.user.avatarUrl,
          },
        };
        saveAuthSession(next);
        setSession(next);
        setSaveState("success");
        setSaveMessage("Profile saved.");
      })
      .catch((e) => {
        setSaveState("error");
        setSaveMessage(parseUsersApiError(e));
      });
  }

  async function handleAvatarFile(file: File | null) {
    if (!file || !session) {
      return;
    }
    setAvatarBusy(true);
    try {
      const updated = await uploadProfileAvatar(session.accessToken, file);
      setProfile(updated);
      const next: AuthSession = {
        ...session,
        user: { ...session.user, avatarUrl: updated.avatarUrl },
      };
      saveAuthSession(next);
      setSession(next);
    } catch (e) {
      setSaveState("error");
      setSaveMessage(parseUsersApiError(e));
    } finally {
      setAvatarBusy(false);
    }
  }

  const avatarSrc = resolveAvatarSrc(profile, session);
  const friendsCount = dashFriends?.friends.length ?? 0;
  const roomsCount = myRooms.length;
  const lastUpdatedLabel = profile?.updatedAt
    ? `Last updated ${formatRelativeTime(profile.updatedAt, nowTick)}`
    : null;

  const countrySelectValue = resolveCountrySelectValue(form.country);
  const showCustomCountry = countrySelectValue === "Other";

  return (
    <ProfilePageShell variant="account">
      <div className="suzi-account-layout">
        {/* Hero */}
        <Panel className="suzi-account-hero relative overflow-hidden p-0">
          <div className="suzi-account-hero-inner p-[var(--panel-pad)]">
            <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(ellipse_at_18%_0%,rgba(255,32,121,0.2),transparent_52%),radial-gradient(ellipse_at_88%_100%,rgba(0,229,255,0.1),transparent_42%)]" />
            <div className="suzi-account-identity relative">
              <div
                className="suzi-account-avatar relative shrink-0 overflow-hidden rounded-full border-2 border-fuchsia-300/40 shadow-[0_18px_40px_rgba(15,23,42,0.45)]"
              >
                {avatarSrc.startsWith("/") ? (
                  <Image src={avatarSrc} alt="" fill sizes="120px" className="object-cover" priority />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
                <button
                  type="button"
                  disabled={avatarBusy}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Edit avatar"
                  className="absolute bottom-0 right-0 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-fuchsia-500/95 text-white shadow-[0_0_10px_rgba(255,32,121,0.6)] transition hover:scale-105"
                >
                  <Icon path="M4 20h4l10-10-4-4L4 16v4Zm12-14 2-2 4 4-2 2-4-4Z" className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    void handleAvatarFile(f ?? null);
                  }}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className={cx(listSection, "suzi-account-eyebrow")}>My account</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h1 className={cx(panelTitle, "truncate")}>
                    {displayLabel}
                  </h1>
                  {session?.user.isEmailVerified ? (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-[10px] font-bold text-cyan-950">
                      <Icon path="M5 13l4 4L19 7" className="h-3 w-3" />
                    </span>
                  ) : null}
                </div>
                <p className={cx(listL1, "mt-1 flex flex-wrap items-center gap-2 text-cyan-100/75")}>
                  <span>@{session?.user.username ?? "—"}</span>
                  <span className="opacity-30">·</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-300/90">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(110,255,178,0.7)]" />
                    Online
                  </span>
                </p>
                <p className={cx(listL2, "mt-2 max-w-md leading-relaxed text-cyan-100/58")}>
                  Keep your profile fresh across rooms, snaps, reels, dating, and games.
                </p>
                <div className="suzi-account-hero-actions mt-3">
                  <button
                    type="button"
                    onClick={scrollToAbout}
                    className="suzi-secondary-btn inline-flex items-center gap-2 px-4 py-2"
                  >
                    <Icon path="M4 20h4l10-10-4-4L4 16v4Zm12-14 2-2 4 4-2 2-4-4Z" className="h-3.5 w-3.5" />
                    Edit profile
                  </button>
                  <button
                    type="button"
                    disabled={avatarBusy}
                    onClick={() => fileInputRef.current?.click()}
                    className="suzi-secondary-btn inline-flex items-center gap-2 px-4 py-2"
                  >
                    <Icon path="M4 7h3l2-2h6l2 2h3v12H4V7Zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" className="h-3.5 w-3.5" />
                    Change avatar
                  </button>
                </div>
              </div>
            </div>

            <div className="suzi-account-stat-strip" aria-label="Your activity">
              <StatChip
                label="Friends"
                value={friendsCount}
                href="/app#friends"
                icon="M16 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-4 8a8 8 0 0 1 16 0H12Z"
              />
              <StatChip
                label="Rooms"
                value={roomsCount}
                href="/app#rooms"
                icon="M3 4h18v6H3V4Zm0 10h18v6H3v-6Z"
              />
              <StatChip
                label="Snaps"
                value={snapsCount}
                href="/app/snaps"
                icon="M4 7h3l2-2h6l2 2h3v12H4V7Zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
              />
              <StatChip
                label="Reels"
                value={reelsCount}
                href="/app/reels"
                icon="M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm4 4 5 3-5 3V9Z"
              />
            </div>
          </div>
        </Panel>

        <div className="suzi-account-body">
          <div className="suzi-account-main">
            <Panel className="suzi-account-panel suzi-account-friends-panel p-[var(--panel-pad)]">
              <div className="suzi-account-section-head">
                <div className="flex items-start gap-2">
                  <SectionIcon path="M16 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-4 8a8 8 0 0 1 16 0H12Z" />
                  <div>
                    <h2 className={panelTitle}>Friends</h2>
                    <p className={cx(listL2, "mt-0.5 text-[var(--text-muted)]")}>
                      Manage your connections and see who&apos;s online.
                    </p>
                  </div>
                </div>
                <Link
                  href="/app#friends"
                  className={panelLink}
                >
                  View all friends
                </Link>
              </div>
              <div className="mt-3">
                <ProfilePageFriendsSection
                  initialFriends={dashFriends}
                  accessToken={session?.accessToken ?? null}
                />
              </div>
            </Panel>

            <Panel className="suzi-account-panel p-[var(--panel-pad)]">
              <form id="account-about" onSubmit={handleSaveProfile} className="suzi-account-form space-y-4">
                <div className="suzi-account-form-head">
                  <SectionIcon path="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0H4Z" />
                  <div>
                    <h2 className={panelTitle}>Profile details</h2>
                    <p className={cx(listL2, "mt-0.5 text-[var(--text-muted)]")}>
                      Name, bio, and region shown on your public profile.
                    </p>
                  </div>
                </div>
                <div className="suzi-account-field">
                <label htmlFor="account-display-name" className={cx(listSection, "text-[var(--text-muted)]")}>
                  Display name
                </label>
                <input
                  id="account-display-name"
                  className={cx("suzi-input mt-1.5 w-full", listL1)}
                  value={form.displayName}
                  placeholder={session?.user.username ?? "Your name"}
                  maxLength={48}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                />
              </div>
              <div className="suzi-account-field">
                <label htmlFor="account-bio" className={cx(listSection, "text-[var(--text-muted)]")}>
                  About me
                </label>
                <textarea
                  id="account-bio"
                  className={cx("suzi-input mt-1.5 min-h-[5.5rem] w-full resize-none", listL1)}
                  value={form.bio}
                  placeholder="Short line about you"
                  maxLength={280}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                />
              </div>

              <div className="suzi-account-field">
                <label htmlFor="account-country" className={cx(listSection, "text-[var(--text-muted)]")}>
                  Country / region
                </label>
                <select
                  id="account-country"
                  className={cx("suzi-input mt-1.5 w-full", listL1)}
                  value={countrySelectValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "Other") {
                      setForm((f) => ({
                        ...f,
                        country: f.country && !isListedCountry(f.country) ? f.country : "",
                      }));
                    } else {
                      setForm((f) => ({ ...f, country: v }));
                    }
                  }}
                >
                  <option value="" className="bg-[#1a1245]">
                    Select country…
                  </option>
                  {LISTED_COUNTRIES.map((c) => (
                    <option key={c} value={c} className="bg-[#1a1245]">
                      {c}
                    </option>
                  ))}
                  <option value="Other" className="bg-[#1a1245]">
                    Other
                  </option>
                </select>
                {showCustomCountry ? (
                  <input
                    className={cx("suzi-input mt-2 w-full", listL1)}
                    placeholder="Enter your country"
                    value={isListedCountry(form.country) ? "" : form.country}
                    maxLength={60}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  />
                ) : null}
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={saveState === "saving"}
                  className="suzi-primary-btn w-full py-2.5 font-semibold"
                >
                  {saveState === "saving" ? "Saving…" : "Save profile"}
                </button>
                <p className={cx(listL3, "mt-2 text-center text-[var(--text-soft)]")}>
                  {lastUpdatedLabel ?? ""}
                  {saveMessage && saveState === "success" ? (
                    <span className="ml-1 text-emerald-200">· {saveMessage}</span>
                  ) : null}
                  {saveMessage && saveState === "error" ? (
                    <span className="ml-1 text-pink-200">· {saveMessage}</span>
                  ) : null}
                </p>
              </div>
            </form>

            {loadState === "error" && loadMessage ? (
              <p className={cx(listL2, "mt-4 rounded-[var(--panel-radius)] border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-amber-100")}>
                {loadMessage}
              </p>
            ) : null}
            </Panel>
          </div>

          <aside className="suzi-account-sidebar">
            <Panel className="suzi-account-panel p-[var(--panel-pad)]">
              <div className="flex items-center gap-2">
                <SectionIcon path="M12 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6.4-3a6.4 6.4 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a6.4 6.4 0 0 0-1.7-1L14 2h-4l-.2 2a6.4 6.4 0 0 0-1.7 1L5.7 4l-2 3.4L5.7 9c-.1.3-.1.6-.1 1s0 .7.1 1l-2 1.6 2 3.4 2.4-1c.5.4 1 .7 1.7 1L10 20h4l.2-2c.7-.3 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.6.1-1Z" />
                <h2 className={panelTitle}>Quick defaults</h2>
              </div>
              <div className="mt-3 space-y-2">
                {QUICK_DEFAULTS.map((row) => {
                  const on = prefToggles[row.id] ?? false;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => {
                        const next = !on;
                        setPrefToggles((p) => ({ ...p, [row.id]: next }));
                      }}
                      className="flex w-full items-center justify-between gap-4 rounded-[var(--panel-radius)] border border-white/8 bg-white/5 px-3 py-2.5 text-left transition hover:bg-white/8"
                    >
                      <div className="min-w-0">
                        <p className={cx(listL1, "font-medium text-white")}>{row.label}</p>
                        <p className={cx(listL3, "text-[var(--text-muted)]")}>{row.copy}</p>
                      </div>
                      <span className="suzi-switch suzi-switch--settings" data-on={on ? "true" : "false"} aria-hidden />
                    </button>
                  );
                })}
              </div>
            </Panel>

            <Panel className="suzi-account-panel p-[var(--panel-pad)]">
              <div className="flex items-center gap-2">
                <SectionIcon path="M12 2 4 5v7a8 8 0 0 0 8 8 8 8 0 0 0 8-8V5l-8-3Z" />
                <h2 className={panelTitle}>Privacy</h2>
              </div>
              <div className="mt-3 space-y-2">
                {PRIVACY_FIELDS.map((field) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(8.5rem,42%)] items-center gap-3 rounded-[var(--panel-radius)] border border-white/8 bg-white/5 px-3 py-2.5"
                  >
                    <p className={cx(listL1, "min-w-0 truncate text-white")}>{field.label}</p>
                    <select
                      value={privacy[field.id] ?? field.options[0]}
                      onChange={(e) => setPrivacy((prev) => ({ ...prev, [field.id]: e.target.value }))}
                      className={cx("suzi-input w-full min-w-0 rounded-md px-2 py-1 font-semibold", listL2)}
                    >
                      {field.options.map((opt) => (
                        <option key={opt} value={opt} className="bg-[#1a1245]">
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="suzi-account-panel p-[var(--panel-pad)]">
              <div className="flex items-center gap-2">
                <SectionIcon path="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0H4Z" />
                <h2 className={panelTitle}>Account</h2>
              </div>
              <div className="mt-3 divide-y divide-white/8">
                <Link
                  href="/app/dating"
                  className={cx(listL1, "flex items-center justify-between gap-3 py-3 text-white transition hover:text-fuchsia-100")}
                >
                  <span>Suzi Dating</span>
                  <Icon path="M9 6l6 6-6 6" className="h-3.5 w-3.5 text-white/55" />
                </Link>
                <AccountRow label="Change password" trailing={<Icon path="M9 6l6 6-6 6" className="h-3.5 w-3.5 text-white/55" />} />
                <AccountRow
                  label="Email address"
                  trailing={
                    <span className="flex items-center gap-2">
                      <span className={cx(listL3, "max-w-[10rem] truncate text-[var(--text-muted)]")}>
                        {session?.user.email}
                      </span>
                      <Icon path="M9 6l6 6-6 6" className="h-3.5 w-3.5 shrink-0 text-white/55" />
                    </span>
                  }
                />
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </ProfilePageShell>
  );
}

function StatChip({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: number;
  icon: string;
  href: string;
}) {
  return (
    <Link href={href} className="suzi-account-stat-chip group">
      <span className="suzi-account-stat-chip-icon" aria-hidden>
        <Icon path={icon} className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="suzi-account-stat-chip-label">{label}</span>
        <span className="suzi-account-stat-chip-value">{value}</span>
        <span className="suzi-account-stat-chip-action">View all</span>
      </span>
      <Icon path="M9 6l6 6-6 6" className="h-3 w-3 shrink-0 text-white/40 transition group-hover:text-fuchsia-200/90" />
    </Link>
  );
}

function AccountRow({
  label,
  trailing,
}: {
  label: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className={cx(listL1, "flex items-center justify-between gap-3 py-3 text-white")}>
      <span>{label}</span>
      {trailing}
    </div>
  );
}
