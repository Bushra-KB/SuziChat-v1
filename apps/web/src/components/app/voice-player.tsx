"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, cx } from "@/components/ui/suzi-primitives";
import { formatClipDuration } from "@/lib/chat-attachments";

const playIcon = "M8 5v14l11-7z";
const pauseIcon = "M6 5h4v14H6zM14 5h4v14h-4z";

export function VoicePlayer({
  url,
  durationMs,
  mine,
}: {
  url: string;
  durationMs?: number | null;
  mine?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    const onTime = () => {
      const total = audio.duration && Number.isFinite(audio.duration) ? audio.duration : 0;
      setElapsedMs(audio.currentTime * 1000);
      setProgress(total > 0 ? Math.min(100, (audio.currentTime / total) * 100) : 0);
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
      setElapsedMs(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play();
      setPlaying(true);
    }
  }

  const remaining = playing || elapsedMs > 0 ? elapsedMs : (durationMs ?? 0);

  return (
    <div
      className={cx(
        "flex items-center gap-2.5 rounded-full px-2 py-1.5",
        mine ? "bg-white/15" : "bg-slate-100",
      )}
    >
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className={cx(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition",
          mine
            ? "bg-white/85 text-indigo-700 hover:bg-white"
            : "bg-indigo-600 text-white hover:bg-indigo-500",
        )}
      >
        <Icon path={playing ? pauseIcon : playIcon} className="h-4 w-4" />
      </button>
      <div className="min-w-[7rem] flex-1">
        <div className={cx("h-1.5 overflow-hidden rounded-full", mine ? "bg-white/30" : "bg-slate-300")}>
          <div
            className={cx("h-full rounded-full", mine ? "bg-white" : "bg-indigo-600")}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <span className={cx("shrink-0 text-xs tabular-nums", mine ? "text-white/85" : "text-slate-500")}>
        {formatClipDuration(remaining)}
      </span>
    </div>
  );
}
