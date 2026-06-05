"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getStoredAuthSession } from "@/lib/auth-client";
import { getRealtimeSocket } from "@/lib/realtime-client";
import { getIceServers } from "@/lib/rtc-client";
import { CallSoundManager } from "@/lib/call-sounds";
import {
  acceptCall,
  cancelCall,
  declineCall,
  endCall,
  inviteCall,
  joinRoomCall,
  sendCallSignal,
  type CallMedia,
  type CallPeer,
  type IncomingCallPayload,
} from "@/lib/calls-realtime";
import { acquireLocalMedia, CallEngine, type CallSignal } from "@/lib/webrtc-call";
import { IncomingCallModal } from "@/components/app/calls/incoming-call-modal";
import { CallOverlay } from "@/components/app/calls/call-overlay";
import { RoomCallBar } from "@/components/app/calls/room-call-bar";

export type CallPhase = "idle" | "outgoing" | "incoming" | "active";

type StartDirectArgs = {
  context: "DM" | "DATING";
  targetKey: string;
  media: CallMedia;
  peer: CallPeer;
};

type ActiveCall = {
  callId?: string;
  context: "DM" | "DATING" | "ROOM";
  media: CallMedia;
  role: "caller" | "callee";
  roomSlug?: string;
  /** Display info for 1:1 peer (absent for room calls). */
  peer?: CallPeer;
};

type CallContextValue = {
  startCall: (args: StartDirectArgs) => Promise<void>;
  startRoomCall: (roomSlug: string, peerNames?: Record<string, CallPeer>) => Promise<void>;
  phase: CallPhase;
  busy: boolean;
};

const CallCtx = createContext<CallContextValue | null>(null);

export function useCall() {
  const ctx = useContext(CallCtx);
  if (!ctx) {
    throw new Error("useCall must be used within CallProvider");
  }
  return ctx;
}

