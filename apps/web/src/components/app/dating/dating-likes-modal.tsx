"use client";

import type { DatingDiscoverItem } from "@/lib/dating-client";
import { cardImageUrl, datingDisplayName } from "@/components/app/dating/dating-utils";

export function DatingLikesModal({
  title = "Interested in you",
  copy = "People who liked you - respond with Interested or Not interested.",
  emptyLabel = "No new likes right now.",
  items,
  busy,
  onClose,
  onInterested,
  onPass,
  onRemoveInterest,
}: {
  title?: string;
  copy?: string;
  emptyLabel?: string;
  items: DatingDiscoverItem[];
  busy: boolean;
  onClose: () => void;
  onInterested?: (userId: string) => void;
  onPass?: (userId: string) => void;
  onRemoveInterest?: (userId: string) => void;
}) {
  return (
    <div className="suzi-mobile-modal-root fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <div className="suzi-mobile-modal-panel max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[1.2rem] border border-white/12 bg-[rgba(14,16,34,0.98)] p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-semibold text-white">{title}</p>
          <button type="button" className="text-slate-400 hover:text-white" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400/88">{copy}</p>
        <div className="mt-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-slate-400/88">{emptyLabel}</p>
          ) : null}
          {items.map((item) => {
            const img = cardImageUrl(item);
            const name = datingDisplayName(item);
            return (
              <div key={item.userId} className="flex items-center gap-3 rounded-[1rem] border border-fuchsia-300/20 bg-white/5 p-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-fuchsia-300/30 bg-slate-800">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm text-white/60">
                      {name.slice(0, 1)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">
                    {name}
                    {item.age != null ? `, ${item.age}` : ""}
                  </p>
                  {item.headline ? <p className="truncate text-xs text-slate-400/90">{item.headline}</p> : null}
                </div>
                {onInterested || onPass || onRemoveInterest ? (
                  <div className="flex shrink-0 flex-col gap-1">
                    {onInterested ? (
                      <button
                        type="button"
                        disabled={busy}
                        className="suzi-primary-btn px-3 py-1.5 text-xs"
                        onClick={() => onInterested(item.userId)}
                      >
                        Interested
                      </button>
                    ) : null}
                    {onPass ? (
                      <button
                        type="button"
                        disabled={busy}
                        className="suzi-secondary-btn px-3 py-1.5 text-xs"
                        onClick={() => onPass(item.userId)}
                      >
                        Pass
                      </button>
                    ) : null}
                    {onRemoveInterest ? (
                      <button
                        type="button"
                        disabled={busy}
                        className="suzi-secondary-btn px-3 py-1.5 text-xs text-rose-100"
                        onClick={() => onRemoveInterest(item.userId)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
