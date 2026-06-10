"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, createLocalTracks, type LocalTrack, type RemoteTrack } from "livekit-client";
import { cx } from "@/components/ui/suzi-primitives";
import type { RoomLiveSession, RoomLiveToken } from "@/lib/room-live-client";

type LiveMode = "docked" | "fullscreen" | "minimized";

const DRAG_MARGIN = 8;

function clamp(value: number, min: number, max: number) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function IconButton({
  label,
  onClick,
  children,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cx(
        "inline-flex h-8 w-8 items-center justify-center rounded-full border text-white transition",
        tone === "danger"
          ? "border-rose-300/40 bg-rose-600/80 hover:bg-rose-500"
          : "border-white/14 bg-white/[0.06] hover:bg-white/14",
      )}
    >
      {children}
    </button>
  );
}

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
  const [mode, setMode] = useState<LiveMode>("docked");
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const roomRef = useRef<Room | null>(null);
  const localTracksRef = useRef<LocalTrack[]>([]);
  const localVideoTrackRef = useRef<LocalTrack | null>(null);
  const remoteVideoTrackRef = useRef<RemoteTrack | null>(null);
  const remoteAudioTrackRef = useRef<RemoteTrack | null>(null);
  const localVideoRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoRef = useRef<HTMLDivElement | null>(null);
  const remoteAudioRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  // Bumped whenever a track is (un)published so the mount effect re-runs.
  const [trackTick, setTrackTick] = useState(0);

  const isHost = token.role === "host";

  const pushActivity = useCallback((message: string) => {
    setActivityLog((prev) => [message, ...prev].slice(0, 3));
  }, []);

  // LiveKit connection — established once per token and kept alive across every
  // view mode. Mode changes only swap CSS, never this effect, so the camera and
  // subscribed tracks are never torn down or re-prompted.
  useEffect(() => {
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    // Record the subscribed track and let the mount effect attach it to the
    // container for the current view mode. Attaching here directly would break
    // on mode switches, because the DOM node it was attached to is replaced.
    const attachTrack = (track: RemoteTrack) => {
      if (track.kind === "video") {
        remoteVideoTrackRef.current = track;
        setHasRemoteVideo(true);
      } else {
        remoteAudioTrackRef.current = track;
      }
      setTrackTick((tick) => tick + 1);
    };

    const detachTrack = (track: RemoteTrack) => {
      track.detach().forEach((element) => element.remove());
      if (track.kind === "video") {
        remoteVideoTrackRef.current = null;
        setHasRemoteVideo(false);
      } else {
        remoteAudioTrackRef.current = null;
      }
      setTrackTick((tick) => tick + 1);
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
              localVideoTrackRef.current = track;
            }
          }
          setTrackTick((tick) => tick + 1);
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
      localVideoTrackRef.current = null;
      remoteVideoTrackRef.current = null;
      remoteAudioTrackRef.current = null;
      room.disconnect();
      roomRef.current = null;
    };
  }, [pushActivity, token]);

  // Attach known tracks to the containers for the current view mode. Runs on
  // every mode change and whenever a track is (un)published, so switching
  // docked/fullscreen/minimized re-binds the video to the freshly rendered DOM
  // node instead of relying on a one-time attach that re-renders discard.
  useEffect(() => {
    const localTrack = localVideoTrackRef.current;
    if (localTrack && localVideoRef.current) {
      localTrack.detach().forEach((element) => element.remove());
      const element = localTrack.attach();
      element.muted = true;
      element.autoplay = true;
      if (element instanceof HTMLVideoElement) {
        element.playsInline = true;
      }
      element.className = "h-full w-full object-cover";
      localVideoRef.current.replaceChildren(element);
    }

    const remoteVideoTrack = remoteVideoTrackRef.current;
    if (remoteVideoTrack && remoteVideoRef.current) {
      remoteVideoTrack.detach().forEach((element) => element.remove());
      const element = remoteVideoTrack.attach();
      element.autoplay = true;
      if (element instanceof HTMLVideoElement) {
        element.playsInline = true;
      }
      element.className = "h-full w-full object-contain";
      remoteVideoRef.current.replaceChildren(element);
    }

    const remoteAudioTrack = remoteAudioTrackRef.current;
    if (remoteAudioTrack && remoteAudioRef.current) {
      remoteAudioTrack.detach().forEach((element) => element.remove());
      const element = remoteAudioTrack.attach();
      element.autoplay = true;
      element.className = "hidden";
      remoteAudioRef.current.replaceChildren(element);
    }
  }, [mode, trackTick]);

  // Keep the card on-screen when the viewport resizes. Until the user drags,
  // `pos` stays null and the card sits in the bottom-right corner via CSS.
  useEffect(() => {
    function onResize() {
      const card = cardRef.current;
      if (!card) return;
      setPos((prev) => {
        if (!prev) return prev;
        return {
          x: clamp(prev.x, DRAG_MARGIN, window.innerWidth - card.offsetWidth - DRAG_MARGIN),
          y: clamp(prev.y, DRAG_MARGIN, window.innerHeight - card.offsetHeight - DRAG_MARGIN),
        };
      });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleDragPointerDown = (event: React.PointerEvent) => {
    if (mode === "fullscreen") return;
    if ((event.target as HTMLElement).closest("button")) return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const move = (ev: PointerEvent) => {
      const w = card.offsetWidth;
      const h = card.offsetHeight;
      setPos({
        x: clamp(ev.clientX - offsetX, DRAG_MARGIN, window.innerWidth - w - DRAG_MARGIN),
        y: clamp(ev.clientY - offsetY, DRAG_MARGIN, window.innerHeight - h - DRAG_MARGIN),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localTracksRef.current
      .filter((track) => track.kind === "audio")
      .forEach((track) => (next ? track.mute() : track.unmute()));
  };

  const toggleCamera = () => {
    const next = !cameraOff;
    setCameraOff(next);
    localTracksRef.current
      .filter((track) => track.kind === "video")
      .forEach((track) => (next ? track.mute() : track.unmute()));
  };

  const hostName = live.host.displayName?.trim() || live.host.username;
  const viewerLabel = live.viewerCount === 1 ? "viewer" : "viewers";

  // Viewer X disconnects them from the live (cheap to rejoin). The host has no X
  // — they minimize to keep chatting, and end via the explicit red button.
  const handleCloseX = () => onLeave();

  const expandFromVideo = () => setMode("fullscreen");

  const cardClass =
    mode === "fullscreen"
      ? "fixed left-1/2 top-1/2 z-[1250] max-h-[92vh] w-[min(96vw,64rem)] -translate-x-1/2 -translate-y-1/2 rounded-[1.35rem]"
      : mode === "minimized"
        ? "fixed z-[1200] flex-row items-center gap-2 rounded-full px-3 py-2"
        : "fixed z-[1200] w-[min(86vw,22rem)] rounded-2xl";

  const videoAreaClass =
    mode === "fullscreen"
      ? "relative min-h-[18rem] flex-1 bg-black p-3 sm:min-h-[30rem]"
      : mode === "minimized"
        ? "h-0 w-0 overflow-hidden"
        : "relative aspect-video w-full cursor-zoom-in bg-black";

  const positionStyle =
    mode === "fullscreen"
      ? undefined
      : pos
        ? { left: pos.x, top: pos.y }
        : { right: 16, bottom: 16 };

  return (
    <>
      {mode === "fullscreen" ? (
        <div
          className="fixed inset-0 z-[1240] bg-black/72"
          role="presentation"
          onClick={() => setMode("docked")}
        />
      ) : null}

      <div
        ref={cardRef}
        style={positionStyle}
        className={cx(
          "flex flex-col overflow-hidden border border-cyan-300/24 bg-[rgba(10,14,34,0.98)] text-white shadow-2xl",
          cardClass,
        )}
      >
        {mode === "minimized" ? (
          <div
            className="flex select-none items-center gap-2 pr-1"
            style={{ touchAction: "none" }}
            onPointerDown={handleDragPointerDown}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/18 px-2.5 py-1 text-xs font-bold text-rose-50">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-300" />
              Live · {live.viewerCount}
            </span>
            <IconButton label="Expand live" onClick={() => setMode("docked")}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </IconButton>
            {canEnd ? (
              <IconButton label="End live" tone="danger" onClick={onEnd}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </IconButton>
            ) : null}
            {!isHost ? (
              <IconButton label="Leave live" onClick={onLeave}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </IconButton>
            ) : null}
          </div>
        ) : (
          <div
            className={cx(
              "flex select-none items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03]",
              mode === "fullscreen" ? "px-4 py-3" : "cursor-grab px-3 py-2 active:cursor-grabbing",
            )}
            style={{ touchAction: "none" }}
            onPointerDown={handleDragPointerDown}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/16 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-rose-100">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-rose-300" />
                  Live
                </span>
                <h2 className={cx("truncate font-semibold text-white", mode === "fullscreen" ? "text-lg" : "text-sm")}>
                  {live.roomName}
                </h2>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-300">
                {mode === "fullscreen" ? `${status} · Host: ${hostName} · ` : ""}
                {live.viewerCount} {viewerLabel}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {isHost ? (
                <>
                  <IconButton label={muted ? "Unmute microphone" : "Mute microphone"} onClick={toggleMute}>
                    {muted ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 3l18 18M9 9v3a3 3 0 0 0 5 2M12 1a3 3 0 0 1 3 3v6M19 10a7 7 0 0 1-1 3.5M5 10a7 7 0 0 0 10 6" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10a7 7 0 0 1-14 0M12 19v4" />
                      </svg>
                    )}
                  </IconButton>
                  <IconButton label={cameraOff ? "Turn camera on" : "Turn camera off"} onClick={toggleCamera}>
                    {cameraOff ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 3l18 18M10.5 5H16a2 2 0 0 1 2 2v3l3-2v8M16 16H5a2 2 0 0 1-2-2V7" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3l3-2v8l-3-2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      </svg>
                    )}
                  </IconButton>
                </>
              ) : null}

              <IconButton label="Minimize" onClick={() => setMode("minimized")}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                </svg>
              </IconButton>

              <IconButton
                label={mode === "fullscreen" ? "Exit fullscreen" : "Fullscreen"}
                onClick={() => setMode(mode === "fullscreen" ? "docked" : "fullscreen")}
              >
                {mode === "fullscreen" ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 3v6H3M21 9h-6V3M3 15h6v6M15 21v-6h6" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                )}
              </IconButton>

              {canEnd ? (
                <button
                  type="button"
                  onClick={onEnd}
                  className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg transition hover:bg-rose-500"
                >
                  End live
                </button>
              ) : null}
              {!isHost ? (
                <IconButton label="Close live" onClick={handleCloseX}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </IconButton>
              ) : null}
            </div>
          </div>
        )}

        {mode === "fullscreen" ? (
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
        ) : null}

        {mode === "fullscreen" && activityLog.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-b border-white/10 bg-black/18 px-4 py-2 text-xs font-semibold text-slate-200/78">
            {activityLog.map((item, index) => (
              <span key={`${item}-${index}`} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">
                {item}
              </span>
            ))}
          </div>
        ) : null}

        {/* Video subtree stays mounted in every mode (collapsed when minimized)
            so switching modes never drops the LiveKit tracks. */}
        <div
          className={videoAreaClass}
          onClick={mode === "docked" ? expandFromVideo : undefined}
        >
          <div ref={remoteAudioRef} />
          {isHost ? (
            <div ref={localVideoRef} className="h-full w-full" />
          ) : (
            <div className="relative h-full w-full overflow-hidden bg-black">
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
    </>
  );
}
