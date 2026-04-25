"use client";

import { io, type Socket } from "socket.io-client";
import { getApiBaseUrl } from "@/lib/api-base-url";

let sharedSocket: Socket | null = null;
let sharedToken: string | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let missedHeartbeats = 0;

function stopHeartbeat() {
  if (!heartbeatTimer) {
    return;
  }
  clearInterval(heartbeatTimer);
  heartbeatTimer = null;
  missedHeartbeats = 0;
}

function startHeartbeat(socket: Socket) {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (!socket.connected) {
      return;
    }
    socket.timeout(5000).emit("realtime:ping", (err: unknown) => {
      if (err) {
        missedHeartbeats += 1;
        if (missedHeartbeats >= 2) {
          socket.disconnect();
          socket.connect();
          missedHeartbeats = 0;
        }
        return;
      }
      missedHeartbeats = 0;
    });
  }, 25000);
}

export function getRealtimeSocket(accessToken: string) {
  if (sharedSocket && sharedToken === accessToken) {
    return sharedSocket;
  }

  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
    sharedToken = null;
  }

  sharedSocket = io(getApiBaseUrl(), {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 6000,
    timeout: 10000,
    auth: {
      token: accessToken,
    },
  });
  sharedSocket.on("connect", () => {
    startHeartbeat(sharedSocket as Socket);
  });
  sharedSocket.on("disconnect", () => {
    stopHeartbeat();
  });
  sharedToken = accessToken;
  return sharedSocket;
}

export function closeRealtimeSocket() {
  if (!sharedSocket) {
    return;
  }
  stopHeartbeat();
  sharedSocket.disconnect();
  sharedSocket = null;
  sharedToken = null;
}
