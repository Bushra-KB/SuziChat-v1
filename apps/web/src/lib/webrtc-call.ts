"use client";

export type CallSignal =
  | { type: "offer"; sdp: string }
  | { type: "answer"; sdp: string }
  | { type: "candidate"; candidate: RTCIceCandidateInit };

type SendSignal = (toUserId: string, data: CallSignal) => void;

type PeerEntry = {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
};

/**
 * Manages WebRTC peer connections for a single call. Handles both 1:1 (one
 * peer) and small mesh calls (one connection per remote participant). Media
 * never touches the server; only SDP/ICE are relayed via `sendSignal`.
 */
export class CallEngine {
  private readonly peers = new Map<string, PeerEntry>();
  private localStream: MediaStream | null = null;

  constructor(
    private readonly iceServers: RTCIceServer[],
    private readonly sendSignal: SendSignal,
    private readonly handlers: {
      onRemoteStream: (peerId: string, stream: MediaStream) => void;
      onPeerClosed: (peerId: string) => void;
    },
  ) {}

  setLocalStream(stream: MediaStream) {
    this.localStream = stream;
  }

  getLocalStream() {
    return this.localStream;
  }

  hasPeer(peerId: string) {
    return this.peers.has(peerId);
  }

  /**
   * Opens a connection to a remote participant. `polite` follows the perfect
   * negotiation pattern: the impolite peer (offerer) wins glare resolution.
   */
  async connect(peerId: string, asOfferer: boolean) {
    if (this.peers.has(peerId)) {
      return;
    }
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const entry: PeerEntry = {
      pc,
      polite: !asOfferer,
      makingOffer: false,
      ignoreOffer: false,
    };
    this.peers.set(peerId, entry);

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(peerId, {
          type: "candidate",
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        this.handlers.onRemoteStream(peerId, stream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "closed" ||
        pc.connectionState === "disconnected"
      ) {
        this.closePeer(peerId);
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        entry.makingOffer = true;
        await pc.setLocalDescription();
        if (pc.localDescription) {
          this.sendSignal(peerId, {
            type: "offer",
            sdp: pc.localDescription.sdp,
          });
        }
      } catch {
        // negotiation will be retried on the next state change
      } finally {
        entry.makingOffer = false;
      }
    };

    // The offerer kicks off negotiation; the answerer waits for the offer.
    if (asOfferer) {
      try {
        await pc.setLocalDescription();
        if (pc.localDescription) {
          this.sendSignal(peerId, {
            type: "offer",
            sdp: pc.localDescription.sdp,
          });
        }
      } catch {
        // ignore; renegotiation will retrigger
      }
    }
  }

  async handleSignal(fromUserId: string, data: CallSignal) {
    let entry = this.peers.get(fromUserId);
    if (!entry) {
      // Incoming offer before we set up the peer: create as answerer (polite).
      await this.connect(fromUserId, false);
      entry = this.peers.get(fromUserId);
    }
    if (!entry) {
      return;
    }
    const { pc } = entry;

    try {
      if (data.type === "candidate") {
        await pc.addIceCandidate(data.candidate).catch(() => undefined);
        return;
      }

      const description: RTCSessionDescriptionInit = {
        type: data.type,
        sdp: data.sdp,
      };
      const offerCollision =
        data.type === "offer" &&
        (entry.makingOffer || pc.signalingState !== "stable");
      entry.ignoreOffer = !entry.polite && offerCollision;
      if (entry.ignoreOffer) {
        return;
      }

      await pc.setRemoteDescription(description);
      if (data.type === "offer") {
        await pc.setLocalDescription();
        if (pc.localDescription) {
          this.sendSignal(fromUserId, {
            type: "answer",
            sdp: pc.localDescription.sdp,
          });
        }
      }
    } catch {
      // ignore malformed/late signals
    }
  }

  closePeer(peerId: string) {
    const entry = this.peers.get(peerId);
    if (!entry) {
      return;
    }
    entry.pc.onicecandidate = null;
    entry.pc.ontrack = null;
    entry.pc.onnegotiationneeded = null;
    entry.pc.onconnectionstatechange = null;
    try {
      entry.pc.close();
    } catch {
      // ignore
    }
    this.peers.delete(peerId);
    this.handlers.onPeerClosed(peerId);
  }

  setMicEnabled(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  setCameraEnabled(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  close() {
    for (const peerId of [...this.peers.keys()]) {
      this.closePeer(peerId);
    }
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
  }
}

export async function acquireLocalMedia(video: boolean): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
  });
}
