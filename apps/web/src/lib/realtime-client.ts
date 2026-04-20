"use client";

import { io, type Socket } from "socket.io-client";
import { getApiBaseUrl } from "@/lib/api-base-url";

let sharedSocket: Socket | null = null;
let sharedToken: string | null = null;

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
    auth: {
      token: accessToken,
    },
  });
  sharedToken = accessToken;
  return sharedSocket;
}

export function closeRealtimeSocket() {
  if (!sharedSocket) {
    return;
  }
  sharedSocket.disconnect();
  sharedSocket = null;
  sharedToken = null;
}
