import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type {
  NotificationItem,
  Person,
  Reel,
  Room,
  Snap,
} from "@/lib/v1-mock-data";
import { Avatar, Chip, Icon, PanelMuted, StatusDot, cx } from "@/components/ui/suzi-primitives";

export function PersonRow({
  person,
  subtitle,
  action,
  compact = false,
}: {
  person: Person;
  subtitle?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex items-center justify-between gap-3 rounded-[1.1rem] border border-white/8 bg-white/4 px-3 py-3",
        compact && "px-2.5 py-2.5",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar
          src={person.avatar}
          alt={`${person.name} avatar`}
          size={compact ? 40 : 46}
          className={compact ? "h-10 w-10" : "h-11 w-11"}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-white">{person.name}</p>
            {person.status ? <StatusDot status={person.status} /> : null}
          </div>
          <p className="truncate text-sm text-slate-400">
            {subtitle ?? person.location ?? person.handle}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

export function RoomDirectoryCard({
  room,
  href = `/app/rooms/${room.id}`,
}: {
  room: Room;
  href?: string;
}) {
  return (
    <PanelMuted className="overflow-hidden p-0">
      <div className="relative h-28 overflow-hidden border-b border-white/8">
        <Image
          src={room.coverImage}
          alt={`${room.name} banner`}
          fill
          sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
        <div
          className={cx(
            "absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,24,0.05),rgba(10,12,24,0.46)),radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_48%)]",
            room.coverTone,
          )}
        />
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-white">{room.name}</p>
            <p className="mt-1 text-sm text-slate-400">{room.description}</p>
          </div>
          <Chip tone={room.privacy === "Private" ? "pink" : room.privacy === "Friends" ? "cyan" : "default"}>
            {room.privacy}
          </Chip>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {room.tags.map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-400">
            <span className="font-medium text-slate-200">{room.activeNow}</span>{" "}
            active now · {room.members.toLocaleString()} members
          </div>
          <Link
            href={href}
            className="suzi-secondary-btn inline-flex items-center gap-2 px-4 py-2 text-sm"
          >
            Open
            <Icon path="M9 6l6 6-6 6" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </PanelMuted>
  );
}

export function ThreadRow({
  person,
  preview,
  time,
  unread = 0,
  href,
  active = false,
}: {
  person: Person;
  preview: string;
  time: string;
  unread?: number;
  href: string;
  active?: boolean;
}) {
    return (
      <Link
        href={href}
        className={cx(
          "flex items-center gap-3 rounded-[1.1rem] border px-3 py-3 transition",
          active
            ? "border-fuchsia-400/20 bg-fuchsia-400/10"
            : "border-white/8 bg-white/4 hover:bg-white/6",
        )}
      >
        <Avatar
          src={person.avatar}
          alt={`${person.name} avatar`}
          size={46}
          className="h-11 w-11"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate font-medium text-white">{person.name}</p>
            <span className="text-xs text-slate-400">{time}</span>
          </div>
          <p className="truncate text-sm text-slate-400">{preview}</p>
        </div>
        {unread > 0 ? (
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-fuchsia-500/90 px-2 text-[0.7rem] font-semibold text-white">
            {unread}
          </span>
        ) : null}
      </Link>
    );
}

export function ChatBubble({
  author,
  message,
  time,
  kind,
}: {
  author: string;
  message: string;
  time: string;
  kind: "mine" | "other";
}) {
  const mine = kind === "mine";

  return (
    <div className={cx("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "max-w-[min(36rem,100%)] rounded-[1.3rem] border px-4 py-3",
          mine
            ? "border-fuchsia-400/18 bg-[linear-gradient(135deg,rgba(143,47,255,0.28),rgba(232,77,255,0.16))]"
            : "border-white/8 bg-white/4",
        )}
      >
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white">{author}</p>
          <span className="text-xs text-slate-500">{time}</span>
        </div>
        <p className="mt-2 text-sm leading-7 text-slate-200/88">{message}</p>
      </div>
    </div>
  );
}

export function SnapCard({
  snap,
  href = `/app/snaps/${snap.id}`,
}: {
  snap: Snap;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="overflow-hidden rounded-[1.2rem] border border-white/8 bg-[rgba(18,21,40,0.94)] transition hover:-translate-y-0.5 hover:border-white/12"
    >
      <div className="relative h-44 overflow-hidden">
        <Image
          src={snap.image}
          alt={`${snap.title} snap`}
          fill
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 33vw, 100vw"
          className="object-cover"
        />
        <div
          className={cx(
            "absolute inset-0 bg-[linear-gradient(180deg,rgba(9,11,24,0.08),rgba(9,11,24,0.28)),radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_42%)]",
            snap.tone,
          )}
        />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Avatar src={snap.avatar} alt={`${snap.author} avatar`} size={34} className="h-8 w-8" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{snap.author}</p>
            <p className="truncate text-xs text-slate-400">{snap.title}</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-300/80">{snap.caption}</p>
        <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
          <span>{snap.likes} likes</span>
          <span>{snap.comments} comments</span>
          <Chip tone={snap.visibility === "Public" ? "default" : "cyan"} className="ml-auto">
            {snap.visibility}
          </Chip>
        </div>
      </div>
    </Link>
  );
}

export function ReelCard({
  reel,
  href = `/app/reels?focus=${reel.id}`,
}: {
  reel: Reel;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="overflow-hidden rounded-[1.4rem] border border-white/8 bg-[rgba(18,21,40,0.94)] transition hover:-translate-y-0.5 hover:border-white/12"
    >
      <div className="relative aspect-[9/14] overflow-hidden">
        <video
          src={reel.video}
          className="h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-label={`${reel.author} reel`}
        />
        <div
          className={cx(
            "absolute inset-0 bg-[linear-gradient(180deg,rgba(9,11,24,0.06),rgba(9,11,24,0.18)_32%,rgba(9,11,24,0.58)),radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_38%)]",
            reel.tone,
          )}
        />
        <div className="absolute inset-x-4 bottom-4 rounded-[1.1rem] border border-white/10 bg-[rgba(9,11,24,0.72)] p-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Avatar src={reel.avatar} alt={`${reel.author} avatar`} size={34} className="h-8 w-8" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{reel.author}</p>
              <p className="truncate text-xs text-slate-400">{reel.views} views · {reel.likes} likes</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300/80">{reel.caption}</p>
        </div>
      </div>
    </Link>
  );
}

export function NotificationRow({ item }: { item: NotificationItem }) {
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-white/4 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-cyan-100/62">
              {item.type}
            </p>
            {item.unread ? (
              <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(232,77,255,0.72)]" />
            ) : null}
          </div>
          <p className="mt-2 text-base font-medium text-white">{item.title}</p>
          <p className="mt-1 text-sm text-slate-400">{item.copy}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{item.time}</span>
          <button type="button" className="suzi-secondary-btn px-3 py-2 text-xs">
            {item.action}
          </button>
        </div>
      </div>
    </div>
  );
}
