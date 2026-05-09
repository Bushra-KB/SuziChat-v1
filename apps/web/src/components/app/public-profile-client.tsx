"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, cx } from "@/components/ui/suzi-primitives";
import { resolveUserAvatarUrl } from "@/lib/avatar-url";
import {
  acceptFriendRequest,
  blockPerson,
  cancelOutgoingFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
  unfriend,
  unblockPerson,
} from "@/lib/friends-client";
import { getStoredAuthSession } from "@/lib/auth-client";
import { listRooms } from "@/lib/rooms-client";
import {
  getUserProfileView,
  getUserProfileViewByUserId,
  parseUsersApiError,
  type UserProfileView,
} from "@/lib/users-client";

function formatJoined(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
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
  tone = "cyan",
}: {
  label: string;
  value: string | number;
  tone?: "cyan" | "fuchsia" | "emerald" | "amber";
}) {
  const ring =
    tone === "fuchsia"
      ? "border-fuchsia-300/22 shadow-[0_0_20px_rgba(255,32,121,0.12)]"
      : tone === "emerald"
        ? "border-emerald-300/22 shadow-[0_0_18px_rgba(52,211,153,0.12)]"
        : tone === "amber"
          ? "border-amber-300/22 shadow-[0_0_18px_rgba(251,191,36,0.12)]"
          : "border-cyan-300/22 shadow-[0_0_18px_rgba(34,211,238,0.12)]";
  return (
    <div
      className={cx(
        "rounded-[1.05rem] border bg-[linear-gradient(155deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-4 py-3 text-center sm:text-left",
        ring,
      )}
    >
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-cyan-100/48">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums text-white sm:text-[1.65rem]">{value}</p>
    </div>
  );
}

