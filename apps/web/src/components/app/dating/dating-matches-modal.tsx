"use client";

import type { DatingMatchRow } from "@/lib/dating-client";
import { peerPhoto } from "@/components/app/dating/dating-utils";

export function DatingMatchesModal({
  matches,
  onClose,
  onChat,
  onUnmatch,
}: {
  matches: DatingMatchRow[];
  onClose: () => void;
  onChat: (row: DatingMatchRow) => void;
  onUnmatch: (matchId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[1.2rem] border border-white/12 bg-[rgba(14,16,34,0.98)] p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-semibold text-white">Matches</p>
          <button type="button" className="text-slate-400 hover:text-white" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {matches.length === 0 ? (
            <p className="text-sm text-slate-400/88">No matches yet. Keep browsing and show interest!</p>
          ) : null}
          {matches.map((m) => {
            const label = m.peer.user.displayName ?? m.peer.user.username;
            const photo = peerPhoto(m);
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-[1rem] border border-white/10 bg-white/5 p-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-fuchsia-300/30 bg-slate-800">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm text-white/60">
                      {label.slice(0, 1)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{label}</p>
                  {m.lastMessage ? (
                    <p className="truncate text-xs text-slate-400/90">{m.lastMessage.body}</p>
                  ) : (
                    <p className="text-xs text-fuchsia-200/70">Say hi — new match</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button type="button" className="suzi-primary-btn px-3 py-1.5 text-xs" onClick={() => onChat(m)}>
                    Chat
                  </button>
                  <button type="button" className="text-[0.65rem] text-rose-300/90 hover:underline" onClick={() => onUnmatch(m.id)}>
                    Unmatch
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
