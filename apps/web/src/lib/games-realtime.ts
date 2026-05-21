"use client";

import type { Socket } from "socket.io-client";
import type { ApiGameChatMessage, ApiGameLobby, ApiGameSession, ApiGameType } from "@/lib/games-client";
import { getRealtimeSocket } from "@/lib/realtime-client";

export function openGamesSocket(accessToken: string) {
  return getRealtimeSocket(accessToken);
}

export function joinLobbyChannel(socket: Socket, lobbyId: string) {
  socket.emit("game:lobby:join", { lobbyId });
}

export type GameSessionPresence = {
  sessionId: string;
  watcherCount: number;
  allowSpectatorChat: boolean;
};

export function joinSessionChannel(socket: Socket, sessionId: string) {
  return new Promise<GameSessionPresence | null>((resolve) => {
    socket
      .timeout(10_000)
      .emit(
        "game:session:join",
        { sessionId },
        (
          err: Error | null,
          response?: { ok?: boolean; presence?: GameSessionPresence },
        ) => {
          if (err || !response?.presence) {
            resolve(null);
            return;
          }
          resolve(response.presence);
        },
      );
  });
}

/** Join the broadcast room for lobby list updates (`game:lobbies:update`). Call after connect / reconnect. */
export function subscribeGameLobbyListChannel(socket: Socket) {
  socket.emit("game:lobbies:subscribe", {});
}

export function sendSessionAction(socket: Socket, sessionId: string, action: Record<string, unknown>) {
  socket.emit("game:session:action", { sessionId, action });
}

function emitWithAck<T>(socket: Socket, event: string, payload: Record<string, unknown>, key: string): Promise<T> {
  return new Promise((resolve, reject) => {
    socket
      .timeout(20_000)
      .emit(event, payload, (err: Error | null, response?: Record<string, unknown>) => {
        if (err) {
          reject(err);
          return;
        }
        const value = response?.[key];
        if (value) {
          resolve(value as T);
          return;
        }
        reject(new Error(`Socket ${event} returned no ${key}.`));
      });
  });
}

export function postGameLobbyCreate(
  socket: Socket,
  payload: { gameType: ApiGameType; title: string; isPrivate?: boolean; maxSeats?: number; settings?: Record<string, unknown> },
) {
  return emitWithAck<ApiGameLobby>(socket, "game:lobby:create", payload, "lobby");
}

export function postGameLobbySeat(socket: Socket, lobbyId: string, seatIndex: number) {
  return emitWithAck<ApiGameLobby>(socket, "game:lobby:seat", { lobbyId, seatIndex }, "lobby");
}

export function postGameLobbyStart(
  socket: Socket,
  lobbyId: string,
  options?: Record<string, unknown>,
  restart = false,
) {
  return emitWithAck<ApiGameSession>(
    socket,
    "game:lobby:start",
    { lobbyId, options: options ?? {}, restart },
    "session",
  );
}

export function postGameLobbySettings(
  socket: Socket,
  lobbyId: string,
  settings: { allowSpectatorChat?: boolean },
) {
  return emitWithAck<ApiGameLobby>(socket, "game:lobby:settings", { lobbyId, ...settings }, "lobby");
}

export function postGameLobbyDelete(socket: Socket, lobbyId: string): Promise<{ ok: true; lobbyId: string }> {
  return new Promise((resolve, reject) => {
    socket
      .timeout(20_000)
      .emit("game:lobby:delete", { lobbyId }, (err: Error | null, response?: { ok?: boolean; lobbyId?: string }) => {
        if (err) {
          reject(err);
          return;
        }
        if (response?.ok) {
          resolve({ ok: true, lobbyId: response.lobbyId ?? lobbyId });
          return;
        }
        reject(new Error("Socket delete failed."));
      });
  });
}

export function postGameLobbyInvite(socket: Socket, lobbyId: string, targetUserId: string): Promise<{ ok: true }> {
  return new Promise((resolve, reject) => {
    socket
      .timeout(20_000)
      .emit("game:lobby:invite", { lobbyId, targetUserId }, (err: Error | null, response?: { ok?: boolean }) => {
        if (err) {
          reject(err);
          return;
        }
        if (response?.ok) {
          resolve({ ok: true });
          return;
        }
        reject(new Error("Socket invite failed."));
      });
  });
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

export function postGameSessionChat(socket: Socket, sessionId: string, body: string): Promise<ApiGameChatMessage> {
  return new Promise((resolve, reject) => {
    socket
      .timeout(20_000)
      .emit(
        "game:session:chat",
        { sessionId, body },
        (err: Error | null, response?: { ok?: boolean; message?: ApiGameChatMessage }) => {
          if (err) {
            reject(err);
            return;
          }
          if (response?.message) {
            resolve(response.message);
            return;
          }
          reject(new Error("Socket chat returned no message."));
        },
      );
  });
}