export function CallProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<IncomingCallPayload | null>(null);
  const [active, setActive] = useState<ActiveCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [peerNames, setPeerNames] = useState<Record<string, CallPeer>>({});
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);

  const engineRef = useRef<CallEngine | null>(null);
  const activeRef = useRef<ActiveCall | null>(null);
  const pendingSignals = useRef<Array<{ fromUserId: string; data: CallSignal }>>([]);
  const soundsRef = useRef<CallSoundManager | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const teardown = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    soundsRef.current?.stopAll();
    engineRef.current?.close();
    engineRef.current = null;
    activeRef.current = null;
    pendingSignals.current = [];
    setActive(null);
    setIncoming(null);
    setLocalStream(null);
    setRemoteStreams({});
    setPeerNames({});
    setMicEnabled(true);
    setCamEnabled(true);
    setPhase("idle");
  }, []);

  const sounds = useCallback(() => {
    soundsRef.current ??= new CallSoundManager();
    return soundsRef.current;
  }, []);

  const closeAfterNotice = useCallback(
    (message: string, playBusyTone = false) => {
      setError(message);
      sounds().stop("ringback");
      sounds().stop("ringtone");
      if (playBusyTone) {
        sounds().play("busy", { volume: 0.75 });
      }
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        teardown();
      }, 2200);
    },
    [sounds, teardown],
  );

  const createEngine = useCallback(
    async (callId: string, media: CallMedia) => {
      const session = getStoredAuthSession();
      const token = session?.accessToken ?? "";
      const iceServers = await getIceServers(token);
      const socket = getRealtimeSocket(token);
      const engine = new CallEngine(
        iceServers,
        (toUserId, data) => sendCallSignal(socket, callId, toUserId, data),
        {
          onRemoteStream: (peerId, stream) => {
            setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
          },
          onPeerClosed: (peerId) => {
            setRemoteStreams((prev) => {
              const next = { ...prev };
              delete next[peerId];
              return next;
            });
          },
        },
      );
      const stream = await acquireLocalMedia(media === "VIDEO");
      engine.setLocalStream(stream);
      setLocalStream(stream);
      engineRef.current = engine;
      // Flush any signals that arrived before the engine was ready.
      const buffered = pendingSignals.current;
      pendingSignals.current = [];
      for (const sig of buffered) {
        void engine.handleSignal(sig.fromUserId, sig.data);
      }
      return engine;
    },
    [],
  );

  const startCall = useCallback(
    async (args: StartDirectArgs) => {
      if (phase !== "idle" || busy) {
        return;
      }
      setBusy(true);
      setError(null);
      const pendingCall: ActiveCall = {
        context: args.context,
        media: args.media,
        role: "caller",
        peer: args.peer,
      };
      activeRef.current = pendingCall;
      setActive(pendingCall);
      setPhase("outgoing");
      sounds().play("ringback", { loop: true, volume: 0.55 });
      const session = getStoredAuthSession();
      const token = session?.accessToken ?? "";
      const socket = getRealtimeSocket(token);
      try {
        const invite = await inviteCall(socket, {
          context: args.context,
          targetKey: args.targetKey,
          media: args.media,
        });
        if (!invite.ok) {
          const message =
            invite.reason === "busy"
              ? invite.busyContext === "ROOM"
                ? "User is in a group call."
                : "User is already in a call."
              : "Not available.";
          closeAfterNotice(message, true);
          return;
        }
        const call: ActiveCall = {
          callId: invite.callId,
          context: args.context,
          media: args.media,
          role: "caller",
          peer: args.peer,
        };
        activeRef.current = call;
        setActive(call);
      } catch (err) {
        closeAfterNotice(err instanceof Error ? err.message : "Could not start the call.", true);
      } finally {
        setBusy(false);
      }
    },
    [busy, closeAfterNotice, phase, sounds],
  );

  const startRoomCall = useCallback(
    async (roomSlug: string, names: Record<string, CallPeer> = {}) => {
      if (phase !== "idle" || busy) {
        return;
      }
      setBusy(true);
      setError(null);
      const session = getStoredAuthSession();
      const token = session?.accessToken ?? "";
      const socket = getRealtimeSocket(token);
      try {
        const { callId, peerIds } = await joinRoomCall(socket, roomSlug);
        const call: ActiveCall = {
          callId,
          context: "ROOM",
          media: "AUDIO",
          role: "caller",
          roomSlug,
        };
        activeRef.current = call;
        setActive(call);
        setPeerNames(names);
        setPhase("active");
        const engine = await createEngine(callId, "AUDIO");
        // New joiner offers to everyone already in the call.
        for (const peerId of peerIds) {
          await engine.connect(peerId, true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not join the call.");
        teardown();
      } finally {
        setBusy(false);
      }
    },
    [busy, createEngine, phase, teardown],
  );

  const acceptIncoming = useCallback(async () => {
    if (!incoming) {
      return;
    }
    setBusy(true);
    const session = getStoredAuthSession();
    const token = session?.accessToken ?? "";
    const socket = getRealtimeSocket(token);
    try {
      sounds().stop("ringtone");
      await acceptCall(socket, incoming.callId);
      const call: ActiveCall = {
        callId: incoming.callId,
        context: incoming.context,
        media: incoming.media,
        role: "callee",
        peer: incoming.from,
      };
      activeRef.current = call;
      setActive(call);
      setPeerNames({ [incoming.from.id]: incoming.from });
      setIncoming(null);
      setPhase("active");
      await createEngine(incoming.callId, incoming.media);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the call.");
      teardown();
    } finally {
      setBusy(false);
    }
  }, [createEngine, incoming, sounds, teardown]);

  const declineIncoming = useCallback(() => {
    if (!incoming) {
      return;
    }
    const session = getStoredAuthSession();
    const socket = getRealtimeSocket(session?.accessToken ?? "");
    sounds().stop("ringtone");
    declineCall(socket, incoming.callId);
    setIncoming(null);
    setPhase("idle");
  }, [incoming, sounds]);

  const hangUp = useCallback(() => {
    const call = activeRef.current;
    if (!call) {
      teardown();
      return;
    }
    if (!call.callId) {
      teardown();
      return;
    }
    const session = getStoredAuthSession();
    const socket = getRealtimeSocket(session?.accessToken ?? "");
    if (phase === "outgoing" && call.role === "caller") {
      cancelCall(socket, call.callId);
    } else {
      endCall(socket, call.callId);
    }
    teardown();
  }, [phase, teardown]);

  const toggleMic = useCallback(() => {
    setMicEnabled((prev) => {
      const next = !prev;
      engineRef.current?.setMicEnabled(next);
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setCamEnabled((prev) => {
      const next = !prev;
      engineRef.current?.setCameraEnabled(next);
      return next;
    });
  }, []);

  // Socket subscriptions for call lifecycle + signaling.
  useEffect(() => {
    const session = getStoredAuthSession();
    if (!session?.accessToken) {
      return;
    }
    const socket = getRealtimeSocket(session.accessToken);

    const onIncoming = (payload: IncomingCallPayload) => {
      // Busy: auto-decline a second incoming call.
      if (activeRef.current || phase !== "idle") {
        declineCall(socket, payload.callId);
        return;
      }
      setIncoming(payload);
      setPhase("incoming");
      sounds().play("ringtone", { loop: true, volume: 0.75 });
    };

    const onAccepted = (payload: { callId: string; userId: string }) => {
      const call = activeRef.current;
      if (!call || call.callId !== payload.callId || call.role !== "caller") {
        return;
      }
      sounds().stop("ringback");
      void (async () => {
        try {
          const engine = await createEngine(payload.callId, call.media);
          setPhase("active");
          // Caller is the offerer for the 1:1 connection.
          await engine.connect(payload.userId, true);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not start media.");
          const session = getStoredAuthSession();
          const socket = getRealtimeSocket(session?.accessToken ?? "");
          cancelCall(socket, payload.callId);
          teardown();
        }
      })();
    };

    const onDeclined = (payload: { callId: string }) => {
      if (activeRef.current?.callId === payload.callId) {
        closeAfterNotice("Call declined.", true);
      }
    };

    const onCanceled = (payload: { callId: string }) => {
      if (incoming?.callId === payload.callId) {
        sounds().stop("ringtone");
        setIncoming(null);
        setPhase("idle");
      }
    };

    const onEnded = (payload: { callId: string }) => {
      if (activeRef.current?.callId === payload.callId) {
        sounds().play("ended", { volume: 0.45 });
        teardown();
      }
    };

    const onPeerLeft = (payload: { callId: string; userId: string }) => {
      if (activeRef.current?.callId === payload.callId) {
        engineRef.current?.closePeer(payload.userId);
      }
    };

    const onSignal = (payload: {
      callId: string;
      fromUserId: string;
      data: CallSignal;
    }) => {
      if (activeRef.current?.callId !== payload.callId) {
        return;
      }
      if (!engineRef.current) {
        pendingSignals.current.push({
          fromUserId: payload.fromUserId,
          data: payload.data,
        });
        return;
      }
      void engineRef.current.handleSignal(payload.fromUserId, payload.data);
    };

    const onRoomParticipantJoined = (payload: {
      callId: string;
      userId: string;
    }) => {
      // Existing participants wait for the new joiner to offer; nothing to do
      // here beyond ignoring our own echo.
      void payload;
    };

    socket.on("call:incoming", onIncoming);
    socket.on("call:accepted", onAccepted);
    socket.on("call:declined", onDeclined);
    socket.on("call:canceled", onCanceled);
    socket.on("call:ended", onEnded);
    socket.on("call:peer-left", onPeerLeft);
    socket.on("call:signal", onSignal);
    socket.on("call:room:participant-joined", onRoomParticipantJoined);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:accepted", onAccepted);
      socket.off("call:declined", onDeclined);
      socket.off("call:canceled", onCanceled);
      socket.off("call:ended", onEnded);
      socket.off("call:peer-left", onPeerLeft);
      socket.off("call:signal", onSignal);
      socket.off("call:room:participant-joined", onRoomParticipantJoined);
    };
  }, [closeAfterNotice, createEngine, incoming, phase, sounds, teardown]);

  // End the call cleanly if the tab closes.
  useEffect(() => {
    const onUnload = () => {
      const call = activeRef.current;
      if (!call) {
        return;
      }
      if (!call.callId) {
        return;
      }
      const session = getStoredAuthSession();
      const socket = getRealtimeSocket(session?.accessToken ?? "");
      endCall(socket, call.callId);
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const value = useMemo<CallContextValue>(
    () => ({ startCall, startRoomCall, phase, busy }),
    [startCall, startRoomCall, phase, busy],
  );

  return (
    <CallCtx.Provider value={value}>
      {children}
      {phase === "incoming" && incoming ? (
        <IncomingCallModal
          peer={incoming.from}
          media={incoming.media}
          busy={busy}
          onAccept={() => void acceptIncoming()}
          onDecline={declineIncoming}
        />
      ) : null}
      {active && active.context === "ROOM" && phase === "active" ? (
        <RoomCallBar
          remoteStreams={remoteStreams}
          micEnabled={micEnabled}
          onToggleMic={toggleMic}
          onHangUp={hangUp}
        />
      ) : null}
      {active &&
      active.context !== "ROOM" &&
      (phase === "outgoing" || phase === "active") ? (
        <CallOverlay
          phase={phase}
          media={active.media}
          context={active.context}
          peer={active.peer}
          peerNames={peerNames}
          localStream={localStream}
          remoteStreams={remoteStreams}
          micEnabled={micEnabled}
          camEnabled={camEnabled}
          error={error}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onHangUp={hangUp}
        />
      ) : null}
    </CallCtx.Provider>
  );
}
