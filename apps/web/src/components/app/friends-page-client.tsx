"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PersonRow } from "@/components/app/v1-blocks";
import { Chip, Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import { getStoredAuthSession } from "@/lib/auth-client";
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendsSummary,
  sendFriendRequest,
  unfriend,
  type FriendsSummary,
} from "@/lib/friends-client";
import type { Person } from "@/lib/v1-mock-data";

const defaultAvatar = "/ppic/ppic1.jpeg";

function friendUserToPerson(
  u: FriendsSummary["friends"][0],
): Person {
  return {
    id: u.id,
    name: u.displayName?.trim() || u.username,
    handle: `@${u.username}`,
    avatar: defaultAvatar,
    location: u.country ?? undefined,
  };
}

const blocked = [
  { name: "Spammer_44", reason: "Repeated room invites" },
  { name: "NightPing", reason: "Persistent unwanted DM" },
];

export function FriendsPageClient() {
  const [summary, setSummary] = useState<FriendsSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"friends" | "requests" | "blocked">("friends");

  const refresh = useCallback(async () => {
    const s = getStoredAuthSession();
    if (!s) {
      setError("Not signed in.");
      return;
    }
    setError("");
    const data = await getFriendsSummary(s.accessToken);
    setSummary(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void refresh()
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load friends.");
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
  }, [refresh]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const s = getStoredAuthSession();
    if (!s || !invite.trim()) {
      return;
    }
    setBusy(true);
    try {
      await sendFriendRequest(s.accessToken, invite.trim());
      setInvite("");
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  const spotlight = summary?.friends[0];

  return (
    <section className="space-y-6">
      <Panel className="p-6 sm:p-7">
        <SectionHeader
          eyebrow="Friends"
          title="Friends, requests, and trusted contacts"
          copy="Friend relationships power DMs and room invites. Data loads from your SuziChat account."
        />

        <form onSubmit={handleInvite} className="mt-6 flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Add by username or email
            </label>
            <input
              className="suzi-input"
              value={invite}
              onChange={(ev) => setInvite(ev.target.value)}
              placeholder="username or email"
              disabled={busy}
            />
          </div>
          <button type="submit" disabled={busy} className="suzi-primary-btn px-5 py-3 text-sm">
            Send request
          </button>
        </form>

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={() => setTab("friends")}>
            <Chip active={tab === "friends"} tone={tab === "friends" ? "pink" : "default"}>
              Friends
            </Chip>
          </button>
          <button type="button" onClick={() => setTab("requests")}>
            <Chip active={tab === "requests"} tone={tab === "requests" ? "cyan" : "default"}>
              Requests
            </Chip>
          </button>
          <button type="button" onClick={() => setTab("blocked")}>
            <Chip active={tab === "blocked"} tone="default">
              Blocked
            </Chip>
          </button>
        </div>
        {error ? <p className="mt-4 text-sm text-amber-100">{error}</p> : null}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="space-y-6">
          {tab === "friends" ? (
            <Panel className="p-5">
              <SectionHeader eyebrow="Friends List" title="Your mutual circle" />
              {loading ? (
                <p className="mt-5 text-sm text-[var(--text-muted)]">Loading…</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {summary?.friends.length ? (
                    summary.friends.map((f) => (
                      <PersonRow
                        key={f.friendshipId}
                        person={friendUserToPerson(f)}
                        action={
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/app/messages?with=${encodeURIComponent(f.id)}`}
                              className="suzi-secondary-btn px-3 py-2 text-xs"
                            >
                              DM
                            </Link>
                            <button
                              type="button"
                              className="suzi-secondary-btn px-3 py-2 text-xs"
                              onClick={async () => {
                                const s = getStoredAuthSession();
                                if (!s) {
                                  return;
                                }
                                await unfriend(s.accessToken, f.id);
                                await refresh();
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        }
                      />
                    ))
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">No friends yet — invite someone above.</p>
                  )}
                </div>
              )}
            </Panel>
          ) : null}

          {tab === "requests" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel className="p-5">
                <SectionHeader eyebrow="Requests" title="Incoming" />
                <div className="mt-5 space-y-3">
                  {summary?.incomingRequests.length ? (
                    summary.incomingRequests.map((req) => (
                      <div key={req.id} className="rounded-[1rem] border border-white/8 bg-white/4 p-4">
                        <p className="font-medium text-white">{req.user.displayName ?? req.user.username}</p>
                        <p className="mt-1 text-sm text-slate-400">{req.user.email}</p>
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            className="suzi-primary-btn px-4 py-2 text-xs"
                            onClick={async () => {
                              const s = getStoredAuthSession();
                              if (!s) {
                                return;
                              }
                              await acceptFriendRequest(s.accessToken, req.id);
                              await refresh();
                            }}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="suzi-secondary-btn px-4 py-2 text-xs"
                            onClick={async () => {
                              const s = getStoredAuthSession();
                              if (!s) {
                                return;
                              }
                              await declineFriendRequest(s.accessToken, req.id);
                              await refresh();
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">No incoming requests.</p>
                  )}
                </div>
              </Panel>
              <Panel className="p-5">
                <SectionHeader eyebrow="Requests" title="Outgoing" />
                <div className="mt-5 space-y-3">
                  {summary?.outgoingRequests.length ? (
                    summary.outgoingRequests.map((req) => (
                      <div key={req.id} className="rounded-[1rem] border border-white/8 bg-white/4 p-4">
                        <p className="font-medium text-white">{req.user.displayName ?? req.user.username}</p>
                        <p className="mt-1 text-sm text-slate-400">Pending</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">No outgoing requests.</p>
                  )}
                </div>
              </Panel>
            </div>
          ) : null}

          {tab === "blocked" ? (
            <Panel className="p-5">
              <SectionHeader eyebrow="Safety" title="Blocked users" />
              <div className="mt-5 space-y-3">
                {blocked.map((entry) => (
                  <div key={entry.name} className="rounded-[1rem] border border-white/8 bg-white/4 p-4">
                    <p className="font-medium text-white">{entry.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{entry.reason}</p>
                    <button type="button" className="suzi-secondary-btn mt-4 px-4 py-2 text-xs">
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>

        <Panel className="p-5">
          <SectionHeader eyebrow="Profile Preview" title={spotlight?.displayName ?? spotlight?.username ?? "Friends"} />
          <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(232,77,255,0.16),rgba(82,213,255,0.08))] p-5">
            {spotlight ? (
              <>
                <p className="text-sm text-slate-300/84">{spotlight.country ?? "—"}</p>
                <p className="mt-4 text-2xl font-semibold text-white">{spotlight.displayName ?? spotlight.username}</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Link href={`/app/messages?with=${encodeURIComponent(spotlight.id)}`} className="suzi-primary-btn px-4 py-3 text-center text-sm">
                    Send message
                  </Link>
                  <Link href={`/app/profile/${encodeURIComponent(spotlight.username)}`} className="suzi-secondary-btn px-4 py-3 text-center text-sm">
                    View profile
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Add friends to see highlights here.</p>
            )}
          </div>
        </Panel>
      </div>
    </section>
  );
}
