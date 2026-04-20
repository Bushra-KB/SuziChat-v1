"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PersonRow } from "@/components/app/v1-blocks";
import {
  Chip,
  MetricCard,
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
  type UserProfile,
} from "@/lib/users-client";
import { getFriendsSummary, type FriendsSummary } from "@/lib/friends-client";
import { listPosts, type ApiPost } from "@/lib/posts-client";
import { apiPostToReel, apiPostToSnap } from "@/lib/post-ui-mappers";
import type { ApiRoom } from "@/lib/rooms-client";
import { listRooms } from "@/lib/rooms-client";
import { datingProfiles, games } from "@/lib/v1-mock-data";
import type { Person } from "@/lib/v1-mock-data";

const ACCOUNT_ROOM_COVER: Record<string, string> = {
  "general-chat": "/banner/general_chat_banner.png",
  "music-lounge": "/banner/Music_lounch_banner.png",
  "late-night-chat": "/banner/Late_Night_chat_banner.png",
  "movie-nights": "/banner/hobbies_banner.png",
  "gaming-hangout": "/banner/gamming_hangout_banner.png",
};

function summaryFriendToPerson(entry: FriendsSummary["friends"][0]): Person {
  return {
    id: entry.id,
    name: entry.displayName?.trim() || entry.username,
    handle: `@${entry.username}`,
    avatar: "/ppic/ppic1.jpeg",
    location: entry.country ?? undefined,
  };
}

