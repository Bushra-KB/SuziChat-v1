"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [reactions, setReactions] = useState({ likes: 0, cheers: 0 });
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const roomRef = useRef<Room | null>(null);
  const localTracksRef = useRef<LocalTrack[]>([]);
  const localVideoRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoRef = useRef<HTMLDivElement | null>(null);
  const remoteAudioRef = useRef<HTMLDivElement | null>(null);

  const pushActivity = useCallback((message: string) => {
    setActivityLog((prev) => [message, ...prev].slice(0, 3));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setHasRemoteVideo(false);
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const attachTrack = (track: RemoteTrack) => {
      const element = track.attach();
      element.autoplay = true;
      if (element instanceof HTMLVideoElement) {
        element.playsInline = true;
      }
      element.className = track.kind === "video" ? "h-full w-full object-contain" : "hidden";
      const target = track.kind === "video" ? remoteVideoRef.current : remoteAudioRef.current;
      if (track.kind === "video") {
        target?.replaceChildren(element);
        setHasRemoteVideo(true);
        return;
      }
      target?.appendChild(element);
    };

    const detachTrack = (track: RemoteTrack) => {
      track.detach().forEach((element) => element.remove());
      if (track.kind === "video") {
        setHasRemoteVideo(false);
      }
    };
    const onParticipantConnected = () => pushActivity("Someone joined the live.");
    const onParticipantDisconnected = () => pushActivity("Someone left the live.");

    room.on(RoomEvent.TrackSubscribed, attachTrack);
    room.on(RoomEvent.TrackUnsubscribed, detachTrack);
    room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
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
          pushActivity("You started the live.");
          return;
        }
        setStatus("Watching live");
        pushActivity("You joined the live.");
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Could not join live");
      }
    }

    void connect();

    return () => {
      cancelled = true;
      room.off(RoomEvent.TrackSubscribed, attachTrack);
      room.off(RoomEvent.TrackUnsubscribed, detachTrack);
      room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
      localTracksRef.current.forEach((track) => {
        track.detach().forEach((element) => element.remove());
        track.stop();
      });
      localTracksRef.current = [];
      room.disconnect();
      roomRef.current = null;
    };
  }, [pushActivity, token]);

  const isHost = token.role === "host";
  const hostName = live.host.displayName?.trim() || live.host.username;
  const viewerLabel = live.viewerCount === 1 ? "viewer" : "viewers";

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
              {status} · Host: {hostName}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/24 bg-rose-500/14 px-3 py-1.5 text-xs font-bold text-rose-50">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-300" />
              {live.viewerCount} live {viewerLabel}
            </span>
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

        <div className="grid gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-cyan-50/78 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/18 px-3 py-2">
            Audience: <span className="text-white">{live.viewerCount}</span>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/18 px-3 py-2">
            Joined: <span className="text-white">{isHost ? "You are hosting" : "You are watching"}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setReactions((prev) => ({ ...prev, likes: prev.likes + 1 }))}
              className="flex-1 rounded-xl border border-pink-200/20 bg-pink-500/12 px-3 py-2 text-left text-pink-50 transition hover:bg-pink-500/18"
            >
              Like {reactions.likes}
            </button>
            <button
              type="button"
              onClick={() => setReactions((prev) => ({ ...prev, cheers: prev.cheers + 1 }))}
              className="flex-1 rounded-xl border border-cyan-200/20 bg-cyan-500/12 px-3 py-2 text-left text-cyan-50 transition hover:bg-cyan-500/18"
            >
              Cheer {reactions.cheers}
            </button>
          </div>
        </div>
        {activityLog.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-b border-white/10 bg-black/18 px-4 py-2 text-xs font-semibold text-slate-200/78">
            {activityLog.map((item, index) => (
              <span key={`${item}-${index}`} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">
                {item}
              </span>
            ))}
          </div>
        ) : null}

        <div className="relative min-h-[18rem] flex-1 bg-black p-3 sm:min-h-[30rem]">
          <div ref={remoteAudioRef} />
          {isHost ? (
            <div ref={localVideoRef} className="h-full min-h-[18rem] sm:min-h-[30rem]" />
          ) : (
            <div className="relative h-full min-h-[18rem] overflow-hidden rounded-2xl border border-white/10 bg-black sm:min-h-[30rem]">
              <div ref={remoteVideoRef} className="absolute inset-0" />
              {!hasRemoteVideo ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/[0.04] text-sm text-slate-300">
                  Waiting for host video…
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
