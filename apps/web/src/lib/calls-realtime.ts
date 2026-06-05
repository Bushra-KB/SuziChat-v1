"use client";

import type { Socket } from "socket.io-client";
import type { CallSignal } from "@/lib/webrtc-call";

export type CallContext = "DM" | "DATING" | "ROOM";
export type CallMedia = "AUDIO" | "VIDEO";

export type CallPeer = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
};

export type IncomingCallPayload = {
  callId: string;
  context: "DM" | "DATING";
  contextKey: string;
  media: CallMedia;
  from: CallPeer;
};

export type InviteCallResponse =
  | { ok: true; callId: string }
  | {
      ok: false;
      callId?: string;
      reason?: "unavailable" | "busy";
      busyContext?: CallContext;
      error?: string;
    };

function emitWithAck<T>(
  socket: Socket,
  event: string,
  payload: Record<string, unknown>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    socket.timeout(20_000).emit(
      event,
      payload,
      (err: Error | null, response?: Record<string, unknown> & { error?: string }) => {
        if (err) {
          reject(err);
          return;
        }
        if (response && response.ok === false) {
          reject(new Error(response.error ?? "Call request failed."));
          return;
        }
        resolve((response ?? {}) as T);
      },
    );
  });
}

export function inviteCall(
  socket: Socket,
  payload: { context: "DM" | "DATING"; targetKey: string; media: CallMedia },
) {
  return new Promise<InviteCallResponse>((resolve, reject) => {
    socket.timeout(20_000).emit(
      "call:invite",
      payload,
      (err: Error | null, response?: InviteCallResponse) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(response ?? { ok: false, error: "Call request failed." });
      },
    );
  });
}

export function acceptCall(socket: Socket, callId: string) {
  return emitWithAck<{ ok: boolean; callId: string }>(socket, "call:accept", { callId });
}

export function declineCall(socket: Socket, callId: string) {
  socket.emit("call:decline", { callId });
}

export function cancelCall(socket: Socket, callId: string) {
  socket.emit("call:cancel", { callId });
}

export function endCall(socket: Socket, callId: string) {
  socket.emit("call:end", { callId });
}

export function sendCallSignal(
  socket: Socket,
  callId: string,
  toUserId: string,
  data: CallSignal,
) {
  socket.emit("call:signal", { callId, toUserId, data });
}

export function joinRoomCall(socket: Socket, roomSlug: string) {
  return emitWithAck<{ ok: boolean; callId: string; peerIds: string[] }>(
    socket,
    "call:room:join",
    { roomSlug },
  );
}
