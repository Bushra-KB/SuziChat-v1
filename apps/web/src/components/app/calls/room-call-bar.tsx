"use client";

import { Icon, cx } from "@/components/ui/suzi-primitives";
import { StreamAudio } from "@/components/app/calls/media-stream-view";

const micOnIcon =
  "M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm7-3a7 7 0 0 1-14 0M12 19v4M8 23h8";
const micOffIcon =
  "M3 3l18 18M9 9v2a3 3 0 0 0 4.5 2.6M15 11V5a3 3 0 0 0-5.9-.7M19 11a7 7 0 0 1-1.2 3.9M12 19v4M8 23h8";
const hangIcon =
  "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z";

export function RoomCallBar({
  remoteStreams,
  micEnabled,
  onToggleMic,
  onHangUp,
}: {
  remoteStreams: Record<string, MediaStream>;
  micEnabled: boolean;
  onToggleMic: () => void;
  onHangUp: () => void;
}) {
  const entries = Object.entries(remoteStreams);
  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] left-1/2 z-[360] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-cyan-300/25 bg-[rgba(12,16,38,0.96)] px-4 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md sm:bottom-4">
      {entries.map(([peerId, stream]) => (
        <StreamAudio key={peerId} stream={stream} />
      ))}
      <span className="flex h-2.5 w-2.5 items-center justify-center">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
      </span>
      <span className="text-sm font-medium text-white">
        Audio call · {entries.length + 1}
      </span>
      <button
        type="button"
        onClick={onToggleMic}
        aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
        className={cx(
          "inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition",
          micEnabled ? "bg-white/15 hover:bg-white/25" : "bg-rose-600 hover:bg-rose-500",
        )}
      >
        <Icon path={micEnabled ? micOnIcon : micOffIcon} className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onHangUp}
        aria-label="Leave call"
        className="inline-flex h-9 w-9 rotate-[135deg] items-center justify-center rounded-full bg-rose-600 text-white transition hover:bg-rose-500"
      >
        <Icon path={hangIcon} className="h-4 w-4" />
      </button>
    </div>
  );
}
