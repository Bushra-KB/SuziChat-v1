"use client";

import { Icon, cx } from "@/components/ui/suzi-primitives";
import { VoicePlayer } from "@/components/app/voice-player";
import { formatBytes, type ChatAttachment } from "@/lib/chat-attachments";

const fileIcon =
  "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6";
const downloadIcon = "M12 3v12m0 0l-4-4m4 4l4-4M5 21h14";

function FileCard({ attachment, mine }: { attachment: ChatAttachment; mine?: boolean }) {
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.fileName ?? undefined}
      className={cx(
        "group flex max-w-[16rem] items-center gap-2.5 rounded-xl border px-3 py-2 transition",
        mine
          ? "border-white/25 bg-white/10 hover:bg-white/20"
          : "border-slate-200 bg-slate-50 hover:bg-slate-100",
      )}
    >
      <span
        className={cx(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          mine ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700",
        )}
      >
        <Icon path={fileIcon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cx("block truncate text-sm font-medium", mine ? "text-white" : "text-slate-800")}>
          {attachment.fileName ?? "Attachment"}
        </span>
        <span className={cx("block text-xs", mine ? "text-white/70" : "text-slate-500")}>
          {formatBytes(attachment.sizeBytes)}
        </span>
      </span>
      <Icon
        path={downloadIcon}
        className={cx("h-4 w-4 shrink-0", mine ? "text-white/80" : "text-slate-400")}
      />
    </a>
  );
}

export function MessageAttachment({
  attachment,
  mine,
}: {
  attachment: ChatAttachment;
  mine?: boolean;
}) {
  if (attachment.kind === "IMAGE") {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.fileName ?? "Image attachment"}
          loading="lazy"
          className="max-h-64 max-w-[16rem] rounded-xl border border-black/10 object-cover"
        />
      </a>
    );
  }
  if (attachment.kind === "VOICE") {
    return <VoicePlayer url={attachment.url} durationMs={attachment.durationMs} mine={mine} />;
  }
  return <FileCard attachment={attachment} mine={mine} />;
}

export function MessageAttachmentList({
  attachments,
  mine,
}: {
  attachments?: ChatAttachment[] | null;
  mine?: boolean;
}) {
  if (!attachments || attachments.length === 0) {
    return null;
  }
  return (
    <div className="mt-1 flex flex-col gap-1.5">
      {attachments.map((attachment, index) => (
        <MessageAttachment key={attachment.id ?? `${attachment.url}-${index}`} attachment={attachment} mine={mine} />
      ))}
    </div>
  );
}
