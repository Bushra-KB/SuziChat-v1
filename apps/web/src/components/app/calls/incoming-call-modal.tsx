"use client";

import Image from "next/image";
import { Icon } from "@/components/ui/suzi-primitives";
import { resolveUserAvatarUrl } from "@/lib/avatar-url";
import type { CallMedia, CallPeer } from "@/lib/calls-realtime";

const phoneIcon =
  "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z";
const hangIcon = phoneIcon;

export function IncomingCallModal({
  peer,
  media,
  busy,
  onAccept,
  onDecline,
}: {
  peer: CallPeer;
  media: CallMedia;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const name = peer.displayName?.trim() || peer.username;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/12 bg-[rgba(14,16,34,0.98)] p-6 text-center shadow-2xl">
        <Image
          src={resolveUserAvatarUrl(peer.avatarUrl)}
          alt=""
          width={88}
          height={88}
          className="mx-auto h-22 w-22 animate-pulse rounded-full ring-2 ring-cyan-400/60"
        />
        <p className="mt-4 text-lg font-semibold text-white">{name}</p>
        <p className="mt-1 text-sm text-slate-400">
          Incoming {media === "VIDEO" ? "video" : "voice"} call…
        </p>
        <div className="mt-7 flex items-center justify-center gap-10">
          <button
            type="button"
            onClick={onDecline}
            className="flex flex-col items-center gap-1.5"
            aria-label="Decline call"
          >
            <span className="inline-flex h-14 w-14 rotate-[135deg] items-center justify-center rounded-full bg-rose-600 text-white shadow-lg transition hover:bg-rose-500">
              <Icon path={hangIcon} className="h-6 w-6" />
            </span>
            <span className="text-xs text-slate-400">Decline</span>
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={busy}
            className="flex flex-col items-center gap-1.5"
            aria-label="Accept call"
          >
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:bg-emerald-400 disabled:opacity-60">
              <Icon path={phoneIcon} className="h-6 w-6" />
            </span>
            <span className="text-xs text-slate-400">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}
