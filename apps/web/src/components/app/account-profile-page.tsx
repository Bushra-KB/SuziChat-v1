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
import { useI18n } from "@/lib/i18n";
import { loadProfilePrefs, saveProfilePrefs } from "@/lib/profile-prefs-storage";
import { useMyProfileRealtime } from "@/lib/use-profile-realtime";
import {
  changePassword,
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
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Costa Rica",
  "Cote d'Ivoire",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czechia",
  "Democratic Republic of the Congo",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kosovo",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Republic of the Congo",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
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
    username: p.username ?? "",
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

const QUICK_DEFAULTS = [
  {
    id: "showOnline",
    labelKey: "profile.quick.showOnline.label",
    copyKey: "profile.quick.showOnline.copy",
  },
  {
    id: "snapsFriends",
    labelKey: "profile.quick.snapsFriends.label",
    copyKey: "profile.quick.snapsFriends.copy",
  },
  {
    id: "roomInvites",
    labelKey: "profile.quick.roomInvites.label",
    copyKey: "profile.quick.roomInvites.copy",
  },
] as const;

const PRIVACY_FIELDS = [
  { id: "messages", labelKey: "profile.privacy.messages", options: ["Friends", "Everyone", "Nobody"] },
  { id: "snaps", labelKey: "profile.privacy.snaps", options: ["Friends", "Everyone", "Nobody"] },
  { id: "reels", labelKey: "profile.privacy.reels", options: ["Everyone", "Friends", "Nobody"] },
] as const;

function SectionIcon({ path }: { path: string }) {
  return (
    <span className="suzi-account-section-icon" aria-hidden>
      <Icon path={path} className="h-4 w-4" />
    </span>
  );
}

function formatProfileDate(iso?: string | null, locale?: string) {
  if (!iso) {
    return "—";
  }
  try {
    return new Date(iso).toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function AccountProfilePage() {
  const { language, t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({ username: "", displayName: "", bio: "", country: "" });
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [loadMessage, setLoadMessage] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ email: "" });
  const [emailState, setEmailState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [emailMessage, setEmailMessage] = useState("");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordState, setPasswordState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [passwordMessage, setPasswordMessage] = useState("");
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
      setLoadMessage(t("rooms.notSignedIn"));
      return;
    }
    setSession(s);
    setForm((f) => ({
      ...f,
      username: s.user.username ?? "",
      displayName: s.user.displayName ?? "",
    }));
    setEmailForm({ email: s.user.email ?? "" });
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
        setEmailForm({ email: p.email ?? "" });
        setLoadState("ready");
      })
      .catch((e) => {
        if (cancelled) {
          return;
        }
        setLoadState("error");
        setLoadMessage(parseUsersApiError(e));
        setProfile(null);
        setForm((f) => ({
          ...f,
          username: s.user.username ?? "",
          displayName: s.user.displayName ?? "",
        }));
        setEmailForm({ email: s.user.email ?? "" });
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

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
      username: form.username.trim(),
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
            email: updated.email,
            username: updated.username,
            displayName: updated.displayName,
            avatarUrl: updated.avatarUrl ?? s.user.avatarUrl,
            role: updated.role,
            isAdultConfirmed: updated.isAdultConfirmed,
            isEmailVerified: updated.isEmailVerified,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
          },
        };
        saveAuthSession(next);
        setSession(next);
        setSaveState("success");
        setSaveMessage(t("profile.saved"));
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

  function openEmailDialog() {
    const currentEmail = profile?.email ?? session?.user.email ?? "";
    setEmailForm({ email: currentEmail });
    setEmailState("idle");
    setEmailMessage("");
    setEmailDialogOpen(true);
  }

  function openPasswordDialog() {
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordState("idle");
    setPasswordMessage("");
    setPasswordDialogOpen(true);
  }

  function handleChangeEmail(event: React.FormEvent) {
    event.preventDefault();
    const s = sessionFromStorage();
    if (!s) {
      return;
    }
    setEmailState("saving");
    setEmailMessage("");
    void updateMyProfile(s.accessToken, { email: emailForm.email.trim() })
      .then((updated) => {
        setProfile(updated);
        setEmailForm({ email: updated.email });
        const next: AuthSession = {
          ...s,
          user: {
            ...s.user,
            email: updated.email,
            isEmailVerified: updated.isEmailVerified,
            updatedAt: updated.updatedAt,
          },
        };
        saveAuthSession(next);
        setSession(next);
        setEmailState("success");
        setEmailMessage(t("profile.emailDialog.updated"));
        setEmailDialogOpen(false);
      })
      .catch((e) => {
        setEmailState("error");
        setEmailMessage(parseUsersApiError(e));
      });
  }

  function handleChangePassword(event: React.FormEvent) {
    event.preventDefault();
    const s = sessionFromStorage();
    if (!s) {
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordState("error");
      setPasswordMessage(t("profile.passwordMismatch"));
      return;
    }
    setPasswordState("saving");
    setPasswordMessage("");
    void changePassword(s.accessToken, {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
      .then((result) => {
        setPasswordState("success");
        setPasswordMessage(result.message);
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setPasswordDialogOpen(false);
      })
      .catch((e) => {
        setPasswordState("error");
        setPasswordMessage(e instanceof Error ? e.message : t("profile.passwordError"));
      });
  }

  const avatarSrc = resolveAvatarSrc(profile, session);
  const friendsCount = dashFriends?.friends.length ?? 0;
  const roomsCount = myRooms.length;
  const lastUpdatedLabel = profile?.updatedAt
    ? `${t("profile.lastUpdated")} ${formatRelativeTime(profile.updatedAt, nowTick, language)}`
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
              <div className="suzi-account-avatar relative shrink-0 rounded-full border-2 border-fuchsia-300/40 shadow-[0_18px_40px_rgba(15,23,42,0.45)]">
                <div className="absolute inset-0 overflow-hidden rounded-full">
                  {avatarSrc.startsWith("/") ? (
                    <Image src={avatarSrc} alt="" fill sizes="120px" className="object-cover" priority />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                </div>
                <button
                  type="button"
                  disabled={avatarBusy}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={t("profile.changeAvatar")}
                  className="suzi-account-avatar-edit absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Icon path="M4 20h4l10-10-4-4L4 16v4Zm12-14 2-2 4 4-2 2-4-4Z" className="h-4 w-4" />
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
                <p className={cx(listSection, "suzi-account-eyebrow")}>{t("profile.myAccount")}</p>
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
                    {t("common.online")}
                  </span>
                </p>
                <p className={cx(listL2, "mt-2 max-w-md leading-relaxed text-cyan-100/58")}>
                  {t("profile.heroCopy")}
                </p>
                <div className="suzi-account-hero-actions mt-3">
                  <button
                    type="button"
                    onClick={scrollToAbout}
                    className="suzi-secondary-btn inline-flex items-center gap-2 px-4 py-2"
                  >
                    <Icon path="M4 20h4l10-10-4-4L4 16v4Zm12-14 2-2 4 4-2 2-4-4Z" className="h-3.5 w-3.5" />
                    {t("profile.editProfile")}
                  </button>
                  <button
                    type="button"
                    disabled={avatarBusy}
                    onClick={() => fileInputRef.current?.click()}
                    className="suzi-secondary-btn inline-flex items-center gap-2 px-4 py-2"
                  >
                    <Icon path="M4 7h3l2-2h6l2 2h3v12H4V7Zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" className="h-3.5 w-3.5" />
                    {t("profile.changeAvatar")}
                  </button>
                </div>
              </div>
            </div>

            <div className="suzi-account-stat-strip" aria-label={t("profile.activityLabel")}>
              <StatChip
                label={t("profile.stats.friends")}
                value={friendsCount}
                href="/app#friends"
                actionLabel={t("profile.stat.viewAll")}
                icon="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM6 21a6 6 0 0 1 12 0M8 13a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM2 19a4 4 0 0 1 6-3.5"
              />
              <StatChip
                label={t("profile.stats.rooms")}
                value={roomsCount}
                href="/app#rooms"
                actionLabel={t("profile.stat.viewAll")}
                icon="M3 4h18v6H3V4Zm0 10h18v6H3v-6Z"
              />
              <StatChip
                label={t("profile.stats.snaps")}
                value={snapsCount}
                href="/app/snaps"
                actionLabel={t("profile.stat.viewAll")}
                icon="M4 7h3l2-2h6l2 2h3v12H4V7Zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
              />
              <StatChip
                label={t("profile.stats.reels")}
                value={reelsCount}
                href="/app/reels"
                actionLabel={t("profile.stat.viewAll")}
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
                  <SectionIcon path="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM6 21a6 6 0 0 1 12 0M8 13a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM2 19a4 4 0 0 1 6-3.5" />
                  <div>
                    <h2 className={panelTitle}>{t("profile.stats.friends")}</h2>
                    <p className={cx(listL2, "mt-0.5 text-[var(--text-muted)]")}>
                      {t("profile.friends.copy")}
                    </p>
                  </div>
                </div>
                <Link
                  href="/app#friends"
                  className={panelLink}
                >
                  {t("profile.friends.viewAll")}
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
                    <h2 className={panelTitle}>{t("profile.details.title")}</h2>
                    <p className={cx(listL2, "mt-0.5 text-[var(--text-muted)]")}>
                      {t("profile.details.copy")}
                    </p>
                  </div>
                </div>
                <div className="suzi-account-field">
                  <label htmlFor="account-username" className={cx(listSection, "text-[var(--text-muted)]")}>
                    {t("profile.fields.username")}
                  </label>
                  <input
                    id="account-username"
                    autoComplete="username"
                    className={cx("suzi-input mt-1.5 w-full", listL1)}
                    value={form.username}
                    placeholder={t("profile.placeholders.username")}
                    minLength={3}
                    maxLength={32}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  />
                </div>
                <div className="suzi-account-field">
                  <label htmlFor="account-display-name" className={cx(listSection, "text-[var(--text-muted)]")}>
                    {t("profile.fields.displayName")}
                  </label>
                  <input
                    id="account-display-name"
                    className={cx("suzi-input mt-1.5 w-full", listL1)}
                    value={form.displayName}
                    placeholder={session?.user.username ?? t("profile.placeholders.yourName")}
                    maxLength={40}
                    onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  />
                </div>
                <div className="suzi-account-field">
                  <label htmlFor="account-bio" className={cx(listSection, "text-[var(--text-muted)]")}>
                    {t("profile.fields.aboutMe")}
                  </label>
                  <textarea
                    id="account-bio"
                    className={cx("suzi-input mt-1.5 min-h-[5.5rem] w-full resize-none", listL1)}
                    value={form.bio}
                    placeholder={t("profile.placeholders.shortBio")}
                    maxLength={280}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  />
                </div>

                <div className="suzi-account-field">
                <label htmlFor="account-country" className={cx(listSection, "text-[var(--text-muted)]")}>
                  {t("profile.fields.countryRegion")}
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
                    {t("profile.placeholders.selectCountry")}
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
                    placeholder={t("profile.placeholders.enterCountry")}
                    value={isListedCountry(form.country) ? "" : form.country}
                    maxLength={60}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  />
                ) : null}
                </div>

                <div className="suzi-account-readonly-grid">
                  <ProfileInfoRow label={t("profile.info.role")} value={profile?.role ?? session?.user.role ?? "USER"} />
                  <ProfileInfoRow
                    label={t("profile.info.adultConfirmed")}
                    value={(profile?.isAdultConfirmed ?? session?.user.isAdultConfirmed) ? t("profile.value.yes") : t("profile.value.no")}
                  />
                  <ProfileInfoRow
                    label={t("profile.info.emailVerified")}
                    value={(profile?.isEmailVerified ?? session?.user.isEmailVerified) ? t("profile.value.yes") : t("profile.value.no")}
                  />
                  <ProfileInfoRow label={t("profile.info.avatar")} value={profile?.avatarUrl || session?.user.avatarUrl || t("profile.value.defaultAvatar")} />
                  <ProfileInfoRow label={t("profile.info.created")} value={formatProfileDate(profile?.createdAt ?? session?.user.createdAt, language)} />
                  <ProfileInfoRow label={t("profile.info.updated")} value={formatProfileDate(profile?.updatedAt ?? session?.user.updatedAt, language)} />
                </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={saveState === "saving"}
                  className="suzi-primary-btn w-full py-2.5 font-semibold"
                >
                  {saveState === "saving" ? t("profile.saving") : t("profile.saveProfile")}
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
                <h2 className={panelTitle}>{t("profile.quickDefaults.title")}</h2>
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
                        <p className={cx(listL1, "font-medium text-white")}>{t(row.labelKey)}</p>
                        <p className={cx(listL3, "text-[var(--text-muted)]")}>{t(row.copyKey)}</p>
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
                <h2 className={panelTitle}>{t("profile.privacy.title")}</h2>
              </div>
              <div className="mt-3 space-y-2">
                {PRIVACY_FIELDS.map((field) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(8.5rem,42%)] items-center gap-3 rounded-[var(--panel-radius)] border border-white/8 bg-white/5 px-3 py-2.5"
                  >
                    <p className={cx(listL1, "min-w-0 truncate text-white")}>{t(field.labelKey)}</p>
                    <select
                      value={privacy[field.id] ?? field.options[0]}
                      onChange={(e) => setPrivacy((prev) => ({ ...prev, [field.id]: e.target.value }))}
                      className={cx("suzi-input w-full min-w-0 rounded-md px-2 py-1 font-semibold", listL2)}
                    >
                      {field.options.map((opt) => (
                        <option key={opt} value={opt} className="bg-[#1a1245]">
                          {opt === "Friends"
                            ? t("common.friends")
                            : opt === "Everyone"
                              ? t("profile.privacy.everyone")
                              : t("profile.privacy.nobody")}
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
                <h2 className={panelTitle}>{t("profile.account.title")}</h2>
              </div>
              <div className="mt-3 divide-y divide-white/8">
                <Link
                  href="/app/dating"
                  className={cx(listL1, "flex items-center justify-between gap-3 py-3 text-white transition hover:text-fuchsia-100")}
                >
                  <span>{t("profile.account.suziDating")}</span>
                  <Icon path="M9 6l6 6-6 6" className="h-3.5 w-3.5 text-white/55" />
                </Link>
                <AccountActionRow
                  label={t("profile.account.changeEmail")}
                  detail={profile?.email ?? session?.user.email ?? ""}
                  onClick={openEmailDialog}
                />
                <AccountActionRow label={t("profile.account.changePassword")} onClick={openPasswordDialog} />
              </div>
            </Panel>
          </aside>
        </div>

        {emailDialogOpen ? (
          <AccountModal title={t("profile.account.changeEmail")} onClose={() => setEmailDialogOpen(false)}>
            <form onSubmit={handleChangeEmail} className="space-y-3">
              <div>
                <label htmlFor="account-email-dialog" className={cx(listSection, "text-[var(--text-muted)]")}>
                  {t("profile.emailDialog.newEmail")}
                </label>
                <input
                  id="account-email-dialog"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={120}
                  className={cx("suzi-input mt-1.5 w-full", listL1)}
                  value={emailForm.email}
                  onChange={(e) => setEmailForm({ email: e.target.value })}
                />
                <p className={cx(listL3, "mt-1.5 text-[var(--text-soft)]")}>
                  {t("profile.emailDialog.copy")}
                </p>
              </div>
              {emailMessage ? (
                <p className={cx(listL2, emailState === "error" ? "text-pink-100" : "text-emerald-100")}>
                  {emailMessage}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEmailDialogOpen(false)}
                  className="suzi-secondary-btn px-4 py-2"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={emailState === "saving"}
                  className="suzi-primary-btn px-4 py-2"
                >
                  {emailState === "saving" ? t("profile.saving") : t("profile.emailDialog.save")}
                </button>
              </div>
            </form>
          </AccountModal>
        ) : null}

        {passwordDialogOpen ? (
          <AccountModal title={t("profile.account.changePassword")} onClose={() => setPasswordDialogOpen(false)}>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label htmlFor="account-current-password" className={cx(listSection, "text-[var(--text-muted)]")}>
                  {t("profile.passwordDialog.current")}
                </label>
                <input
                  id="account-current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className={cx("suzi-input mt-1.5 w-full", listL1)}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="account-new-password" className={cx(listSection, "text-[var(--text-muted)]")}>
                  {t("profile.passwordDialog.new")}
                </label>
                <input
                  id="account-new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className={cx("suzi-input mt-1.5 w-full", listL1)}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="account-confirm-password" className={cx(listSection, "text-[var(--text-muted)]")}>
                  {t("profile.passwordDialog.confirm")}
                </label>
                <input
                  id="account-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className={cx("suzi-input mt-1.5 w-full", listL1)}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                />
              </div>
              {passwordMessage ? (
                <p className={cx(listL2, passwordState === "error" ? "text-pink-100" : "text-emerald-100")}>
                  {passwordMessage}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordDialogOpen(false)}
                  className="suzi-secondary-btn px-4 py-2"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={passwordState === "saving"}
                  className="suzi-primary-btn px-4 py-2"
                >
                  {passwordState === "saving" ? t("profile.saving") : t("profile.passwordDialog.save")}
                </button>
              </div>
            </form>
          </AccountModal>
        ) : null}
      </div>
    </ProfilePageShell>
  );
}

function StatChip({
  label,
  value,
  icon,
  href,
  actionLabel,
}: {
  label: string;
  value: number;
  icon: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <Link href={href} className="suzi-account-stat-chip group">
      <span className="suzi-account-stat-chip-icon" aria-hidden>
        <Icon path={icon} className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="suzi-account-stat-chip-label">{label}</span>
        <span className="suzi-account-stat-chip-value">{value}</span>
        <span className="suzi-account-stat-chip-action">{actionLabel}</span>
      </span>
      <Icon path="M9 6l6 6-6 6" className="h-3 w-3 shrink-0 text-white/40 transition group-hover:text-fuchsia-200/90" />
    </Link>
  );
}

function ProfileInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[0.85rem] border border-white/8 bg-white/5 px-3 py-2">
      <p className={cx(listSection, "text-[var(--text-soft)]")}>{label}</p>
      <p className={cx(listL2, "mt-1 truncate text-white")} title={value}>
        {value}
      </p>
    </div>
  );
}

function AccountModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="suzi-account-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="suzi-account-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="account-modal-title" className={panelTitle}>
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white/80 transition hover:bg-white/12 hover:text-white"
          >
            <Icon path="M6 6l12 12M18 6 6 18" className="h-3.5 w-3.5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function AccountActionRow({
  label,
  detail,
  onClick,
}: {
  label: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(listL1, "flex w-full items-center justify-between gap-3 py-3 text-left text-white transition hover:text-fuchsia-100")}
    >
      <span>{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        {detail ? (
          <span className={cx(listL3, "max-w-[10rem] truncate text-[var(--text-muted)]")}>{detail}</span>
        ) : null}
        <Icon path="M9 6l6 6-6 6" className="h-3.5 w-3.5 shrink-0 text-white/55" />
      </span>
    </button>
  );
}
