"use client";

import type { Socket } from "socket.io-client";
import type { ApiGameSession } from "@/lib/games-client";
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

/** Join the broadcast room for lobby list updates (`game:lobbies:update`). Call after connect / reconnect. */
export function subscribeGameLobbyListChannel(socket: Socket) {
  socket.emit("game:lobbies:subscribe", {});
}

export function sendSessionAction(socket: Socket, sessionId: string, action: Record<string, unknown>) {
  socket.emit("game:session:action", { sessionId, action });
}

/** Applies a move/action via WebSocket (same effect as POST …/action); falls back to HTTP if disconnected. */
export function postGameSessionAction(
  socket: Socket,
  sessionId: string,
  action: Record<string, unknown>,
  kind?: string,
): Promise<ApiGameSession> {
  return new Promise((resolve, reject) => {
    socket
      .timeout(20_000)
      .emit(
        "game:session:action",
        { sessionId, action, ...(kind !== undefined ? { kind } : {}) },
        (err: Error | null, response?: { ok?: boolean; session?: ApiGameSession }) => {
          if (err) {
            reject(err);
            return;
          }
          const res = response;
          if (res?.session) {
            resolve(res.session);
            return;
          }
          reject(new Error("Socket action returned no session."));
        },
      );
  });
}
