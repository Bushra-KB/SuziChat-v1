"use client";

import type { Socket } from "socket.io-client";

export type RoomLiveUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
};

export type RoomLiveSession = {
  id: string;
  roomSlug: string;
  roomName: string;
  host: RoomLiveUser;
  startedAt: string;
  viewerCount: number;
};

export type RoomLiveToken = {
  livekitUrl: string;
  token: string;
  role: "host" | "viewer";
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
        if (response?.ok === false) {
          reject(new Error(response.error ?? "Live request failed."));
          return;
        }
        resolve((response ?? {}) as T);
      },
    );
  });
}

export function getRoomLiveStatus(socket: Socket, roomSlug: string) {
  return emitWithAck<{ ok: true; live: RoomLiveSession | null }>(
    socket,
    "room:live:status",
    { roomSlug },
  );
}

export function startRoomLive(socket: Socket, roomSlug: string) {
  return emitWithAck<{ ok: true; live: RoomLiveSession; token: RoomLiveToken }>(
    socket,
    "room:live:start",
    { roomSlug },
  );
}

export function joinRoomLive(socket: Socket, roomSlug: string) {
  return emitWithAck<{ ok: true; live: RoomLiveSession; token: RoomLiveToken }>(
    socket,
    "room:live:join",
    { roomSlug },
  );
}

export function leaveRoomLive(socket: Socket, liveId: string) {
  socket.emit("room:live:leave", { liveId });
}

export function endRoomLive(socket: Socket, roomSlug: string) {
  socket.emit("room:live:end", { roomSlug });
}
