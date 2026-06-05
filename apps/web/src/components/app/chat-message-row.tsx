import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ChatLine } from "@/lib/v1-mock-data";
import { cx } from "@/components/ui/suzi-primitives";
import { MessageAttachmentList } from "@/components/app/message-attachment";
import { formatFirstNameLastInitial, resolveChatSender } from "@/lib/chat-display";
import type { ChatAttachment, ChatMessageKind } from "@/lib/chat-attachments";
import { resolveUserAvatarUrl } from "@/lib/avatar-url";
import { publicProfileHref } from "@/lib/profile-links";

export type LiveChatMessage = {
  kind?: ChatMessageKind;
  body: string;
  timeLabel: string;
  isMine: boolean;
  /** Prefer for profile links — avoids mixing display names into /profile/[slug]. */
  senderId?: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatarUrl?: string | null;
  attachments?: ChatAttachment[];
};

type ChatMessageRowProps =
  | { variant: "mock"; message: ChatLine }
  | { variant: "live"; message: LiveChatMessage; actions?: ReactNode; bodyOverride?: ReactNode };

function ChatBubble({
  mine,
  href,
  avatarSrc,
  shortLabel,
  timeLabel,
  body,
  profileAriaLabel,
  actions,
  bodyOverride,
  attachments,
}: {
  mine: boolean;
  href: string;
  avatarSrc: string;
  shortLabel: string;
  timeLabel: string;
  body: string;
  profileAriaLabel: string;
  actions?: ReactNode;
  bodyOverride?: ReactNode;
  attachments?: ChatAttachment[];
}) {
  return (
    <div className={cx("flex", mine ? "justify-end" : "justify-start")}>
      <article
        className={cx(
          "suzi-chat-bubble",
          mine ? "suzi-chat-bubble--mine" : "suzi-chat-bubble--theirs",
        )}
      >
        <div className="suzi-chat-bubble__meta">
          <Link
            href={href}
            className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/90"
            aria-label={profileAriaLabel}
          >
            <Image
              src={avatarSrc}
              alt=""
              width={16}
              height={16}
              className={cx(
                "suzi-chat-bubble__avatar",
                mine ? "ring-[1.5px] ring-fuchsia-400/55" : "ring-[1.5px] ring-sky-500/45",
              )}
            />
          </Link>
          <Link
            href={href}
            className={cx(
              "suzi-chat-bubble__name min-w-0 underline-offset-2 hover:underline",
              mine ? "suzi-chat-bubble__name--mine" : "suzi-chat-bubble__name--theirs",
            )}
          >
            {shortLabel}
          </Link>
          <span className="suzi-chat-bubble__time">{timeLabel}</span>
        </div>
        {bodyOverride ?? (body ? <p className="suzi-chat-bubble__body">{body}</p> : null)}
        <MessageAttachmentList attachments={attachments} mine={mine} />
        {actions ? <div className="suzi-chat-bubble__actions">{actions}</div> : null}
      </article>
    </div>
  );
}

export function ChatMessageRow(props: ChatMessageRowProps) {
  if (props.variant === "mock") {
    const line = props.message;
    const mine = line.kind === "mine";
    const sender = resolveChatSender(line.senderId);

    return (
      <ChatBubble
        mine={mine}
        href={sender.profileHref}
        avatarSrc={sender.avatar}
        shortLabel={formatFirstNameLastInitial(sender.fullName)}
        timeLabel={line.time}
        body={line.message}
        profileAriaLabel={`${sender.fullName} profile`}
      />
    );
  }

  const { message: live } = props;
  if (live.kind === "CALL") {
    return (
      <div className="flex justify-center py-1.5">
        <div className="rounded-full border border-cyan-300/20 bg-white/[0.07] px-3 py-1.5 text-center text-xs font-medium text-slate-300">
          {live.body || "Call event"}
        </div>
      </div>
    );
  }

  const mine = live.isMine;
  const href = publicProfileHref(live.senderUsername, {
    userId: live.senderId,
  });

  return (
    <ChatBubble
      mine={mine}
      href={href}
      avatarSrc={resolveUserAvatarUrl(live.senderAvatarUrl)}
      shortLabel={formatFirstNameLastInitial(live.senderDisplayName || live.senderUsername)}
      timeLabel={live.timeLabel}
      body={live.body}
      profileAriaLabel={`${live.senderDisplayName} profile`}
      actions={props.actions}
      bodyOverride={props.bodyOverride}
      attachments={live.attachments}
    />
  );
}
