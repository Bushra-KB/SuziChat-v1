"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProfilePageFriendsSection } from "@/components/app/profile-page-friends";
import {
  Chip,
  Panel,
  SectionHeader,
  cx,
} from "@/components/ui/suzi-primitives";
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
  deleteMyPost,
  listMyAuthoredPosts,
  type ApiPost,
} from "@/lib/posts-client";
import { apiPostToReel, apiPostToSnap } from "@/lib/post-ui-mappers";
import type { ApiRoom } from "@/lib/rooms-client";
import {
  deleteRoom,
  leaveRoom,
  listRoomsForMe,
} from "@/lib/rooms-client";

const ACCOUNT_ROOM_COVER: Record<string, string> = {
  "general-chat": "/banner/general_chat_banner.png",
  "music-lounge": "/banner/Music_lounch_banner.png",
  "late-night-chat": "/banner/Late_Night_chat_banner.png",
  "movie-nights": "/banner/hobbies_banner.png",
  "gaming-hangout": "/banner/gamming_hangout_banner.png",
};

const DEFAULT_AVATAR = "/ppic/ppic1.jpeg";

const PROFILE_TABS = [
  { id: "overview", label: "About & account" },
  { id: "reels", label: "Reels" },
  { id: "snaps", label: "Snaps" },
  { id: "rooms", label: "Rooms" },
] as const;

type TabId = (typeof PROFILE_TABS)[number]["id"];

const languageOptions = ["English", "Deutsch", "Français", "Español", "Italiano", "Nederlands", "Polski"] as const;

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
  if (u.startsWith("http://") || u.startsWith("https://")) {
    return u;
  }
  return u;
}

