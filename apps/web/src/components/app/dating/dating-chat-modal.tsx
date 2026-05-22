"use client";

import { useEffect, useRef } from "react";
import { cx } from "@/components/ui/suzi-primitives";
import type { DatingMatchRow, DatingMessageRow } from "@/lib/dating-client";
import { peerDatingName } from "@/components/app/dating/dating-utils";

export function DatingChatModal({
  matchId,
  peer,
  messages,
  currentUserId,
  chatDraft,
  peerTyping,
  onClose,
  onUnmatch,
  onDraftChange,
  onSend,
}: {
  matchId: string;
  peer: DatingMatchRow["peer"];
  messages: DatingMessageRow[];
  currentUserId: string | null;
  chatDraft: string;
  peerTyping: boolean;
  onClose: () => void;
  onUnmatch: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const peerName = peerDatingName({ id: matchId, createdAt: "", peer, lastMessage: null });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-[1.2rem] border border-white/12 bg-[rgba(14,16,34,0.98)] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <p className="font-semibold text-white">{peerName}</p>
            <p className="text-[0.65rem] text-slate-400/88">Match chat · live</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="text-xs text-rose-300/90 hover:underline" onClick={onUnmatch}>
              Unmatch
            </button>
            <button type="button" className="text-slate-400 hover:text-white" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div className="min-h-[220px] flex-1 space-y-2 overflow-y-auto p-4">
          {messages.map((msg) => {
            const mine = currentUserId != null && msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={cx(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  mine ? "ml-auto bg-fuchsia-600/35 text-white" : "mr-auto bg-white/10 text-slate-100",
                )}
              >
                <p className="text-[0.62rem] uppercase tracking-wide text-slate-300/80">
                  {msg.sender.displayName ?? msg.sender.username}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{msg.body}</p>
              </div>
            );
          })}
          {peerTyping ? <p className="text-xs text-fuchsia-200/80">Typing…</p> : null}
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t border-white/10 p-3">
          <div className="flex gap-2">
            <input
              className="suzi-input flex-1"
              placeholder="Message…"
              value={chatDraft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <button type="button" className="suzi-primary-btn px-4 py-2 text-sm" onClick={onSend}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