const PROFILE_TABS = [
  { id: "overview", label: "Profile & edit" },
  { id: "feed", label: "Feeds" },
  { id: "friends", label: "Friends" },
  { id: "reels", label: "Reels" },
  { id: "snaps", label: "Snaps" },
  { id: "rooms", label: "Rooms" },
  { id: "games", label: "Games" },
  { id: "dating", label: "Dating" },
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

export function AccountProfilePage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({ displayName: "", bio: "", country: "" });
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [loadMessage, setLoadMessage] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
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

  const displayLabel = useMemo(() => {
    if (!session) {
      return "Account";
    }
    return session.user.displayName?.trim() || session.user.username;
  }, [session]);

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
      listRooms(),
      listPosts("SNAP", 48),
      listPosts("REEL", 48),
    ])
      .then(([friends, roomList, snapList, reelList]) => {
        if (cancelled) {
          return;
        }
        setDashFriends(friends);
        setDashRooms(roomList);
        setDashSnaps(snapList);
        setDashReels(reelList);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [session, loadState]);

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

  return (
    <section className="space-y-6">
      <Panel className="p-6 sm:p-7">
        <SectionHeader
          eyebrow="Account"
          title="Your SuziChat profile"
          copy="Edit how you appear across rooms, messages, and discovery. Live friend, room, and feed counts sync from the API when you are signed in."
          action={
            <Link href="/app/settings" className="suzi-secondary-btn shrink-0 px-4 py-2.5 text-sm">
              App settings
            </Link>
          }
        />
      </Panel>

      <Panel className="p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex flex-col items-center lg:w-52">
            <div className="relative h-32 w-32 overflow-hidden rounded-[1.35rem] border border-white/14 bg-[linear-gradient(145deg,rgba(232,77,255,0.22),rgba(82,213,255,0.12))] shadow-[0_14px_36px_rgba(15,23,42,0.35)]">
              <Image
                src="/ppic/ppic1.jpeg"
                alt=""
                fill
                sizes="128px"
                className="object-cover"
                priority
              />
              <span className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(8,8,28,0.72))] py-2 text-center text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/88">
                Avatar upload soon
              </span>
            </div>
            <button
              type="button"
              className="suzi-secondary-btn mt-4 w-full px-4 py-2.5 text-sm opacity-70"
              disabled
            >
              Upload avatar (soon)
            </button>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-cyan-100/60">Signed in as</p>
            <h2 className="text-2xl font-bold tracking-tight text-white">{displayLabel}</h2>
            {session ? (
              <p className="text-sm text-[var(--text-muted)]">
                @{session.user.username}
                <span className="mx-2 text-slate-500">·</span>
                {session.user.email}
              </p>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Loading session…</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-[0.7rem] font-medium text-cyan-100/72">
              {session?.user.isEmailVerified ? (
                <span className="rounded-full border border-emerald-300/35 bg-emerald-400/12 px-2.5 py-0.5 text-emerald-100">
                  Email verified
                </span>
              ) : (
                <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-2.5 py-0.5 text-amber-100">
                  Email not verified
                </span>
              )}
              {session?.user.isAdultConfirmed ? (
                <span className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-0.5">
                  18+ confirmed
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-cyan-100/58">Workspace</p>
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
            Check that the API is running and you are signed in. You can still edit locally once the request succeeds.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="suzi-secondary-btn mt-4 px-4 py-2 text-sm"
          >
            Retry
          </button>
        </Panel>
      ) : null}

      {activeTab === "overview" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
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
                {saveMessage ? (
                  <span
                    className={cx(
                      "text-sm",
                      saveState === "success" ? "text-emerald-200" : "text-amber-100",
                    )}
                  >
                    {saveMessage}
                  </span>
                ) : null}
              </div>
            </form>

            <div className="mt-10 border-t border-white/10 pt-8">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-100/65">Preferred language</p>
              <p className="mt-1 text-xs text-[var(--text-soft)]">
                Matches the header language picker when we connect i18n strings.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {languageOptions.map((language, index) => (
                  <button
                    key={language}
                    type="button"
                    onClick={() => setLangSelection(index)}
                    className="inline-flex"
                  >
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
            <Link href="/app/settings" className="suzi-primary-btn mt-6 flex w-full items-center justify-center px-4 py-3 text-sm">
              Full settings
            </Link>
            <button type="button" onClick={handleLogout} className="suzi-secondary-btn mt-3 w-full px-4 py-3 text-sm text-pink-100">
              Log out
            </button>
          </Panel>
        </div>
      ) : null}

      {activeTab === "feed" ? (
        <Panel className="p-6 sm:p-7">
          <SectionHeader
            eyebrow="Dashboard"
            title="Your feeds & entry points"
            copy="Shortcuts mirror the home experience with live catalog counts from the API."
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Rooms" value={String(dashRooms.length)} />
            <MetricCard label="Direct threads" value="Live" tone="from-cyan-400/20 to-transparent" />
            <MetricCard label="Snaps catalog" value={String(dashSnaps.length)} tone="from-pink-400/22 to-transparent" />
            <MetricCard label="Reels" value={String(dashReels.length)} tone="from-violet-400/20 to-transparent" />
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/app" className="suzi-secondary-btn flex items-center justify-center px-4 py-4 text-sm font-medium">
              Home dashboard
            </Link>
            <Link href="/app/messages" className="suzi-secondary-btn flex items-center justify-center px-4 py-4 text-sm font-medium">
              Messages
            </Link>
            <Link href="/app/notifications" className="suzi-secondary-btn flex items-center justify-center px-4 py-4 text-sm font-medium">
              Notifications
            </Link>
          </div>
        </Panel>
      ) : null}

      {activeTab === "friends" ? (
        <Panel className="p-6">
          <SectionHeader eyebrow="Friends" title="People you know" copy="Your accepted friends from the server." />
          <div className="mt-6 space-y-3">
            {!dashFriends ? (
              <p className="text-sm text-[var(--text-muted)]">Loading friends…</p>
            ) : dashFriends.friends.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No friends yet. Send invites from the Friends page.</p>
            ) : (
              dashFriends.friends.map((entry) => {
                const person = summaryFriendToPerson(entry);
                return (
                  <PersonRow
                    key={person.id}
                    person={person}
                    compact
                    action={
                      <Link
                        href={`/app/profile/${encodeURIComponent(person.handle.replace(/^@/, "") || person.id)}`}
                        className="suzi-secondary-btn px-3 py-2 text-xs"
                      >
                        Profile
                      </Link>
                    }
                  />
                );
              })
            )}
          </div>
          <Link href="/app/friends" className="suzi-secondary-btn mt-6 inline-flex px-4 py-3 text-sm">
            Open friends list
          </Link>
        </Panel>
      ) : null}

      {activeTab === "reels" ? (
        <Panel className="p-6">
          <SectionHeader eyebrow="Reels" title="Your reel activity" copy="Recent reels from the global catalog." />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dashReels.slice(0, 6).map((post) => {
              const reel = apiPostToReel(post);
              return (
                <Link
                  key={reel.id}
                  href={`/app/reels?focus=${reel.id}`}
                  className="overflow-hidden rounded-[1.1rem] border border-white/10 bg-white/5 transition hover:border-cyan-300/25 hover:bg-white/8"
                >
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
              );
            })}
          </div>
          <Link href="/app/reels" className="suzi-secondary-btn mt-8 inline-flex px-4 py-3 text-sm">
            Open reels
          </Link>
        </Panel>
      ) : null}

      {activeTab === "snaps" ? (
        <Panel className="p-6">
          <SectionHeader eyebrow="Snaps" title="Your snaps" copy="Thumbnails from the shared catalog." />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dashSnaps.slice(0, 6).map((post) => {
              const snap = apiPostToSnap(post);
              return (
                <Link
                  key={snap.id}
                  href={`/app/snaps/${snap.id}`}
                  className="block overflow-hidden rounded-[1.1rem] border border-white/10 bg-white/5 transition hover:border-fuchsia-300/25"
                >
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
              );
            })}
          </div>
          <Link href="/app/snaps" className="suzi-secondary-btn mt-8 inline-flex px-4 py-3 text-sm">
            Open snaps feed
          </Link>
        </Panel>
      ) : null}

      {activeTab === "rooms" ? (
        <Panel className="p-6">
          <SectionHeader eyebrow="Rooms" title="Chat rooms" copy="Jump back into community spaces." />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {dashRooms.map((room) => (
              <Link
                key={room.id}
                href={`/app/rooms/${room.slug}`}
                className="flex gap-4 rounded-[1.15rem] border border-cyan-300/18 bg-[linear-gradient(155deg,rgba(255,32,121,0.08),rgba(0,229,255,0.06))] p-4 transition hover:border-cyan-300/30"
              >
                <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-[0.85rem] border border-white/10">
                  <Image
                    src={ACCOUNT_ROOM_COVER[room.slug] ?? "/banner/general_chat_banner.png"}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white">{room.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">{room.description ?? ""}</p>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}

      {activeTab === "games" ? (
        <Panel className="p-6">
          <SectionHeader eyebrow="Games" title="Tables & lobbies" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {games.map((game) => (
              <Link
                key={game.id}
                href={`/app/games/${game.id}`}
                className="rounded-[1.1rem] border border-white/10 bg-white/5 p-4 transition hover:bg-white/8"
              >
                <div className="relative mx-auto aspect-[4/3] w-full max-w-[10rem]">
                  <Image src={game.icon} alt="" fill className="object-contain" />
                </div>
                <p className="mt-3 text-center font-semibold text-white">{game.name}</p>
              </Link>
            ))}
          </div>
          <Link href="/app/games" className="suzi-secondary-btn mt-8 inline-flex px-4 py-3 text-sm">
            All games
          </Link>
        </Panel>
      ) : null}

      {activeTab === "dating" ? (
        <Panel className="p-6">
          <SectionHeader eyebrow="Dating" title="Discover & matches" />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {datingProfiles.slice(0, 4).map((d) => (
              <Link
                key={d.id}
                href={`/app/dating/${d.id}`}
                className="rounded-[1.15rem] border border-pink-300/20 bg-pink-500/8 p-5 transition hover:border-pink-300/35"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 overflow-hidden rounded-full border border-white/12">
                    <Image src={d.avatar} alt="" width={56} height={56} className="object-cover" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{d.name}</p>
                    <p className="text-xs text-pink-100/80">{d.headline}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/app/dating" className="suzi-primary-btn px-4 py-3 text-sm">
              Dating home
            </Link>
            <Link href="/app/dating/matches" className="suzi-secondary-btn px-4 py-3 text-sm">
              Matches
            </Link>
          </div>
        </Panel>
      ) : null}
    </section>
  );
}
