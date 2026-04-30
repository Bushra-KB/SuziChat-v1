"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MetricCard, Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import {
  acceptFriendRequest,
  blockPerson,
  sendFriendRequest,
  unfriend,
  unblockPerson,
} from "@/lib/friends-client";
import { getStoredAuthSession } from "@/lib/auth-client";
import { listRooms } from "@/lib/rooms-client";
import { getUserProfileView, parseUsersApiError, type UserProfileView } from "@/lib/users-client";

export function PublicProfileClient({ username }: { username: string }) {
  const [profileView, setProfileView] = useState<UserProfileView | null>(null);
  const [topRooms, setTopRooms] = useState<Array<{ id: string; slug: string; name: string }>>([]);
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
    const [view, rooms] = await Promise.all([
      getUserProfileView(s.accessToken, username),
      listRooms(),
    ]);
    setProfileView(view);
    setTopRooms(
      rooms
        .filter((room) => room.owner.username === view.profile.username)
        .slice(0, 3)
        .map((room) => ({ id: room.id, slug: room.slug, name: room.name })),
    );
  }, [username]);

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

  const relationshipLabel = useMemo(() => {
    const relationship = profileView?.relationship;
    if (!relationship) {
      return "";
    }
    switch (relationship.kind) {
      case "self":
        return "This is your profile";
      case "friends":
        return "You are friends";
      case "outgoing_request":
        return "Request sent";
      case "incoming_request":
        return "Wants to connect";
      case "blocked_by_me":
        return "Blocked by you";
      case "blocked_you":
        return "This user blocked you";
      default:
        return "Not connected yet";
    }
  }, [profileView]);

  async function runFriendAction() {
    const s = getStoredAuthSession();
    if (!s || !profileView) {
      return;
    }
    const relation = profileView.relationship;
    setBusy(true);
    setError("");
    try {
      if (relation.kind === "none") {
        await sendFriendRequest(s.accessToken, profileView.profile.username);
      } else if (relation.kind === "incoming_request") {
        await acceptFriendRequest(s.accessToken, relation.requestId);
      } else if (relation.kind === "friends") {
        await unfriend(s.accessToken, profileView.profile.id);
      } else if (relation.kind === "blocked_by_me") {
        await unblockPerson(s.accessToken, profileView.profile.id);
      } else if (relation.kind === "self" || relation.kind === "blocked_you" || relation.kind === "outgoing_request") {
        setBusy(false);
        return;
      }
      await loadData();
    } catch (e) {
      setError(parseUsersApiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function runBlockAction() {
    const s = getStoredAuthSession();
    if (!s || !profileView) {
      return;
    }
    if (profileView.relationship.kind === "self" || profileView.relationship.kind === "blocked_you") {
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (profileView.relationship.kind === "blocked_by_me") {
        await unblockPerson(s.accessToken, profileView.profile.id);
      } else {
        await blockPerson(s.accessToken, profileView.profile.id);
      }
      await loadData();
    } catch (e) {
      setError(parseUsersApiError(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Panel className="p-8">
        <p className="text-sm text-[var(--text-muted)]">Loading profile…</p>
      </Panel>
    );
  }

  if (!profileView) {
    return (
      <Panel className="p-8">
        <p className="text-lg font-semibold text-white">{error || "Profile not found."}</p>
        <Link href="/app/profile" className="suzi-secondary-btn mt-4 inline-flex px-4 py-3 text-sm">
          Back to profile
        </Link>
      </Panel>
    );
  }

  const user = profileView.profile;
  const label = user.displayName?.trim() || user.username;
  const actionDisabled =
    busy ||
    profileView.relationship.kind === "self" ||
    profileView.relationship.kind === "blocked_you" ||
    profileView.relationship.kind === "outgoing_request";
  const friendActionLabel =
    profileView.relationship.kind === "none"
      ? "Add friend"
      : profileView.relationship.kind === "incoming_request"
        ? "Accept request"
        : profileView.relationship.kind === "friends"
          ? "Unfriend"
          : profileView.relationship.kind === "blocked_by_me"
            ? "Unblock"
            : profileView.relationship.kind === "outgoing_request"
              ? "Request sent"
              : profileView.relationship.kind === "blocked_you"
                ? "Unavailable"
                : "This is you";

  return (
    <section className="space-y-6">
      <Panel className="overflow-hidden p-0">
        <div className="relative h-36 bg-[linear-gradient(145deg,rgba(88,36,175,0.55),rgba(18,24,72,0.72))] sm:h-44">
          <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>
        <div className="relative px-6 pb-7 pt-0 sm:px-8">
          <div className="-mt-14 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[1.35rem] border border-white/14 bg-[rgba(12,10,40,0.96)] shadow-[0_12px_40px_rgba(15,23,42,0.45)] sm:h-32 sm:w-32">
                <Image src={user.avatarUrl || "/ppic/ppic1.jpeg"} alt="" fill sizes="128px" className="object-cover" />
              </div>
              <div className="min-w-0 pb-1">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{label}</h1>
                <p className="mt-1 text-sm font-medium text-cyan-100/72">@{user.username}</p>
                {user.country ? (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{user.country}</p>
                ) : null}
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-cyan-100/62">{relationshipLabel}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Link href={`/app/messages?with=${encodeURIComponent(user.id)}`} className="suzi-primary-btn px-4 py-2.5 text-sm">
                Message
              </Link>
              <button
                type="button"
                disabled={actionDisabled}
                onClick={() => void runFriendAction()}
                className="suzi-secondary-btn px-4 py-2.5 text-sm disabled:opacity-60"
              >
                {friendActionLabel}
              </button>
              <button
                type="button"
                disabled={busy || profileView.relationship.kind === "self" || profileView.relationship.kind === "blocked_you"}
                onClick={() => void runBlockAction()}
                className="suzi-secondary-btn px-4 py-2.5 text-sm text-pink-100 disabled:opacity-60"
              >
                {profileView.relationship.kind === "blocked_by_me" ? "Unblock" : "Block"}
              </button>
            </div>
          </div>

          {user.bio ? (
            <p className="mt-6 max-w-3xl text-sm leading-7 text-[var(--text-muted)]">{user.bio}</p>
          ) : (
            <p className="mt-6 text-sm text-[var(--text-muted)]">No bio yet.</p>
          )}
        </div>
      </Panel>

      {error ? (
        <Panel className="border border-amber-300/28 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-100">{error}</p>
        </Panel>
      ) : null}

      <Panel className="p-5 sm:p-6">
        <SectionHeader eyebrow="Activity" title="At a glance" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Friends" value={String(profileView.counts.friends)} />
          <MetricCard label="Rooms" value={String(profileView.counts.rooms)} />
          <MetricCard label="Snaps" value={String(profileView.counts.snaps)} />
          <MetricCard label="Reels" value={String(profileView.counts.reels)} />
        </div>
      </Panel>

      <Panel className="p-5 sm:p-6">
        <SectionHeader eyebrow="Rooms" title="Hosted by this user" />
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {topRooms.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No public rooms to show yet.</p>
          ) : (
            topRooms.map((room) => (
              <Link
                key={room.id}
                href={`/app/rooms/${encodeURIComponent(room.slug)}`}
                className="rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:border-cyan-300/30"
              >
                {room.name}
              </Link>
            ))
          )}
        </div>
      </Panel>

      <Panel className="p-5 sm:p-6">
        <SectionHeader eyebrow="Social" title="Snaps & reels" copy="Explore shared media across SuziChat." />
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/app/snaps" className="suzi-secondary-btn px-4 py-2.5 text-sm">
            Snaps feed
          </Link>
          <Link href="/app/reels" className="suzi-secondary-btn px-4 py-2.5 text-sm">
            Reels
          </Link>
        </div>
      </Panel>
    </section>
  );
}
