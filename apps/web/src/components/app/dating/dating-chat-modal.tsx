"use client";

import { useEffect, useRef } from "react";
import { Icon, cx } from "@/components/ui/suzi-primitives";
import { ChatComposer } from "@/components/app/chat-composer";
import { MessageAttachmentList } from "@/components/app/message-attachment";
import { useCall } from "@/components/app/calls/call-provider";
import type { DatingMatchRow, DatingMessageRow } from "@/lib/dating-client";
import type { ChatAttachment } from "@/lib/chat-attachments";
import { peerDatingName } from "@/components/app/dating/dating-utils";

const voiceCallIcon = "M5 3h3l2 5-2 1a11 11 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2Z";
const videoCallIcon = "M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm13 3 5-3v10l-5-3V10Z";

export function DatingChatModal({
  matchId,
  peer,
  messages,
  currentUserId,
  accessToken,
  peerTyping,
  onClose,
  onUnmatch,
  onTyping,
  onSend,
}: {
  matchId: string;
  peer: DatingMatchRow["peer"];
  messages: DatingMessageRow[];
  currentUserId: string | null;
  accessToken: string;
  peerTyping: boolean;
  onClose: () => void;
  onUnmatch: () => void;
  onTyping: (value: string) => void;
  onSend: (text: string, attachments: ChatAttachment[]) => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const peerName = peerDatingName({ id: matchId, createdAt: "", peer, lastMessage: null });
  const { startCall } = useCall();

  const callPeer = {
    id: peer.user.id,
    username: peer.user.username,
    displayName: peer.user.displayName,
    avatarUrl: peer.user.avatarUrl,
  };

  function startDatingCall(media: "AUDIO" | "VIDEO") {
    void startCall({ context: "DATING", targetKey: matchId, media, peer: callPeer });
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="suzi-mobile-modal-root fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <div className="suzi-mobile-modal-panel flex max-h-[88vh] w-full max-w-lg flex-col rounded-[1.2rem] border border-white/12 bg-[rgba(14,16,34,0.98)] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <p className="font-semibold text-white">{peerName}</p>
            <p className="text-[0.65rem] text-slate-400/88">Match chat · live</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Voice call"
              onClick={() => startDatingCall("AUDIO")}
              className="suzi-chat-header-action suzi-chat-header-action--audio"
            >
              <Icon path={voiceCallIcon} className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Video call"
              onClick={() => startDatingCall("VIDEO")}
              className="suzi-chat-header-action suzi-chat-header-action--video"
            >
              <Icon path={videoCallIcon} className="h-4 w-4" />
            </button>
            <button type="button" className="suzi-chat-header-action suzi-chat-header-action--delete px-3" onClick={onUnmatch}>
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
            if (msg.kind === "CALL") {
              return (
                <div key={msg.id} className="flex justify-center py-2">
                  <div className="suzi-chat-call-event">
                    <span className="suzi-chat-call-event__label">
                      Call
                    </span>
                    <span className="suzi-chat-call-event__body">{msg.body || "Call event"}</span>
                  </div>
                </div>
              );
            }
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
                {msg.body ? <p className="mt-1 whitespace-pre-wrap">{msg.body}</p> : null}
                <MessageAttachmentList attachments={msg.attachments} mine={mine} />
              </div>
            );
          })}
          {peerTyping ? <p className="text-xs text-fuchsia-200/80">Typing…</p> : null}
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t border-white/10 p-3">
          <ChatComposer
            attachInputId={`dating-chat-attachment-${matchId}`}
            accessToken={accessToken}
            placeholder="Message…"
            variant="onDark"
            onSend={onSend}
            onTyping={onTyping}
          />
        </div>
      </div>
    </div>
  );
}
