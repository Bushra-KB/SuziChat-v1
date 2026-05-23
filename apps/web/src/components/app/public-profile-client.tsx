"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listAction,
  listL1,
  listL2,
  listL3,
  listEmpty,
  listSection,
  panelLink,
  panelTitle,
} from "@/components/app/app-typography";
import { ProfileMediaGallery } from "@/components/app/profile-media-gallery";
import { ProfilePageShell } from "@/components/app/profile-page-shell";
import { Icon, Panel, cx } from "@/components/ui/suzi-primitives";
import { resolveUserAvatarUrl } from "@/lib/avatar-url";
import { getStoredAuthSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n";
import { listUserProfilePosts, type ApiPost } from "@/lib/posts-client";
import { usePublicProfileRealtime, useUserPresence } from "@/lib/use-profile-realtime";
import {
  acceptFriendRequest,
  blockPerson,
  cancelOutgoingFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
  unfriend,
  unblockPerson,
} from "@/lib/friends-client";
import { listRooms } from "@/lib/rooms-client";
import {
  getUserProfileView,
  getUserProfileViewByUserId,
  parseUsersApiError,
  type UserProfileView,
} from "@/lib/users-client";

function formatJoined(iso: string, locale?: string) {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function StatCard({
  label,
  value,
  sublabel,
  icon,
}: {
  label: string;
  value: string | number;
  sublabel: string;
  icon: string;
}) {
  return (
    <div className="suzi-public-stat-card">
      <span className="suzi-public-stat-icon" aria-hidden>
        <Icon path={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className={cx(listSection, "block text-cyan-100/58")}>{label}</span>
        <span className="mt-1 block text-[var(--fs-2xl)] font-bold leading-none text-white">{value}</span>
        <span className={cx(listL3, "mt-1 block text-[var(--text-soft)]")}>{sublabel}</span>
      </span>
    </div>
  );
}

function SectionTitle({
  icon,
  eyebrow,
  title,
  copy,
  action,
}: {
  icon: string;
  eyebrow: string;
  title: string;
  copy?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <span className="suzi-account-section-icon" aria-hidden>
          <Icon path={icon} className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className={cx(listSection, "text-cyan-100/58")}>{eyebrow}</p>
          <h2 className={cx(panelTitle, "mt-0.5")}>{title}</h2>
          {copy ? <p className={cx(listL2, "mt-0.5 text-[var(--text-soft)]")}>{copy}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function resolveMaybeMediaUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
    return url;
  }
  return `/${url.replace(/^\/+/, "")}`;
}

export function PublicProfileClient(props: { username?: string; userId?: string }) {
  const { language, t } = useI18n();
  const { username, userId } = props;
  const router = useRouter();
  const [profileView, setProfileView] = useState<UserProfileView | null>(null);
  const [hostedRooms, setHostedRooms] = useState<
    Array<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      imageUrl: string | null;
      privacy: string;
      members: number;
    }>
  >([]);
  const [profileSnaps, setProfileSnaps] = useState<ApiPost[]>([]);
  const [profileReels, setProfileReels] = useState<ApiPost[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const s = getStoredAuthSession();
    if (!s) {
      setError(t("rooms.notSignedIn"));
      setProfileView(null);
      return;
    }
    const id = userId?.trim();
    const slug = username?.trim();
    if (!id && !slug) {
      setError(t("profile.public.notFound"));
      setProfileView(null);
      return;
    }
    setAccessToken(s.accessToken);
    const view = id
      ? await getUserProfileViewByUserId(s.accessToken, id)
      : await getUserProfileView(s.accessToken, slug!);
    const [rooms, snaps, reels] = await Promise.all([
      listRooms(),
      listUserProfilePosts(s.accessToken, view.profile.id, "SNAP", 24).catch(() => []),
      listUserProfilePosts(s.accessToken, view.profile.id, "REEL", 24).catch(() => []),
    ]);
    setProfileView(view);
    setProfileSnaps(snaps);
    setProfileReels(reels);
    setHostedRooms(
      rooms
        .filter((room) => room.owner.username === view.profile.username)
        .map((room) => ({
          id: room.id,
          slug: room.slug,
          name: room.name,
          description: room.description,
          imageUrl: room.imageUrl,
          privacy: room.privacy,
          members: room._count?.memberships ?? 0,
        })),
    );
  }, [t, username, userId]);

  usePublicProfileRealtime(accessToken, profileView?.profile.id ?? null, () => {
    void loadData().catch(() => {});
  });

  const presence = useUserPresence(accessToken, profileView?.profile.id ?? null);

  useEffect(() => {
    let cancelled = false;
    setError("");
    setLoading(true);
    void loadData()
      .then(() => {
        if (!cancelled) {
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setProfileView(null);
          setError(parseUsersApiError(e));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  /** Own profile → account settings page */
  useEffect(() => {
    if (!loading && profileView?.relationship.kind === "self") {
      router.replace("/app/profile");
    }
  }, [loading, profileView?.relationship.kind, router]);

  const relationshipBadge = useMemo(() => {
    const relationship = profileView?.relationship;
    if (!relationship) {
      return { label: "", tone: "muted" as const };
    }
    switch (relationship.kind) {
      case "friends":
        return { label: t("common.friends"), tone: "ok" as const };
      case "outgoing_request":
        return { label: t("profile.public.requestPending"), tone: "pending" as const };
      case "incoming_request":
        return { label: t("profile.public.requestedYou"), tone: "accent" as const };
      case "blocked_by_me":
        return { label: t("friends.blocked"), tone: "warn" as const };
      case "blocked_you":
        return { label: t("profile.public.unavailable"), tone: "warn" as const };
      default:
        return { label: t("profile.public.notConnected"), tone: "muted" as const };
    }
  }, [profileView, t]);

  async function runReloadAfter(fn: () => Promise<void>) {
    const s = getStoredAuthSession();
    if (!s || !profileView) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await fn();
      await loadData();
    } catch (e) {
      setError(parseUsersApiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handlePrimaryFriendAction() {
    const s = getStoredAuthSession();
    if (!s || !profileView) {
      return;
    }
    const relation = profileView.relationship;
    await runReloadAfter(async () => {
      if (relation.kind === "none") {
        await sendFriendRequest(s.accessToken, profileView.profile.username);
      } else if (relation.kind === "incoming_request") {
        await acceptFriendRequest(s.accessToken, relation.requestId);
      } else if (relation.kind === "friends") {
        await unfriend(s.accessToken, profileView.profile.id);
      } else if (relation.kind === "blocked_by_me") {
        await unblockPerson(s.accessToken, profileView.profile.id);
      }
    });
  }

  async function handleDeclineIncoming() {
    const s = getStoredAuthSession();
    if (!s || !profileView) {
      return;
    }
    const rel = profileView.relationship;
    if (rel.kind !== "incoming_request") {
      return;
    }
    const requestId = rel.requestId;
    await runReloadAfter(async () => {
      await declineFriendRequest(s.accessToken, requestId);
    });
  }

  async function handleCancelOutgoing() {
    const s = getStoredAuthSession();
    if (!s || !profileView) {
      return;
    }
    const rel = profileView.relationship;
    if (rel.kind !== "outgoing_request") {
      return;
    }
    const requestId = rel.requestId;
    await runReloadAfter(async () => {
      await cancelOutgoingFriendRequest(s.accessToken, requestId);
    });
  }

  async function handleToggleBlock() {
    const s = getStoredAuthSession();
    if (!s || !profileView) {
      return;
    }
    if (profileView.relationship.kind === "blocked_you") {
      return;
    }
    await runReloadAfter(async () => {
      if (profileView.relationship.kind === "blocked_by_me") {
        await unblockPerson(s.accessToken, profileView.profile.id);
      } else {
        await blockPerson(s.accessToken, profileView.profile.id);
      }
    });
  }

  const canOpenDm = useMemo(() => {
    if (!profileView) {
      return false;
    }
    const k = profileView.relationship.kind;
    return k !== "blocked_you" && k !== "blocked_by_me";
  }, [profileView]);

  if (loading) {
    return (
      <ProfilePageShell>
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-200" />
            <p className="mt-4 text-sm text-[var(--text-muted)]">{t("profile.public.loading")}</p>
          </div>
        </div>
      </ProfilePageShell>
    );
  }

  if (!profileView) {
    return (
      <ProfilePageShell>
        <div className="flex flex-1 items-center justify-center px-4 py-6">
          <Panel className="border border-amber-300/22 bg-amber-500/10 p-8 text-center">
            <p className="text-lg font-semibold text-amber-100">{error || t("profile.public.notFound")}</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{t("profile.public.checkUsername")}</p>
            <Link href="/app" className="suzi-secondary-btn mt-6 inline-flex px-5 py-3 text-sm">
              {t("profile.public.backHome")}
            </Link>
          </Panel>
        </div>
      </ProfilePageShell>
    );
  }

  if (profileView.relationship.kind === "self") {
    return (
      <ProfilePageShell>
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="text-sm text-[var(--text-muted)]">{t("profile.public.openingOwn")}</p>
        </div>
      </ProfilePageShell>
    );
  }

  const user = profileView.profile;
  const relation = profileView.relationship;
  const displayName = user.displayName?.trim() || user.username;
  const avatarSrc = resolveUserAvatarUrl(user.avatarUrl);
  const counts = profileView.counts;

  const primaryFriendLabel =
    relation.kind === "none"
      ? t("friends.addFriend")
      : relation.kind === "incoming_request"
        ? t("profile.public.acceptRequest")
        : relation.kind === "friends"
          ? t("friends.unfriend")
          : relation.kind === "blocked_by_me"
            ? t("profile.public.unblock")
            : relation.kind === "outgoing_request"
              ? t("profile.public.requestSent")
              : relation.kind === "blocked_you"
                ? t("profile.public.unavailable")
                : t("profile.public.you");

  const primaryDisabled =
    busy || relation.kind === "blocked_you" || relation.kind === "outgoing_request";

  const showDecline = relation.kind === "incoming_request";
  const showCancelRequest = relation.kind === "outgoing_request";
  const userBio = user.bio?.trim();

  return (
    <ProfilePageShell>
      <div className="suzi-public-profile-layout">
        <Panel className="suzi-public-profile-hero overflow-hidden p-0">
          <div className="suzi-public-profile-hero-inner">
            <div className="suzi-public-profile-identity">
              <div className="suzi-public-profile-avatar">
                {avatarSrc.startsWith("http://") || avatarSrc.startsWith("https://") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <Image src={avatarSrc} alt="" fill sizes="120px" className="object-cover" priority />
                )}
                {relation.kind !== "blocked_you" ? (
                  <span
                    className={cx(
                      "absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-[#150c43]",
                      presence === "online"
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(110,255,178,0.75)]"
                        : presence === "away"
                          ? "bg-amber-300"
                          : "bg-slate-500",
                    )}
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className={cx(panelTitle, "truncate text-white")}>{displayName}</h1>
                  {user.isAdultConfirmed ? (
                    <span className={cx(listL3, "rounded-full border border-cyan-300/28 bg-cyan-400/12 px-2 py-0.5 font-bold text-cyan-50")}>
                      18+
                    </span>
                  ) : null}
                </div>
                <p className={cx(listL1, "mt-1 text-cyan-100/75")}>@{user.username}</p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={cx(
                      listSection,
                      "rounded-full border px-2.5 py-1",
                      relationshipBadge.tone === "ok"
                        ? "border-emerald-300/35 bg-emerald-400/14 text-emerald-100"
                        : relationshipBadge.tone === "accent"
                          ? "border-fuchsia-300/38 bg-fuchsia-400/16 text-pink-50"
                          : relationshipBadge.tone === "pending"
                            ? "border-amber-300/35 bg-amber-400/12 text-amber-100"
                            : relationshipBadge.tone === "warn"
                              ? "border-pink-300/35 bg-pink-500/14 text-pink-100"
                              : "border-white/14 bg-white/6 text-[var(--text-muted)]",
                    )}
                  >
                    {relationshipBadge.label}
                  </span>
                  {relation.kind === "friends" ? (
                    <span className={cx(listL3, "rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[var(--text-soft)]")}>
                      {t("profile.public.friendsSince")} {formatJoined(relation.friendsSince, language)}
                    </span>
                  ) : null}
                  {relation.kind !== "blocked_you" ? (
                    <span
                      className={cx(
                        listL3,
                        "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1",
                        presence === "online"
                          ? "text-emerald-300/90"
                          : presence === "away"
                            ? "text-amber-200/85"
                            : "text-[var(--text-soft)]",
                      )}
                    >
                      <span
                        className={cx(
                          "h-1.5 w-1.5 rounded-full",
                          presence === "online"
                            ? "bg-emerald-400 shadow-[0_0_8px_rgba(110,255,178,0.7)]"
                            : presence === "away"
                              ? "bg-amber-300"
                              : "bg-slate-500",
                        )}
                      />
                      {presence === "online" ? t("common.online") : presence === "away" ? t("common.away") : t("common.offline")}
                    </span>
                  ) : null}
                </div>

                {userBio ? (
                  <p className={cx(listL2, "mt-4 max-w-2xl leading-relaxed text-[var(--text-muted)]")}>
                    {userBio}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="suzi-public-profile-actions">
              {canOpenDm ? (
                <Link
                  href={`/app/messages?with=${encodeURIComponent(user.id)}`}
                  className="suzi-primary-btn inline-flex items-center justify-center gap-2 px-4 py-2"
                >
                  <Icon path="M4 6h16v10H8l-4 4V6Z" className="h-3.5 w-3.5" />
                  {t("friends.message")}
                </Link>
              ) : (
                <span className={cx(listL2, "inline-flex items-center justify-center rounded-[0.8rem] border border-white/10 bg-white/5 px-4 py-2 font-semibold text-[var(--text-muted)]")}>
                  {t("profile.public.messagingUnavailable")}
                </span>
              )}

              <button
                type="button"
                disabled={primaryDisabled}
                onClick={() => void handlePrimaryFriendAction()}
                className="suzi-secondary-btn inline-flex items-center justify-center px-4 py-2 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy ? t("profile.public.pleaseWait") : primaryFriendLabel}
              </button>

              {showDecline ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDeclineIncoming()}
                  className="suzi-secondary-btn inline-flex items-center justify-center px-4 py-2"
                >
                  {t("profile.public.decline")}
                </button>
              ) : null}

              {showCancelRequest ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCancelOutgoing()}
                  className="suzi-secondary-btn inline-flex items-center justify-center px-4 py-2"
                >
                  {t("friends.cancelRequest")}
                </button>
              ) : null}

              {relation.kind !== "blocked_you" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleToggleBlock()}
                  className={cx(listL2, "inline-flex items-center justify-center rounded-[0.8rem] border border-pink-300/30 bg-pink-500/12 px-4 py-2 font-semibold text-pink-100 transition hover:border-pink-300/45 hover:bg-pink-500/18")}
                >
                  {relation.kind === "blocked_by_me" ? t("profile.public.unblock") : t("friends.block")}
                </button>
              ) : null}
            </div>
          </div>

          {relation.kind === "blocked_you" ? (
            <p className={cx(listL2, "relative mx-[var(--panel-pad)] mb-[var(--panel-pad)] rounded-[1rem] border border-pink-300/22 bg-pink-500/10 px-4 py-3 text-pink-100")}>
              {t("profile.public.noInteraction")}
            </p>
          ) : null}
        </Panel>

        {error ? (
          <Panel className="border border-amber-300/28 bg-amber-500/10 p-4">
            <p className={cx(listL2, "text-amber-100")}>{error}</p>
          </Panel>
        ) : null}

        <div className="suzi-public-stats-grid">
          <StatCard
            label={t("profile.stats.friends")}
            value={counts.friends}
            sublabel={t("profile.public.people")}
            icon="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM6 21a6 6 0 0 1 12 0M8 13a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM2 19a4 4 0 0 1 6-3.5"
          />
          <StatCard
            label={t("profile.stats.rooms")}
            value={counts.rooms}
            sublabel={t("profile.public.hosted")}
            icon="M4 5h16v14H4V5Zm4 4h8M8 13h5"
          />
          <StatCard
            label={t("profile.stats.snaps")}
            value={counts.snaps}
            sublabel={t("profile.public.shared")}
            icon="M4 7h3l2-2h6l2 2h3v12H4V7Zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
          />
          <StatCard
            label={t("profile.stats.reels")}
            value={counts.reels}
            sublabel={t("profile.public.posted")}
            icon="M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm4 4 5 3-5 3V9Z"
          />
        </div>

        <Panel className="suzi-public-panel suzi-public-panel--light p-[var(--panel-pad)]">
          <SectionTitle
            icon="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0H4Z"
            eyebrow={t("profile.public.about")}
            title={userBio ? t("profile.public.bio") : t("profile.public.noBio")}
            copy={userBio ?? `@${user.username} ${t("profile.public.noBioCopy")}`}
          />
        </Panel>

        <Panel className="suzi-public-panel suzi-public-panel--light p-[var(--panel-pad)]">
          <SectionTitle
            icon="M4 5h16v14H4V5Zm4 4h8M8 13h5"
            eyebrow={t("profile.public.hostedSpaces")}
            title={t("profile.stats.rooms")}
            copy={`${t("profile.public.roomsOwnedBy")} @${user.username}`}
            action={
              <Link href="/app#rooms" className={panelLink}>
                {t("profile.public.viewAllRooms")}
              </Link>
            }
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {hostedRooms.length === 0 ? (
              <p className={cx(listEmpty, "rounded-[0.85rem] border border-cyan-300/14 bg-[rgba(18,13,65,0.45)] px-3 py-3 text-cyan-100/58")}>
                {t("profile.public.noRoomsHosted")}
              </p>
            ) : (
              hostedRooms.slice(0, 3).map((room) => {
                const roomImage = resolveMaybeMediaUrl(room.imageUrl);
                return (
                  <Link
                    key={room.id}
                    href={`/app/rooms/${encodeURIComponent(room.slug)}`}
                    className="suzi-public-room-card group"
                  >
                    <span className="suzi-public-room-thumb">
                      {roomImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={roomImage} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-fuchsia-400/12 text-cyan-100/78">
                          <Icon path="M4 5h16v14H4V5Zm4 4h8M8 13h5" className="h-5 w-5" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cx(listL1, "block truncate font-semibold text-white group-hover:text-cyan-100")}>
                        {room.name}
                      </span>
                      <span className={cx(listL3, "mt-1 flex flex-wrap items-center gap-2 text-[var(--text-soft)]")}>
                        <span>{room.members} {t("common.members")}</span>
                        <span className="opacity-40">·</span>
                        <span>{room.privacy}</span>
                      </span>
                    </span>
                    <span className={cx(listAction, "rounded-[0.55rem] border border-fuchsia-300/26 px-2 py-1 text-fuchsia-100/88")}>
                      {t("profile.public.openRoom")}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </Panel>

        <ProfileMediaGallery
          username={user.username}
          snaps={profileSnaps}
          reels={profileReels}
          loading={busy}
        />
      </div>
    </ProfilePageShell>
  );
}
