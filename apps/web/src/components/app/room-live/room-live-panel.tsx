"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, createLocalTracks, type LocalTrack, type RemoteTrack } from "livekit-client";
import { cx } from "@/components/ui/suzi-primitives";
import type { RoomLiveSession, RoomLiveToken } from "@/lib/room-live-client";

export function RoomLivePanel({
  live,
  token,
  canEnd,
  onEnd,
  onLeave,
}: {
  live: RoomLiveSession;
  token: RoomLiveToken;
  canEnd: boolean;
  onEnd: () => void;
  onLeave: () => void;
}) {
  const [status, setStatus] = useState("Connecting…");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const localTracksRef = useRef<LocalTrack[]>([]);
  const localVideoRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoRef = useRef<HTMLDivElement | null>(null);
  const remoteAudioRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const attachTrack = (track: RemoteTrack) => {
      const element = track.attach();
      element.autoplay = true;
      if (element instanceof HTMLVideoElement) {
        element.playsInline = true;
      }
      element.className =
        track.kind === "video"
          ? "h-full w-full rounded-2xl object-cover"
          : "hidden";
      const target = track.kind === "video" ? remoteVideoRef.current : remoteAudioRef.current;
      target?.appendChild(element);
    };

    const detachTrack = (track: RemoteTrack) => {
      track.detach().forEach((element) => element.remove());
    };

    room.on(RoomEvent.TrackSubscribed, attachTrack);
    room.on(RoomEvent.TrackUnsubscribed, detachTrack);
    room.on(RoomEvent.Disconnected, () => setStatus("Disconnected"));

    async function connect() {
      try {
        await room.connect(token.livekitUrl, token.token);
        if (cancelled) return;
        if (token.role === "host") {
          const tracks = await createLocalTracks({
            audio: true,
            video: { resolution: { width: 1280, height: 720 } },
          });
          localTracksRef.current = tracks;
          for (const track of tracks) {
            await room.localParticipant.publishTrack(track);
            if (track.kind === "video") {
              const element = track.attach();
              element.muted = true;
              element.autoplay = true;
              if (element instanceof HTMLVideoElement) {
                element.playsInline = true;
              }
              element.className = "h-full w-full rounded-2xl object-cover";
              localVideoRef.current?.appendChild(element);
            }
          }
          setStatus("You are live");
          return;
        }
        setStatus("Watching live");
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Could not join live");
      }
    }

    void connect();

    return () => {
      cancelled = true;
      room.off(RoomEvent.TrackSubscribed, attachTrack);
      room.off(RoomEvent.TrackUnsubscribed, detachTrack);
      localTracksRef.current.forEach((track) => {
        track.detach().forEach((element) => element.remove());
        track.stop();
      });
      localTracksRef.current = [];
      room.disconnect();
      roomRef.current = null;
    };
  }, [token]);

  const isHost = token.role === "host";

  return (
    <div className="suzi-mobile-modal-root fixed inset-0 z-[1250] flex items-center justify-center bg-black/72 p-3 sm:p-5">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[1.35rem] border border-cyan-300/24 bg-[rgba(10,14,34,0.98)] shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-rose-200">
              Live
            </p>
            <h2 className="text-lg font-semibold text-white">{live.roomName}</h2>
            <p className="text-xs text-slate-300">
              {status} · Host: {live.host.displayName?.trim() || live.host.username}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isHost ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const next = !muted;
                    setMuted(next);
                    localTracksRef.current
                      .filter((track) => track.kind === "audio")
                      .forEach((track) => track.mute());
                    if (!next) {
                      localTracksRef.current
                        .filter((track) => track.kind === "audio")
                        .forEach((track) => track.unmute());
                    }
                  }}
                  className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {muted ? "Unmute" : "Mute"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !cameraOff;
                    setCameraOff(next);
                    localTracksRef.current
                      .filter((track) => track.kind === "video")
                      .forEach((track) => {
                        if (next) track.mute();
                        else track.unmute();
                      });
                  }}
                  className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {cameraOff ? "Camera on" : "Camera off"}
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={canEnd ? onEnd : onLeave}
              className={cx(
                "rounded-full px-4 py-2 text-sm font-bold text-white shadow-lg",
                canEnd ? "bg-rose-600 hover:bg-rose-500" : "bg-white/12 hover:bg-white/18",
              )}
            >
              {canEnd ? "End live" : "Leave"}
            </button>
          </div>
        </div>

        <div className="relative min-h-[18rem] flex-1 bg-black p-3 sm:min-h-[30rem]">
          <div ref={remoteAudioRef} />
          {isHost ? (
            <div ref={localVideoRef} className="h-full min-h-[18rem] sm:min-h-[30rem]" />
          ) : (
            <div ref={remoteVideoRef} className="h-full min-h-[18rem] sm:min-h-[30rem]">
              <div className="flex h-full min-h-[18rem] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm text-slate-300 sm:min-h-[30rem]">
                Waiting for host video…
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
