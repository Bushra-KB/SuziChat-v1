"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProfilePageFriendsSection } from "@/components/app/profile-page-friends";
import { Icon, Panel } from "@/components/ui/suzi-primitives";
import {
  clearAuthSession,
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
import {
  listMyAuthoredPosts,
  type ApiPost,
} from "@/lib/posts-client";
import type { ApiRoom } from "@/lib/rooms-client";
import { listRoomsForMe } from "@/lib/rooms-client";

const DEFAULT_AVATAR = "/ppic/ppic1.jpeg";

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
    id: "darkMode",
    label: "Enable dark mode",
    copy: "Use dark theme across Suzi Chat",
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
    darkMode: true,
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
  const [dashSnaps, setDashSnaps] = useState<ApiPost[]>([]);
  const [dashReels, setDashReels] = useState<ApiPost[]>([]);

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
    setDashSnaps(snapList);
    setDashReels(reelList);
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

  function handleLogout() {
    clearAuthSession();
    window.location.href = "/login";
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
  const snapsCount = dashSnaps.length;
  const reelsCount = dashReels.length;
  const lastUpdatedLabel = profile?.updatedAt
    ? `Last updated ${new Date(profile.updatedAt).toLocaleString()}`
    : null;

  return (
    <section className="suzi-app-frame-fill">
      <div className="suzi-profile-grid">
        {/* HERO */}
        <Panel className="shrink-0 overflow-hidden p-0">
          <div className="relative grid grid-cols-1 gap-4 p-[var(--panel-pad)] xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(ellipse_at_30%_0%,rgba(255,32,121,0.32),transparent_55%)]" />
            <div className="relative flex items-center gap-4">
              <div className="relative shrink-0 overflow-hidden rounded-full border-2 border-fuchsia-300/40 shadow-[0_18px_40px_rgba(15,23,42,0.45)]" style={{ width: "var(--avatar-xl)", height: "var(--avatar-xl)" }}>
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
                <p className="text-[var(--fs-2xs)] font-semibold uppercase tracking-[0.28em] text-cyan-100/55">My account</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-[var(--fs-2xl)] font-bold tracking-tight text-white">{displayLabel}</h1>
                  {session?.user.isEmailVerified ? (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-[10px] font-bold text-cyan-950">
                      <Icon path="M5 13l4 4L19 7" className="h-3 w-3" />
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-[var(--fs-xs)] text-[var(--text-muted)]">
                  <span>@{session?.user.username ?? "—"}</span>
                  <span className="opacity-30">·</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-300/85">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(110,255,178,0.7)]" />
                    Online
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarBusy}
                    className="suzi-primary-btn inline-flex items-center gap-2 px-3 py-1.5 text-[var(--fs-xs)]"
                  >
                    <Icon path="M4 20h4l10-10-4-4L4 16v4Zm12-14 2-2 4 4-2 2-4-4Z" className="h-3.5 w-3.5" />
                    Edit profile
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarBusy}
                    className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/5 px-3 py-1.5 text-[var(--fs-xs)] font-semibold text-white/85 transition hover:border-white/25 hover:text-white"
                  >
                    <Icon path="M12 4v12m0 0-4-4m4 4 4-4M4 20h16" className="h-3.5 w-3.5" />
                    Change avatar
                  </button>
                </div>
              </div>
            </div>

            <div className="relative grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-4">
              <StatCard
                label="Friends"
                value={friendsCount}
                href="/app#friends"
                icon="M16 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-4 8a8 8 0 0 1 16 0H12Z"
              />
              <StatCard
                label="Rooms"
                value={roomsCount}
                href="/app#rooms"
                icon="M3 4h18v6H3V4Zm0 10h18v6H3v-6Z"
              />
              <StatCard
                label="Snaps"
                value={snapsCount}
                href="/app/snaps"
                icon="M4 7h3l2-2h6l2 2h3v12H4V7Zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
              />
              <StatCard
                label="Reels"
                value={reelsCount}
                href="/app/reels"
                icon="M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm4 4 5 3-5 3V9Z"
              />
            </div>
          </div>
        </Panel>

        {/* BODY */}
        <div className="suzi-profile-body min-h-0">
          {/* LEFT — Friends + About + Country */}
          <Panel className="flex h-full min-h-0 flex-col overflow-hidden p-[var(--panel-pad)]">
            <div className="suzi-thin-scroll flex-1 space-y-4 overflow-y-auto pr-1">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-cyan-100">
                      <Icon path="M16 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-4 8a8 8 0 0 1 16 0H12Z" className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="text-[var(--fs-lg)] font-semibold tracking-tight text-white">Friends</h2>
                      <p className="text-[var(--fs-xs)] text-[var(--text-muted)]">
                        Manage your connections and see who&apos;s online.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/app#friends"
                    className="text-[var(--fs-xs)] font-medium text-fuchsia-200/90 transition hover:text-fuchsia-100"
                  >
                    View all friends →
                  </Link>
                </div>
                <div className="mt-3">
                  <ProfilePageFriendsSection
                    initialFriends={dashFriends}
                    accessToken={session?.accessToken ?? null}
                  />
                </div>
              </div>

              <div className="suzi-divider" />

              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-cyan-100">
                    <Icon path="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0H4Z" className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-[var(--fs-lg)] font-semibold tracking-tight text-white">About me</h2>
                    <p className="text-[var(--fs-xs)] text-[var(--text-muted)]">
                      Tell others a bit about yourself.
                    </p>
                  </div>
                </div>
                <form onSubmit={handleSaveProfile} className="mt-3 space-y-3">
                  <textarea
                    className="suzi-input min-h-[5rem] resize-none text-[var(--fs-sm)]"
                    value={form.bio}
                    placeholder="Short line about you"
                    maxLength={280}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  />

                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-cyan-100">
                      <Icon path="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 3v18M3 12h18" className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-[var(--fs-md)] font-semibold text-white">Country / Region</h3>
                      <p className="text-[var(--fs-xs)] text-[var(--text-muted)]">
                        This helps us personalize your experience.
                      </p>
                    </div>
                  </div>
                  <input
                    className="suzi-input text-[var(--fs-sm)]"
                    placeholder="Ethiopia"
                    value={form.country}
                    maxLength={60}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[var(--fs-xs)] text-[var(--text-soft)]">
                      {lastUpdatedLabel ?? ""}
                      {saveMessage && saveState === "success" ? (
                        <span className="ml-2 text-emerald-200">{saveMessage}</span>
                      ) : null}
                      {saveMessage && saveState === "error" ? (
                        <span className="ml-2 text-pink-200">{saveMessage}</span>
                      ) : null}
                    </div>
                    <button
                      type="submit"
                      disabled={saveState === "saving"}
                      className="suzi-primary-btn px-4 py-1.5 text-[var(--fs-xs)]"
                    >
                      {saveState === "saving" ? "Saving…" : "Save profile"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
            {loadState === "error" && loadMessage ? (
              <p className="shrink-0 rounded-[var(--panel-radius)] border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-[var(--fs-xs)] text-amber-100">
                {loadMessage}
              </p>
            ) : null}
          </Panel>

          {/* RIGHT — Quick defaults + Privacy + Account */}
          <div className="suzi-thin-scroll flex h-full min-h-0 flex-col gap-[var(--row-gap)] overflow-y-auto pr-1">
            <Panel className="shrink-0 p-[var(--panel-pad)]">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-cyan-100">
                  <Icon path="M12 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6.4-3a6.4 6.4 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a6.4 6.4 0 0 0-1.7-1L14 2h-4l-.2 2a6.4 6.4 0 0 0-1.7 1L5.7 4l-2 3.4L5.7 9c-.1.3-.1.6-.1 1s0 .7.1 1l-2 1.6 2 3.4 2.4-1c.5.4 1 .7 1.7 1L10 20h4l.2-2c.7-.3 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.6.1-1Z" className="h-4 w-4" />
                </span>
                <h2 className="text-[var(--fs-lg)] font-semibold text-white">Quick defaults</h2>
              </div>
              <div className="mt-3 space-y-2">
                {QUICK_DEFAULTS.map((row) => {
                  const on = prefToggles[row.id] ?? false;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setPrefToggles((p) => ({ ...p, [row.id]: !on }))}
                      className="flex w-full items-center justify-between gap-4 rounded-[var(--panel-radius)] border border-white/8 bg-white/5 px-3 py-2 text-left transition hover:bg-white/8"
                    >
                      <div className="min-w-0">
                        <p className="text-[var(--fs-sm)] font-medium text-white">{row.label}</p>
                        <p className="text-[var(--fs-2xs)] text-[var(--text-muted)]">{row.copy}</p>
                      </div>
                      <span className="suzi-switch" data-on={on ? "true" : "false"} aria-hidden />
                    </button>
                  );
                })}
              </div>
            </Panel>

            <Panel className="shrink-0 p-[var(--panel-pad)]">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-cyan-100">
                  <Icon path="M12 2 4 5v7a8 8 0 0 0 8 8 8 8 0 0 0 8-8V5l-8-3Z" className="h-4 w-4" />
                </span>
                <h2 className="text-[var(--fs-lg)] font-semibold text-white">Privacy</h2>
              </div>
              <div className="mt-3 space-y-2">
                {PRIVACY_FIELDS.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-white/8 bg-white/5 px-3 py-2"
                  >
                    <p className="text-[var(--fs-sm)] text-white">{field.label}</p>
                    <select
                      value={privacy[field.id] ?? field.options[0]}
                      onChange={(e) => setPrivacy((prev) => ({ ...prev, [field.id]: e.target.value }))}
                      className="rounded-md border border-white/14 bg-white/8 px-2 py-1 text-[var(--fs-xs)] font-semibold text-white outline-none transition hover:border-white/22"
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

            <Panel className="shrink-0 p-[var(--panel-pad)]">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-cyan-100">
                  <Icon path="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0H4Z" className="h-4 w-4" />
                </span>
                <h2 className="text-[var(--fs-lg)] font-semibold text-white">Account</h2>
              </div>
              <div className="mt-3 divide-y divide-white/8">
                <AccountRow label="Change password" trailing={<Icon path="M9 6l6 6-6 6" className="h-3.5 w-3.5 text-white/55" />} />
                <AccountRow
                  label="Email address"
                  trailing={
                    <span className="flex items-center gap-2">
                      <span className="text-[var(--fs-2xs)] text-[var(--text-muted)]">
                        {session?.user.email}
                      </span>
                      <Icon path="M9 6l6 6-6 6" className="h-3.5 w-3.5 text-white/55" />
                    </span>
                  }
                />
                <AccountRow
                  label="Two-factor authentication"
                  trailing={
                    <span className="flex items-center gap-2">
                      <span className="text-[var(--fs-2xs)] font-semibold text-emerald-300/90">Enabled</span>
                      <Icon path="M9 6l6 6-6 6" className="h-3.5 w-3.5 text-white/55" />
                    </span>
                  }
                />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center justify-between py-3 text-left text-[var(--fs-sm)] font-semibold text-pink-200/90 transition hover:text-pink-100"
                >
                  <span>Log out</span>
                  <Icon path="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" className="h-4 w-4" />
                </button>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({
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
    <Link href={href} className="suzi-stat-card group transition hover:border-cyan-300/30">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-[0.6rem] border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(88,36,175,0.62),rgba(32,18,88,0.82))] text-cyan-100">
          <Icon path={icon} className="h-3.5 w-3.5" />
        </span>
        <span className="suzi-stat-card-label">{label}</span>
      </div>
      <div>
        <p className="suzi-stat-card-value">{value}</p>
        <p className="text-[var(--fs-2xs)] text-cyan-100/65 transition group-hover:text-fuchsia-200/90">
          View all →
        </p>
      </div>
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
    <div className="flex items-center justify-between gap-3 py-3 text-[var(--fs-sm)] text-white">
      <span>{label}</span>
      {trailing}
    </div>
  );
}
