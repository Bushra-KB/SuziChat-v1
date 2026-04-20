import Image from "next/image";
import Link from "next/link";
import type { ChatLine } from "@/lib/v1-mock-data";
import { cx } from "@/components/ui/suzi-primitives";
import { formatFirstNameLastInitial, resolveChatSender } from "@/lib/chat-display";

const defaultAvatar = "/ppic/ppic1.jpeg";

export type LiveChatMessage = {
  body: string;
  timeLabel: string;
  isMine: boolean;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatarUrl?: string | null;
};

type ChatMessageRowProps =
  | { variant: "mock"; message: ChatLine }
  | { variant: "live"; message: LiveChatMessage };

export function ChatMessageRow(props: ChatMessageRowProps) {
  if (props.variant === "mock") {
    const line = props.message;
    const mine = line.kind === "mine";
    const sender = resolveChatSender(line.senderId);
    const shortLabel = formatFirstNameLastInitial(sender.fullName);

    const nameClass = mine
      ? "font-semibold text-fuchsia-800 underline-offset-2 hover:text-fuchsia-950 hover:underline"
      : "font-semibold text-sky-800 underline-offset-2 hover:text-sky-950 hover:underline";

    return (
      <div className={cx("flex gap-2", mine ? "justify-end" : "justify-start")}>
        <div
          className={cx(
            "max-w-[min(36rem,100%)] rounded-[0.85rem] border px-3 py-2.5 shadow-sm",
            mine ? "border-fuchsia-200/90 bg-fuchsia-50/95" : "border-slate-200 bg-slate-50/95",
          )}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link
              href={sender.profileHref}
              className="shrink-0 self-center rounded-full ring-2 ring-offset-1 ring-offset-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/90"
              aria-label={`${sender.fullName} profile`}
            >
              <Image
                src={sender.avatar}
                alt=""
                width={14}
                height={14}
                className={cx(
                  "h-3.5 w-3.5 rounded-full object-cover",
                  mine ? "ring-[1.5px] ring-fuchsia-400/55" : "ring-[1.5px] ring-sky-500/45",
                )}
              />
            </Link>
            <Link
              href={sender.profileHref}
              className={cx("min-w-0 text-[0.78rem] leading-tight", nameClass)}
            >
              {shortLabel}
            </Link>
            <span className="text-[0.7rem] text-slate-500">{line.time}</span>
          </div>
          <p className="mt-1.5 text-sm leading-6 text-slate-700">{line.message}</p>
        </div>
      </div>
    );
  }

  const { message: live } = props;
  const mine = live.isMine;
  const href = `/app/profile/${encodeURIComponent(live.senderUsername)}`;
  const avatarSrc = live.senderAvatarUrl?.trim() || defaultAvatar;
  const shortLabel = formatFirstNameLastInitial(live.senderDisplayName || live.senderUsername);

  const nameClass = mine
    ? "font-semibold text-fuchsia-800 underline-offset-2 hover:text-fuchsia-950 hover:underline"
    : "font-semibold text-sky-800 underline-offset-2 hover:text-sky-950 hover:underline";

  return (
    <div className={cx("flex gap-2", mine ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "max-w-[min(36rem,100%)] rounded-[0.85rem] border px-3 py-2.5 shadow-sm",
          mine ? "border-fuchsia-200/90 bg-fuchsia-50/95" : "border-slate-200 bg-slate-50/95",
        )}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link
            href={href}
            className="shrink-0 self-center rounded-full ring-2 ring-offset-1 ring-offset-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/90"
            aria-label={`${live.senderDisplayName} profile`}
          >
            <Image
              src={avatarSrc}
              alt=""
              width={14}
              height={14}
              className={cx(
                "h-3.5 w-3.5 rounded-full object-cover",
                mine ? "ring-[1.5px] ring-fuchsia-400/55" : "ring-[1.5px] ring-sky-500/45",
              )}
            />
          </Link>
          <Link href={href} className={cx("min-w-0 text-[0.78rem] leading-tight", nameClass)}>
            {shortLabel}
          </Link>
          <span className="text-[0.7rem] text-slate-500">{live.timeLabel}</span>
        </div>
        <p className="mt-1.5 text-sm leading-6 text-slate-700">{live.body}</p>
      </div>
    </div>
  );
}
