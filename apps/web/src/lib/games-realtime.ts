"use client";

import type { Socket } from "socket.io-client";
import { getRealtimeSocket } from "@/lib/realtime-client";

export function openGamesSocket(accessToken: string) {
  return getRealtimeSocket(accessToken);
}

export function joinLobbyChannel(socket: Socket, lobbyId: string) {
  socket.emit("game:lobby:join", { lobbyId });
}

export function joinSessionChannel(socket: Socket, sessionId: string) {
  socket.emit("game:session:join", { sessionId });
}

export function sendSessionAction(socket: Socket, sessionId: string, action: Record<string, unknown>) {
  socket.emit("game:session:action", { sessionId, action });
}