export function PublicProfileClient(props: { username?: string; userId?: string }) {
  const { username, userId } = props;
  const router = useRouter();
  const [profileView, setProfileView] = useState<UserProfileView | null>(null);
  const [hostedRooms, setHostedRooms] = useState<Array<{ id: string; slug: string; name: string; description: string | null }>>(
    [],
  );
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    const s = getStoredAuthSession();
    if (!s) {
      setError("Not signed in.");
      setProfileView(null);
      return;
    }
    const id = userId?.trim();
    const slug = username?.trim();
    if (!id && !slug) {
      setError("Missing profile.");
      setProfileView(null);
      return;
    }
    const [view, rooms] = await Promise.all([
      id
        ? getUserProfileViewByUserId(s.accessToken, id)
        : getUserProfileView(s.accessToken, slug!),
      listRooms(),
    ]);
    setProfileView(view);
    setHostedRooms(
      rooms
        .filter((room) => room.owner.username === view.profile.username)
        .map((room) => ({
          id: room.id,
          slug: room.slug,
          name: room.name,
          description: room.description,
        })),
    );
  }, [username, userId]);

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
        return { label: "Friends", tone: "ok" as const };
      case "outgoing_request":
        return { label: "Request pending", tone: "pending" as const };
      case "incoming_request":
        return { label: "Requested you", tone: "accent" as const };
      case "blocked_by_me":
        return { label: "Blocked", tone: "warn" as const };
      case "blocked_you":
        return { label: "Unavailable", tone: "warn" as const };
      default:
        return { label: "Not connected", tone: "muted" as const };
    }
  }, [profileView]);

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
      <div className="suzi-app-frame-fill flex items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-200" />
          <p className="mt-4 text-sm text-[var(--text-muted)]">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!profileView) {
    return (
      <div className="suzi-app-frame-fill flex items-center justify-center px-4 py-6">
      <Panel className="border border-amber-300/22 bg-amber-500/10 p-8">
        <p className="text-lg font-semibold text-amber-100">{error || "Profile not found."}</p>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Check the username or try again later.</p>
        <Link href="/app" className="suzi-secondary-btn mt-6 inline-flex px-5 py-3 text-sm">
          Back to home
        </Link>
      </Panel>
      </div>
    );
  }

  if (profileView.relationship.kind === "self") {
    return (
      <div className="suzi-app-frame-fill flex items-center justify-center px-6">
        <p className="text-sm text-[var(--text-muted)]">Opening your profile…</p>
      </div>
    );
  }

  const user = profileView.profile;
  const relation = profileView.relationship;
  const displayName = user.displayName?.trim() || user.username;
  const avatarSrc = resolveUserAvatarUrl(user.avatarUrl);
  const counts = profileView.counts;

  const primaryFriendLabel =
    relation.kind === "none"
      ? "Add friend"
      : relation.kind === "incoming_request"
        ? "Accept request"
        : relation.kind === "friends"
          ? "Unfriend"
          : relation.kind === "blocked_by_me"
            ? "Unblock"
            : relation.kind === "outgoing_request"
              ? "Request sent"
              : relation.kind === "blocked_you"
                ? "Unavailable"
                : "You";

  const primaryDisabled =
    busy || relation.kind === "blocked_you" || relation.kind === "outgoing_request";

  const showDecline = relation.kind === "incoming_request";
  const showCancelRequest = relation.kind === "outgoing_request";

  return (
    <section className="suzi-app-frame-fill">
      <div className="suzi-app-frame-scroll suzi-thin-scroll space-y-[var(--row-gap)] pb-2 pr-1">
      {/* Cover + identity */}
      <div className="overflow-hidden rounded-[var(--panel-radius)] border border-white/10 bg-[linear-gradient(135deg,rgba(72,28,140,0.55),rgba(10,14,42,0.95))] shadow-[0_18px_44px_rgba(6,8,28,0.45)]">
        <div className="relative px-[var(--panel-pad)] py-[var(--panel-pad)]">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(ellipse_at_20%_0%,rgba(255,32,121,0.4),transparent_55%),radial-gradient(ellipse_at_80%_30%,rgba(0,229,255,0.2),transparent_50%)]" />
          <div className="relative grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="flex items-center gap-4">
              <div
                className="relative shrink-0 overflow-hidden rounded-full border-[3px] border-fuchsia-300/35 bg-[rgba(12,10,40,0.96)] shadow-[0_18px_40px_rgba(15,23,42,0.5)] ring-4 ring-[rgba(15,18,48,0.85)]"
                style={{ width: "var(--avatar-xl)", height: "var(--avatar-xl)" }}
              >
                {avatarSrc.startsWith("http://") || avatarSrc.startsWith("https://") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <Image src={avatarSrc} alt="" fill sizes="120px" className="object-cover" priority />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-[var(--fs-2xl)] font-bold tracking-tight text-white">{displayName}</h1>
                  {user.isEmailVerified ? (
                    <span
                      className="inline-flex items-center rounded-full border border-emerald-300/35 bg-emerald-400/14 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-emerald-100"
                      title="Verified email"
                    >
                      Verified
                    </span>
                  ) : null}
                  {user.isAdultConfirmed ? (
                    <span className="rounded-full border border-cyan-300/28 bg-cyan-400/12 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-cyan-50">
                      18+
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[var(--fs-sm)] font-medium text-cyan-100/75">@{user.username}</p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={cx(
                      "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]",
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
                  {user.country ? (
                    <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[0.72rem] text-[var(--text-muted)]">
                      {user.country}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.72rem] text-[var(--text-soft)]">
                    Joined {formatJoined(user.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 sm:min-w-[min(100%,20rem)]">
              <div className="flex flex-wrap justify-center gap-2 md:justify-end">
                {canOpenDm ? (
                  <Link
                    href={`/app/messages?with=${encodeURIComponent(user.id)}`}
                    className="suzi-primary-btn inline-flex min-h-[2.75rem] flex-1 items-center justify-center px-5 py-2.5 text-sm font-semibold sm:flex-none"
                  >
                    Message
                  </Link>
                ) : (
                  <span className="inline-flex min-h-[2.75rem] flex-1 cursor-not-allowed items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-[var(--text-muted)] sm:flex-none">
                    Messaging unavailable
                  </span>
                )}

                <button
                  type="button"
                  disabled={primaryDisabled}
                  onClick={() => void handlePrimaryFriendAction()}
                  className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-xl border border-fuchsia-300/35 bg-fuchsia-400/14 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-fuchsia-300/55 hover:bg-fuchsia-400/22 disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none"
                >
                  {busy ? "Please wait…" : primaryFriendLabel}
                </button>
              </div>

              <div className="flex flex-wrap justify-center gap-2 md:justify-end">
                {showDecline ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDeclineIncoming()}
                    className="suzi-secondary-btn min-h-[2.5rem] px-4 py-2 text-sm"
                  >
                    Decline
                  </button>
                ) : null}
                {showCancelRequest ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleCancelOutgoing()}
                    className="suzi-secondary-btn min-h-[2.5rem] px-4 py-2 text-sm"
                  >
                    Cancel request
                  </button>
                ) : null}

                {relation.kind !== "blocked_you" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleToggleBlock()}
                    className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-pink-300/30 bg-pink-500/12 px-4 py-2 text-sm font-semibold text-pink-100 transition hover:border-pink-300/45 hover:bg-pink-500/18"
                  >
                    {relation.kind === "blocked_by_me" ? "Unblock" : "Block"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {relation.kind === "friends" ? (
            <p className="relative mt-3 text-[var(--fs-xs)] text-cyan-100/55">
              Friends since {formatJoined(relation.friendsSince)}
            </p>
          ) : null}

          {relation.kind === "blocked_you" ? (
            <p className="relative mt-3 rounded-[1rem] border border-pink-300/22 bg-pink-500/10 px-4 py-3 text-[var(--fs-sm)] text-pink-100">
              You cannot interact with this account.
            </p>
          ) : null}

          {user.bio?.trim() ? (
            <p className="relative mt-3 max-w-3xl text-[var(--fs-sm)] leading-relaxed text-[var(--text-muted)]">
              <span className="mr-1 text-fuchsia-300">✦</span>
              {user.bio.trim()}
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <Panel className="border border-amber-300/28 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-100">{error}</p>
        </Panel>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-[var(--col-gap)] lg:grid-cols-4">
        <StatCard label="Friends" value={counts.friends} tone="cyan" />
        <StatCard label="Rooms" value={counts.rooms} tone="fuchsia" />
        <StatCard label="Snaps" value={counts.snaps} tone="emerald" />
        <StatCard label="Reels" value={counts.reels} tone="amber" />
      </div>

      {/* Bio (only shown if no bio in hero) */}
      {!user.bio?.trim() ? (
        <Panel className="border border-white/10 bg-[linear-gradient(160deg,rgba(28,18,82,0.45),rgba(12,10,40,0.65))] p-[var(--panel-pad)]">
          <p className="text-[var(--fs-2xs)] font-bold uppercase tracking-[0.26em] text-cyan-100/52">About</p>
          <p className="mt-2 text-[var(--fs-sm)] text-[var(--text-soft)]">No bio yet.</p>
          <p className="mt-1 text-[var(--fs-xs)] text-[var(--text-soft)]">@{user.username} hasn&apos;t written a bio yet.</p>
        </Panel>
      ) : null}

      {/* Hosted rooms */}
      <Panel className="p-[var(--panel-pad)]">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[var(--fs-2xs)] font-bold uppercase tracking-[0.22em] text-cyan-100/52">Hosted Spaces</p>
            <p className="mt-0.5 text-[var(--fs-xs)] text-[var(--text-soft)]">Rooms owned by @{user.username}</p>
          </div>
          <Link href="/app#rooms" className="text-[var(--fs-xs)] font-medium text-fuchsia-200/90 transition hover:text-fuchsia-100">
            View all rooms →
          </Link>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hostedRooms.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No rooms hosted yet.</p>
          ) : (
            hostedRooms.map((room) => (
              <Link
                key={room.id}
                href={`/app/rooms/${encodeURIComponent(room.slug)}`}
                className="group rounded-[1.1rem] border border-cyan-300/18 bg-[linear-gradient(155deg,rgba(255,32,121,0.08),rgba(0,229,255,0.05))] p-4 transition hover:border-cyan-300/35 hover:bg-white/6"
              >
                <p className="font-semibold text-white group-hover:text-cyan-100">{room.name}</p>
                {room.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--text-muted)]">{room.description}</p>
                ) : null}
                <p className="mt-3 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fuchsia-200/75">
                  Open room →
                </p>
              </Link>
            ))
          )}
        </div>
      </Panel>

      {/* Discover */}
      <Panel className="border border-white/10 p-[var(--panel-pad)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[var(--fs-2xs)] font-bold uppercase tracking-[0.22em] text-cyan-100/52">Snaps & Reels</p>
            <p className="mt-0.5 text-[var(--fs-xs)] text-[var(--text-soft)]">
              Recent snaps and reels from @{user.username}
            </p>
          </div>
          <Link href="/app/snaps" className="text-[var(--fs-xs)] font-medium text-fuchsia-200/90 transition hover:text-fuchsia-100">
            View all →
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/app/snaps" className="suzi-secondary-btn px-4 py-2 text-[var(--fs-xs)] font-semibold">
            Open snaps
          </Link>
          <Link href="/app/reels" className="suzi-secondary-btn px-4 py-2 text-[var(--fs-xs)] font-semibold">
            Open reels
          </Link>
        </div>
      </Panel>
      </div>
    </section>
  );
}