function roomCover(room: ApiRoom): string {
  if (room.imageUrl?.trim()) {
    return room.imageUrl.trim();
  }
  return ACCOUNT_ROOM_COVER[room.slug] ?? "/banner/general_chat_banner.png";
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
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [langSelection, setLangSelection] = useState(0);
  const [prefToggles, setPrefToggles] = useState<Record<string, boolean>>({
    "Show online status": true,
    "Enable dating profile": true,
    "Default snaps to friends-only": true,
    "Allow room invitations from friends": false,
  });
  const [dashFriends, setDashFriends] = useState<FriendsSummary | null>(null);
  const [dashRooms, setDashRooms] = useState<ApiRoom[]>([]);
  const [dashSnaps, setDashSnaps] = useState<ApiPost[]>([]);
  const [dashReels, setDashReels] = useState<ApiPost[]>([]);
  const [postBusyId, setPostBusyId] = useState<string | null>(null);
  const [roomBusySlug, setRoomBusySlug] = useState<string | null>(null);

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

  /* eslint-disable react-hooks/set-state-in-effect -- bootstrap session + GET /users/me on mount */
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
  /* eslint-enable react-hooks/set-state-in-effect */

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
        user: {
          ...session.user,
          avatarUrl: updated.avatarUrl,
        },
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

  async function handleClearAvatar() {
    const s = sessionFromStorage();
    if (!s) {
      return;
    }
    setAvatarBusy(true);
    try {
      const updated = await updateMyProfile(s.accessToken, { avatarUrl: "" });
      setProfile(updated);
      const next: AuthSession = {
        ...s,
        user: {
          ...s.user,
          avatarUrl: updated.avatarUrl,
        },
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

  async function handleDeletePost(postId: string, kind: "REEL" | "SNAP") {
    const s = sessionFromStorage();
    if (!s) {
      return;
    }
    if (!window.confirm("Delete this post permanently? This cannot be undone.")) {
      return;
    }
    setPostBusyId(postId);
    try {
      await deleteMyPost(s.accessToken, postId);
      if (kind === "REEL") {
        setDashReels((prev) => prev.filter((p) => p.id !== postId));
      } else {
        setDashSnaps((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (e) {
      setSaveState("error");
      setSaveMessage(parseUsersApiError(e));
    } finally {
      setPostBusyId(null);
    }
  }

  async function handleLeaveRoom(slug: string) {
    const s = sessionFromStorage();
    if (!s) {
      return;
    }
    if (!window.confirm("Leave this room? You can rejoin later if it stays open.")) {
      return;
    }
    setRoomBusySlug(slug);
    try {
      await leaveRoom(s.accessToken, slug);
      await refreshOwnedContent(s.accessToken);
    } catch (e) {
      setSaveState("error");
      setSaveMessage(parseUsersApiError(e));
    } finally {
      setRoomBusySlug(null);
    }
  }

  async function handleDeleteRoom(slug: string) {
    const s = sessionFromStorage();
    if (!s) {
      return;
    }
    if (!window.confirm("Delete this room permanently? All messages will be removed.")) {
      return;
    }
    setRoomBusySlug(slug);
    try {
      await deleteRoom(s.accessToken, slug);
      await refreshOwnedContent(s.accessToken);
    } catch (e) {
      setSaveState("error");
      setSaveMessage(parseUsersApiError(e));
    } finally {
      setRoomBusySlug(null);
    }
  }

  const avatarSrc = resolveAvatarSrc(profile, session);

  return (
    <section className="space-y-5 pb-10">
      {/* Hero */}
      <div className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-[linear-gradient(135deg,rgba(56,20,120,0.55),rgba(12,18,48,0.92))] shadow-[0_24px_60px_rgba(8,6,28,0.55)]">
        <div className="relative px-5 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
          <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(ellipse_at_30%_0%,rgba(255,32,121,0.35),transparent_55%)]" />
          <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-8">
            <div className="flex flex-col items-center">
              <div className="relative h-36 w-36 overflow-hidden rounded-full border-2 border-fuchsia-300/35 bg-[linear-gradient(145deg,rgba(232,77,255,0.22),rgba(82,213,255,0.12))] shadow-[0_18px_40px_rgba(15,23,42,0.45)]">
                {avatarSrc.startsWith("/") ? (
                  <Image src={avatarSrc} alt="" fill sizes="144px" className="object-cover" priority />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
              </div>
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
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={avatarBusy}
                  onClick={() => fileInputRef.current?.click()}
                  className="suzi-primary-btn px-4 py-2.5 text-sm"
                >
                  {avatarBusy ? "Working…" : "Change photo"}
                </button>
                {(profile?.avatarUrl?.trim() || session?.user.avatarUrl?.trim()) ? (
                  <button
                    type="button"
                    disabled={avatarBusy}
                    onClick={() => void handleClearAvatar()}
                    className="rounded-full border border-white/16 bg-white/6 px-4 py-2.5 text-sm font-semibold text-[var(--text-muted)] transition hover:border-white/22 hover:text-white"
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-cyan-100/55">Profile</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">{displayLabel}</h1>
              {session ? (
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  @{session.user.username}
                  <span className="mx-2 text-slate-500">·</span>
                  {session.user.email}
                </p>
              ) : (
                <p className="mt-2 text-sm text-[var(--text-muted)]">Loading session…</p>
              )}
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                {session?.user.isEmailVerified ? (
                  <span className="rounded-full border border-emerald-300/35 bg-emerald-400/12 px-2.5 py-0.5 text-[0.68rem] font-semibold text-emerald-100">
                    Email verified
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-2.5 py-0.5 text-[0.68rem] font-semibold text-amber-100">
                    Email not verified
                  </span>
                )}
                {session?.user.isAdultConfirmed ? (
                  <span className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-0.5 text-[0.68rem] font-semibold">
                    18+ confirmed
                  </span>
                ) : null}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-[1rem] border border-white/10 bg-white/6 px-3 py-3 text-center sm:text-left">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-cyan-100/55">Friends</p>
                  <p className="mt-1 text-xl font-bold text-white">{dashFriends?.friends.length ?? "—"}</p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-white/6 px-3 py-3 text-center sm:text-left">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-cyan-100/55">Reels</p>
                  <p className="mt-1 text-xl font-bold text-white">{dashReels.length}</p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-white/6 px-3 py-3 text-center sm:text-left">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-cyan-100/55">Snaps</p>
                  <p className="mt-1 text-xl font-bold text-white">{dashSnaps.length}</p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-white/6 px-3 py-3 text-center sm:text-left">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-cyan-100/55">Rooms</p>
                  <p className="mt-1 text-xl font-bold text-white">{myRooms.length}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Link href="/app/friends" className="suzi-secondary-btn px-4 py-2.5 text-sm">
                  Find friends
                </Link>
                <Link href="/app/reels?create=1" className="suzi-secondary-btn px-4 py-2.5 text-sm">
                  New reel
                </Link>
                <Link href="/app/snaps?create=1" className="suzi-secondary-btn px-4 py-2.5 text-sm">
                  New snap
                </Link>
                <Link href="/app/dating" className="rounded-full border border-pink-300/22 bg-pink-500/10 px-4 py-2.5 text-sm font-semibold text-pink-100/90 transition hover:border-pink-300/35">
                  Dating
                </Link>
                <Link href="/app/games" className="rounded-full border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold text-[var(--text-muted)] transition hover:border-white/18 hover:text-white">
                  Games
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Panel className="p-5 sm:p-6">
        <SectionHeader eyebrow="Network" title="Friends" copy="Same live list style as home — message, unfriend, and presence." />
        <div className="mt-5">
          <ProfilePageFriendsSection initialFriends={dashFriends} accessToken={session?.accessToken ?? null} />
        </div>
      </Panel>

      <Panel className="p-5 sm:p-6">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-cyan-100/58">Content</p>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 suzi-scrollbar sm:flex-wrap">
          {PROFILE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cx(
                "shrink-0 rounded-full border px-4 py-2 text-[0.84rem] font-semibold transition",
                activeTab === tab.id
                  ? "border-fuchsia-300/45 bg-fuchsia-400/16 text-white shadow-[0_0_16px_rgba(255,32,121,0.2)]"
                  : "border-white/10 bg-white/5 text-[var(--text-muted)] hover:border-white/18 hover:bg-white/8 hover:text-white",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Panel>

      {loadState === "loading" ? (
        <Panel className="p-6">
          <p className="text-sm text-[var(--text-muted)]">Loading profile from API…</p>
        </Panel>
      ) : null}

      {loadState === "error" && loadMessage ? (
        <Panel className="border border-amber-300/28 bg-amber-500/10 p-5">
          <p className="text-sm font-medium text-amber-100">{loadMessage}</p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Check that the API is running and you are signed in. You can retry once the server is reachable.
          </p>
          <button type="button" onClick={() => window.location.reload()} className="suzi-secondary-btn mt-4 px-4 py-2 text-sm">
            Retry
          </button>
        </Panel>
      ) : null}

      {saveMessage && saveState === "error" ? (
        <Panel className="border border-pink-300/25 bg-pink-500/10 p-4">
          <p className="text-sm text-pink-100">{saveMessage}</p>
        </Panel>
      ) : null}

      {activeTab === "overview" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Panel className="p-6">
            <SectionHeader eyebrow="Identity" title="Edit profile" />
            <form onSubmit={handleSaveProfile} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Display name
                </label>
                <input
                  className="suzi-input"
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  maxLength={40}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Bio
                </label>
                <textarea
                  className="suzi-input min-h-28 resize-none"
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  maxLength={280}
                  placeholder="Short line about you"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Country / region
                </label>
                <input
                  className="suzi-input"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  maxLength={60}
                  placeholder="Optional"
                  autoComplete="country-name"
                />
              </div>
              {profile?.updatedAt ? (
                <p className="text-xs text-[var(--text-soft)]">
                  Last updated {new Date(profile.updatedAt).toLocaleString()}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={saveState === "saving"} className="suzi-primary-btn px-5 py-3 text-sm">
                  {saveState === "saving" ? "Saving…" : "Save profile"}
                </button>
                {saveMessage && saveState === "success" ? (
                  <span className="text-sm text-emerald-200">{saveMessage}</span>
                ) : null}
              </div>
            </form>

            <div className="mt-10 border-t border-white/10 pt-8">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-100/65">Preferred language</p>
              <p className="mt-1 text-xs text-[var(--text-soft)]">Synced with the header language picker when strings are wired.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {languageOptions.map((language, index) => (
                  <button key={language} type="button" onClick={() => setLangSelection(index)} className="inline-flex">
                    <Chip active={langSelection === index} tone={langSelection === index ? "cyan" : "default"}>
                      {language}
                    </Chip>
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <SectionHeader eyebrow="Privacy" title="Quick defaults" />
            <div className="mt-5 space-y-3">
              {Object.entries(prefToggles).map(([label, on]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPrefToggles((p) => ({ ...p, [label]: !p[label] }))}
                  className="flex w-full items-center justify-between gap-4 rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-left transition hover:bg-white/8"
                >
                  <span className="text-sm text-slate-200">{label}</span>
                  <span
                    className={cx(
                      "relative h-6 w-11 shrink-0 rounded-full border p-1 transition",
                      on ? "border-cyan-300/35 bg-cyan-400/18" : "border-white/12 bg-white/6",
                    )}
                  >
                    <span
                      className={cx(
                        "block h-4 w-4 rounded-full transition-all",
                        on ? "ml-auto bg-cyan-200" : "bg-slate-400",
                      )}
                    />
                  </span>
                </button>
              ))}
            </div>
            <button type="button" onClick={handleLogout} className="suzi-secondary-btn mt-8 w-full px-4 py-3 text-sm text-pink-100">
              Log out
            </button>
          </Panel>
        </div>
      ) : null}

      {activeTab === "reels" ? (
        <Panel className="p-6">
          <SectionHeader eyebrow="Reels" title="Your reels" copy="Delete removes the reel for everyone." />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dashReels.map((post) => {
              const reel = apiPostToReel(post);
              return (
                <div
                  key={reel.id}
                  className="overflow-hidden rounded-[1.1rem] border border-white/10 bg-white/5 transition hover:border-cyan-300/25"
                >
                  <Link href={`/app/reels?focus=${reel.id}`} className="block">
                    <div className="relative aspect-video overflow-hidden bg-black/40">
                      {reel.avatar.startsWith("/") ? (
                        <Image src={reel.avatar} alt="" fill sizes="33vw" className="object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={reel.avatar} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(8,10,28,0.75))]" />
                    </div>
                    <div className="p-4">
                      <p className="truncate font-semibold text-white">{reel.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{reel.caption}</p>
                    </div>
                  </Link>
                  <div className="border-t border-white/8 px-4 pb-4">
                    <button
                      type="button"
                      disabled={postBusyId === post.id}
                      onClick={() => void handleDeletePost(post.id, "REEL")}
                      className="w-full rounded-[0.85rem] border border-pink-300/28 bg-pink-500/12 py-2 text-xs font-semibold text-pink-100 transition hover:border-pink-300/45"
                    >
                      {postBusyId === post.id ? "Deleting…" : "Delete reel"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {dashReels.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--text-muted)]">No reels yet. Create one from the hero shortcuts.</p>
          ) : null}
          <Link href="/app/reels" className="suzi-secondary-btn mt-8 inline-flex px-4 py-3 text-sm">
            Open reels feed
          </Link>
        </Panel>
      ) : null}

      {activeTab === "snaps" ? (
        <Panel className="p-6">
          <SectionHeader eyebrow="Snaps" title="Your snaps" copy="Remove snaps you no longer want visible." />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dashSnaps.map((post) => {
              const snap = apiPostToSnap(post);
              return (
                <div key={snap.id} className="overflow-hidden rounded-[1.1rem] border border-white/10 bg-white/5 transition hover:border-fuchsia-300/25">
                  <Link href={`/app/snaps?focus=${encodeURIComponent(snap.id)}`} className="block">
                    <div className="relative aspect-[4/3]">
                      {snap.image.startsWith("/") ? (
                        <Image src={snap.image} alt="" fill sizes="33vw" className="object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={snap.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="p-4">
                      <p className="truncate font-semibold text-white">{snap.title}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{snap.likes} likes</p>
                    </div>
                  </Link>
                  <div className="border-t border-white/8 px-4 pb-4">
                    <button
                      type="button"
                      disabled={postBusyId === post.id}
                      onClick={() => void handleDeletePost(post.id, "SNAP")}
                      className="w-full rounded-[0.85rem] border border-pink-300/28 bg-pink-500/12 py-2 text-xs font-semibold text-pink-100 transition hover:border-pink-300/45"
                    >
                      {postBusyId === post.id ? "Deleting…" : "Delete snap"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {dashSnaps.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--text-muted)]">No snaps yet.</p>
          ) : null}
          <Link href="/app/snaps" className="suzi-secondary-btn mt-8 inline-flex px-4 py-3 text-sm">
            Open snaps feed
          </Link>
        </Panel>
      ) : null}

      {activeTab === "rooms" ? (
        <Panel className="p-6">
          <SectionHeader eyebrow="Rooms" title="Your rooms" copy="Leave memberships or delete rooms you own." />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {myRooms.map((room) => {
              const isOwner = session?.user.id === room.owner.id;
              const busy = roomBusySlug === room.slug;
              const cover = roomCover(room);
              return (
                <div
                  key={room.id}
                  className="flex flex-col gap-3 rounded-[1.15rem] border border-cyan-300/18 bg-[linear-gradient(155deg,rgba(255,32,121,0.08),rgba(0,229,255,0.06))] p-4 sm:flex-row"
                >
                  <Link href={`/app/rooms/${room.slug}`} className="flex min-w-0 flex-1 gap-4">
                    <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-[0.85rem] border border-white/10">
                      {cover.startsWith("http") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Image src={cover} alt="" fill sizes="96px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{room.name}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">{room.description ?? ""}</p>
                      <p className="mt-2 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-cyan-100/45">
                        {isOwner ? "You own this room" : "Member"}
                      </p>
                    </div>
                  </Link>
                  <div className="flex shrink-0 flex-col gap-2 sm:w-36">
                    {isOwner ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDeleteRoom(room.slug)}
                        className="rounded-[0.85rem] border border-pink-300/30 bg-pink-500/14 px-3 py-2 text-xs font-semibold text-pink-100"
                      >
                        {busy ? "Please wait…" : "Delete room"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleLeaveRoom(room.slug)}
                        className="rounded-[0.85rem] border border-white/14 bg-white/6 px-3 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-white"
                      >
                        {busy ? "Please wait…" : "Leave room"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {myRooms.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--text-muted)]">You have not joined any rooms yet.</p>
          ) : null}
        </Panel>
      ) : null}
    </section>
  );
}
