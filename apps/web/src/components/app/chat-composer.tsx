"use client";

import { useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { Icon, cx } from "@/components/ui/suzi-primitives";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useVoiceRecorder } from "@/lib/use-voice-recorder";
import {
  formatBytes,
  formatClipDuration,
  uploadChatFile,
  uploadVoiceClip,
  validateChatFile,
  type ChatAttachment,
} from "@/lib/chat-attachments";

const attachIcon = "M12 5v14M5 12h14";
const micIcon =
  "M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm7-3a7 7 0 0 1-14 0M12 19v4M8 23h8";
const closeIcon = "M6 6l12 12M18 6L6 18";
const stopIcon = "M6 6h12v12H6z";

type StagedAttachment = ChatAttachment & { localId: string };

export function ChatComposer({
  attachInputId,
  accessToken,
  placeholder = "Type a message…",
  variant = "default",
  onSend,
  onTyping,
  disabled,
  rows = 1,
}: {
  attachInputId: string;
  accessToken: string;
  placeholder?: string;
  variant?: "default" | "onDark";
  onSend?: (text: string, attachments: ChatAttachment[]) => void | Promise<void>;
  onTyping?: (text: string) => void;
  disabled?: boolean;
  rows?: 1 | 2;
}) {
  const [text, setText] = useState("");
  const [staged, setStaged] = useState<StagedAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { isMobile } = useIsMobile();
  const recorder = useVoiceRecorder();
  const visibleRows = isMobile ? 1 : rows;

  const blocked = disabled || busy || recorder.state === "recording";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if ((!trimmed && staged.length === 0) || !onSend || disabled || busy) {
      return;
    }
    await onSend(trimmed, staged);
    setText("");
    setStaged([]);
    setError(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      for (const file of files) {
        const check = validateChatFile(file);
        if (!check.ok) {
          setError(check.message);
          continue;
        }
        const uploaded = await uploadChatFile(accessToken, file);
        setStaged((prev) => [
          ...prev,
          { ...uploaded, localId: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleRecording() {
    if (recorder.state === "recording") {
      const clip = await recorder.stop();
      if (!clip) {
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const uploaded = await uploadVoiceClip(accessToken, clip.blob, clip.durationMs);
        setStaged((prev) => [
          ...prev,
          { ...uploaded, localId: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save voice message.");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!recorder.isSupported) {
      setError("Voice recording is not supported in this browser.");
      return;
    }
    await recorder.start();
  }

  function removeStaged(localId: string) {
    setStaged((prev) => prev.filter((item) => item.localId !== localId));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cx(
        "rounded-[1.05rem] border p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
        variant === "onDark"
          ? "border-white/12 bg-[linear-gradient(180deg,rgba(238,242,255,0.14),rgba(224,231,255,0.08))]"
          : "border-slate-200/35 bg-[linear-gradient(180deg,#f4f5ff_0%,#e8ecff_100%)]",
      )}
    >
      {error ? (
        <p className="mb-2 rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-medium text-rose-200">
          {error}
        </p>
      ) : null}

      {staged.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {staged.map((item) => (
            <span
              key={item.localId}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs text-white"
            >
              {item.kind === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" className="h-6 w-6 rounded object-cover" />
              ) : null}
              <span className="max-w-[10rem] truncate">
                {item.kind === "VOICE"
                  ? `Voice • ${formatClipDuration(item.durationMs)}`
                  : (item.fileName ?? "Attachment")}
              </span>
              <span className="text-white/60">{formatBytes(item.sizeBytes)}</span>
              <button
                type="button"
                onClick={() => removeStaged(item.localId)}
                aria-label="Remove attachment"
                className="ml-0.5 rounded-full p-0.5 hover:bg-white/20"
              >
                <Icon path={closeIcon} className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-2 sm:gap-2.5">
        <input
          id={attachInputId}
          ref={fileInputRef}
          type="file"
          className="sr-only"
          multiple
          tabIndex={-1}
          onChange={handleFiles}
          disabled={blocked}
        />

        <label
          htmlFor={attachInputId}
          title="Add attachment"
          className={cx(
            "suzi-composer-attach-btn inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[0.7rem] border border-sky-400/55 bg-[linear-gradient(180deg,#2b5bd3_0%,#172a62_100%)] text-white shadow-[0_2px_8px_rgba(15,23,42,0.28)] transition hover:brightness-110",
            "focus-within:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/90",
            blocked && "pointer-events-none opacity-50",
          )}
        >
          <Icon path={attachIcon} className="h-[1.05rem] w-[1.05rem] stroke-[2.2]" />
          <span className="sr-only">Add attachment</span>
        </label>

        {recorder.state === "recording" ? (
          <div className="flex min-h-[2.75rem] flex-1 items-center justify-between gap-2 rounded-[0.75rem] border border-rose-300/70 bg-white px-3 shadow-sm">
            <span className="flex items-center gap-2 text-sm font-medium text-rose-600">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
              Recording {formatClipDuration(recorder.elapsedMs)}
            </span>
            <button
              type="button"
              onClick={recorder.cancel}
              className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div
            className={cx(
              "flex min-h-[2.75rem] min-w-0 flex-1 items-stretch overflow-hidden rounded-[0.75rem] border bg-white shadow-sm",
              variant === "onDark" ? "border-slate-300/85" : "border-slate-200/95",
            )}
          >
            <textarea
              name="message"
              rows={visibleRows}
              placeholder={placeholder}
              value={text}
              onKeyDown={handleKeyDown}
              onChange={(e) => {
                const next = e.target.value;
                setText(next);
                onTyping?.(next);
              }}
              disabled={disabled || busy}
              className={cx(
                "suzi-composer-textarea w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:opacity-60",
                visibleRows === 2 ? "min-h-[4.5rem] max-h-[8rem]" : "min-h-[2.75rem] max-h-[7.5rem]",
              )}
            />
            <div className="w-px shrink-0 bg-slate-200" aria-hidden />
            <button
              type="button"
              title="Record voice clip"
              onClick={toggleRecording}
              className="flex w-11 shrink-0 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/70 disabled:opacity-50"
              disabled={disabled || busy}
            >
              <Icon path={micIcon} className="h-[1.15rem] w-[1.15rem] stroke-[1.85]" />
              <span className="sr-only">Record voice</span>
            </button>
          </div>
        )}

        {recorder.state === "recording" ? (
          <button
            type="button"
            onClick={toggleRecording}
            title="Stop and attach"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.7rem] border border-rose-400/60 bg-[linear-gradient(180deg,#e11d48_0%,#9f1239_100%)] text-white shadow-[0_2px_8px_rgba(15,23,42,0.28)] transition hover:brightness-110"
          >
            <Icon path={stopIcon} className="h-4 w-4" />
            <span className="sr-only">Stop recording</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={blocked}
            className="suzi-composer-send-btn inline-flex h-11 min-w-[5.5rem] shrink-0 items-center justify-center rounded-[0.7rem] border border-sky-400/55 bg-[linear-gradient(180deg,#2b5bd3_0%,#172a62_100%)] px-4 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(15,23,42,0.28)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/90 disabled:opacity-50"
          >
            {busy ? "…" : "Send"}
          </button>
        )}
      </div>
    </form>
  );
}
