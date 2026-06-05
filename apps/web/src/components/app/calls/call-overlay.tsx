"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Icon, cx } from "@/components/ui/suzi-primitives";
import { StreamAudio, StreamVideo } from "@/components/app/calls/media-stream-view";
import { resolveUserAvatarUrl } from "@/lib/avatar-url";
import type { CallMedia, CallPeer } from "@/lib/calls-realtime";
import type { CallPhase } from "@/components/app/calls/call-provider";

const micOnIcon =
  "M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm7-3a7 7 0 0 1-14 0M12 19v4M8 23h8";
const micOffIcon = "M3 3l18 18M9 9v2a3 3 0 0 0 4.5 2.6M15 11V5a3 3 0 0 0-5.9-.7M19 11a7 7 0 0 1-1.2 3.9M12 19v4M8 23h8";
const camOnIcon = "M23 7l-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z";
const camOffIcon = "M3 3l18 18M21 7l-5 3.5M16 16H3a2 2 0 0 1-2-2V8";
const hangIcon =
  "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z";

function CallTimer({ running }: { running: boolean }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) {
      return;
    }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const mm = Math.floor(seconds / 60);
  const ss = (seconds % 60).toString().padStart(2, "0");
  return <span className="tabular-nums">{`${mm}:${ss}`}</span>;
}

function CallAvatar({ peer, size = 96 }: { peer?: CallPeer; size?: number }) {
  return (
    <Image
      src={resolveUserAvatarUrl(peer?.avatarUrl)}
      alt=""
      width={size}
      height={size}
      className="rounded-full ring-2 ring-cyan-400/50"
    />
  );
}

export function CallOverlay({
  phase,
  media,
  context,
  peer,
  peerNames,
  localStream,
  remoteStreams,
  micEnabled,
  camEnabled,
  error,
  onToggleMic,
  onToggleCamera,
  onHangUp,
}: {
  phase: CallPhase;
  media: CallMedia;
  context: "DM" | "DATING" | "ROOM";
  peer?: CallPeer;
  peerNames: Record<string, CallPeer>;
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  micEnabled: boolean;
  camEnabled: boolean;
  error: string | null;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onHangUp: () => void;
}) {
  const remoteEntries = Object.entries(remoteStreams);
  const isVideo = media === "VIDEO";
  const headline =
    phase === "outgoing"
      ? `Calling ${peer?.displayName?.trim() || peer?.username || "…"}`
      : context === "ROOM"
        ? "Room audio call"
        : peer?.displayName?.trim() || peer?.username || "In call";

  const showVideoStage = isVideo && phase === "active" && remoteEntries.length > 0;

  return (
    <div className="fixed inset-0 z-[220] flex flex-col bg-[rgba(8,9,22,0.97)] pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="text-white">
          <p className="text-sm font-semibold">{headline}</p>
          <p className="text-xs text-slate-400">
            {phase === "active" ? <CallTimer running /> : "Ringing…"}
          </p>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
        {/* Audio of all remote peers always plays. */}
        {remoteEntries.map(([peerId, stream]) => (
          <StreamAudio key={`a-${peerId}`} stream={stream} />
        ))}

        {showVideoStage ? (
          <div className="relative h-full w-full max-w-4xl">
            <StreamVideo
              stream={remoteEntries[0]?.[1] ?? null}
              className="h-full w-full rounded-2xl object-cover"
            />
            <div className="absolute bottom-4 right-4 h-36 w-28 overflow-hidden rounded-xl border border-white/20 shadow-lg sm:h-44 sm:w-32">
              <StreamVideo
                stream={localStream}
                muted
                mirror
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            {context === "ROOM" ? (
              <div className="flex flex-wrap items-center justify-center gap-4">
                {remoteEntries.length === 0 ? (
                  <p className="text-sm text-slate-400">Waiting for others to join…</p>
                ) : (
                  remoteEntries.map(([peerId]) => (
                    <div key={peerId} className="flex flex-col items-center gap-2">
                      <CallAvatar peer={peerNames[peerId]} size={72} />
                      <span className="text-xs text-slate-300">
                        {peerNames[peerId]?.displayName?.trim() ||
                          peerNames[peerId]?.username ||
                          "Guest"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <>
                <CallAvatar peer={peer} />
                <p className="text-lg font-semibold text-white">
                  {peer?.displayName?.trim() || peer?.username}
                </p>
              </>
            )}
            {isVideo && phase === "active" ? (
              <div className="h-28 w-40 overflow-hidden rounded-xl border border-white/20">
                <StreamVideo stream={localStream} muted mirror className="h-full w-full object-cover" />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {error ? (
        <p className="px-5 pb-2 text-center text-sm text-rose-300">{error}</p>
      ) : null}

      <div className="flex items-center justify-center gap-5 px-5 pb-6 pt-3 sm:pb-9">
        <button
          type="button"
          onClick={onToggleMic}
          aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
          className={cx(
            "inline-flex h-13 w-13 items-center justify-center rounded-full p-3.5 text-white transition",
            micEnabled ? "bg-white/15 hover:bg-white/25" : "bg-rose-600 hover:bg-rose-500",
          )}
        >
          <Icon path={micEnabled ? micOnIcon : micOffIcon} className="h-5 w-5" />
        </button>

        {isVideo ? (
          <button
            type="button"
            onClick={onToggleCamera}
            aria-label={camEnabled ? "Turn camera off" : "Turn camera on"}
            className={cx(
              "inline-flex h-13 w-13 items-center justify-center rounded-full p-3.5 text-white transition",
              camEnabled ? "bg-white/15 hover:bg-white/25" : "bg-rose-600 hover:bg-rose-500",
            )}
          >
            <Icon path={camEnabled ? camOnIcon : camOffIcon} className="h-5 w-5" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={onHangUp}
          aria-label="Hang up"
          className="inline-flex h-14 w-14 rotate-[135deg] items-center justify-center rounded-full bg-rose-600 p-4 text-white shadow-lg transition hover:bg-rose-500"
        >
          <Icon path={hangIcon} className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
