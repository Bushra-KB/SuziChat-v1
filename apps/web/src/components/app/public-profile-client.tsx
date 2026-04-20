"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Panel, SectionHeader } from "@/components/ui/suzi-primitives";
import type { PublicUser } from "@/lib/public-user-client";
import { getPublicUserByUsername } from "@/lib/public-user-client";

export function PublicProfileClient({ username }: { username: string }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    setLoading(true);
    void getPublicUserByUsername(username)
      .then((u) => {
        if (!cancelled) {
          setUser(u);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setError("Profile not found.");
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
  }, [username]);

  if (loading) {
    return (
      <Panel className="p-8">
        <p className="text-sm text-[var(--text-muted)]">Loading profile…</p>
      </Panel>
    );
  }

  if (!user || error) {
    return (
      <Panel className="p-8">
        <p className="text-lg font-semibold text-white">{error || "Profile not found."}</p>
        <Link href="/app/friends" className="suzi-secondary-btn mt-4 inline-flex px-4 py-3 text-sm">
          Back to friends
        </Link>
      </Panel>
    );
  }

  const label = user.displayName?.trim() || user.username;

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
                <Image src="/ppic/ppic1.jpeg" alt="" fill sizes="128px" className="object-cover" />
              </div>
              <div className="min-w-0 pb-1">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{label}</h1>
                <p className="mt-1 text-sm font-medium text-cyan-100/72">@{user.username}</p>
                {user.country ? (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{user.country}</p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Link href={`/app/messages?with=${encodeURIComponent(user.id)}`} className="suzi-primary-btn px-4 py-2.5 text-sm">
                Message
              </Link>
              <Link href="/app/friends" className="suzi-secondary-btn px-4 py-2.5 text-sm">
                Friends
              </Link>
            </div>
          </div>

          {user.bio ? (
            <p className="mt-6 max-w-3xl text-sm leading-7 text-[var(--text-muted)]">{user.bio}</p>
          ) : (
            <p className="mt-6 text-sm text-[var(--text-muted)]">No bio yet.</p>
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
