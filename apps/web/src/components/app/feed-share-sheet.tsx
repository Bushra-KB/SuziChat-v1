"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui/suzi-primitives";

type FeedShareSheetProps = {
  open: boolean;
  shareUrl: string;
  itemLabel: string;
  onClose: () => void;
  onPointerDown?: (event: React.PointerEvent<HTMLElement>) => void;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
};

export function FeedShareSheet({
  open,
  shareUrl,
  itemLabel,
  onClose,
  onPointerDown,
  onClick,
}: FeedShareSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      return;
    }
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [open, shareUrl]);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        inputRef.current?.select();
        document.execCommand("copy");
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      inputRef.current?.select();
    }
  }, [shareUrl]);

  return (
    <div
      className={cx("absolute inset-0 z-[45]", open ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!open}
    >
      <button
        type="button"
        onPointerDown={onPointerDown}
        onClick={(event) => {
          onClick?.(event);
          onClose();
        }}
        className={cx(
          "absolute inset-0 bg-[rgba(5,8,24,0.62)] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        aria-label="Close share dialog"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feed-share-title"
        onPointerDown={onPointerDown}
        onClick={onClick}
        className={cx(
          "absolute inset-x-3 top-[18%] rounded-[1rem] border border-cyan-300/28 bg-[linear-gradient(180deg,rgba(18,12,57,0.98),rgba(12,9,46,0.97))] px-3.5 py-3.5 shadow-[0_18px_40px_rgba(7,11,30,0.55)] backdrop-blur-xl sm:inset-x-5",
          "transition-[opacity,transform] duration-300",
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              id="feed-share-title"
              className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-cyan-100/88"
            >
              Share {itemLabel}
            </p>
            <p className="mt-0.5 text-[0.62rem] leading-snug text-cyan-100/68">Copy this link to share</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-cyan-100/72 transition hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="mt-3 flex items-stretch gap-2">
          <input
            ref={inputRef}
            readOnly
            value={shareUrl}
            className="h-9 min-w-0 flex-1 rounded-[0.75rem] border border-cyan-300/24 bg-[rgba(9,12,32,0.72)] px-2.5 text-[0.62rem] text-cyan-50 outline-none selection:bg-cyan-400/30"
            aria-label="Share link"
            onFocus={(event) => event.currentTarget.select()}
          />
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-[0.75rem] border border-cyan-300/28 bg-cyan-300/14 px-3 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-cyan-100 transition hover:border-cyan-200/58 hover:bg-cyan-300/24 hover:text-white"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
