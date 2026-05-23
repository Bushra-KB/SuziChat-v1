"use client";

import { resolveUserAvatarUrl } from "@/lib/avatar-url";
import type { BlockedUserRow } from "@/lib/friends-client";

function blockedUserName(row: BlockedUserRow) {
  return row.user.displayName?.trim() || row.user.username;
}

export function DatingBlockedModal({
  rows,
  busy,
  onClose,
  onUnblock,
}: {
  rows: BlockedUserRow[];
  busy: boolean;
  onClose: () => void;
  onUnblock: (userId: string) => void;
}) {
  return (
    <div className="suzi-mobile-modal-root fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <div className="suzi-mobile-modal-panel max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[1.2rem] border border-white/12 bg-[rgba(14,16,34,0.98)] p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-semibold text-white">Blocked</p>
          <button type="button" className="text-slate-400 hover:text-white" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400/88">People you blocked are hidden from Suzi Dating and other social surfaces.</p>
        <div className="mt-4 space-y-3">
          {rows.length === 0 ? <p className="text-sm text-slate-400/88">No blocked people right now.</p> : null}
          {rows.map((row) => {
            const label = blockedUserName(row);
            return (
              <div key={row.id} className="flex items-center gap-3 rounded-[1rem] border border-fuchsia-300/20 bg-white/5 p-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-fuchsia-300/30 bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resolveUserAvatarUrl(row.user.avatarUrl)} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{label}</p>
                  <p className="truncate text-xs text-slate-400/90">@{row.user.username}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  className="suzi-secondary-btn px-3 py-1.5 text-xs"
                  onClick={() => onUnblock(row.user.id)}
                >
                  Unblock
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
