"use client";

import { io, type Socket } from "socket.io-client";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { clearAuthSession, getStoredAuthSession, refresh, saveAuthSession } from "@/lib/auth-client";

let sharedSocket: Socket | null = null;
let sharedToken: string | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let activityStop: (() => void) | null = null;
let missedHeartbeats = 0;
let reconnectRefreshInFlight = false;
let lastUserActivityAt = Date.now();

const ACTIVE_WINDOW_MS = 60_000;
const ACTIVITY_EMIT_THROTTLE_MS = 10_000;

function isDocumentActive() {
  if (typeof document === "undefined") {
    return true;
  }
  return !document.hidden && Date.now() - lastUserActivityAt <= ACTIVE_WINDOW_MS;
}

function stopActivityTracking() {
  activityStop?.();
  activityStop = null;
}

function startActivityTracking(socket: Socket) {
  stopActivityTracking();
  let lastEmitAt = 0;
  const emitActivity = (force = false) => {
    lastUserActivityAt = Date.now();
    if (!socket.connected) {
      return;
    }
    const now = Date.now();
    if (!force && now - lastEmitAt < ACTIVITY_EMIT_THROTTLE_MS) {
      return;
    }
    lastEmitAt = now;
    socket.emit("realtime:activity", { activeAt: lastUserActivityAt });
  };
  const onActivity = () => emitActivity(false);
  const onVisibility = () => {
    if (!document.hidden) {
      emitActivity(true);
    }
  };
  const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "focus"];
  for (const event of events) {
    window.addEventListener(event, onActivity, { passive: true });
  }
  document.addEventListener("visibilitychange", onVisibility);
  activityStop = () => {
    for (const event of events) {
      window.removeEventListener(event, onActivity);
    }
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

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
    socket.timeout(5000).emit(
      "realtime:ping",
      { active: isDocumentActive(), activeAt: lastUserActivityAt },
      (err: unknown) => {
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
      },
    );
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

  const baseUrl = getApiBaseUrl();
  const useApiProxyPath = /\/api\/?$/.test(baseUrl);
  const socketOrigin = useApiProxyPath ? baseUrl.replace(/\/api\/?$/, "") : baseUrl;
  const socketPath = useApiProxyPath ? "/api/socket.io" : "/socket.io";

  sharedSocket = io(socketOrigin, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 6000,
    timeout: 10000,
    path: socketPath,
    auth: {
      token: accessToken,
    },
  });
  sharedSocket.on("connect", () => {
    startHeartbeat(sharedSocket as Socket);
    startActivityTracking(sharedSocket as Socket);
    sharedSocket?.emit("realtime:activity", { activeAt: Date.now() });
  });
  sharedSocket.on("disconnect", () => {
    stopHeartbeat();
    stopActivityTracking();
  });
  sharedSocket.on("connect_error", () => {
    if (reconnectRefreshInFlight) {
      return;
    }
    const session = getStoredAuthSession();
    if (!session?.refreshToken) {
      return;
    }
    reconnectRefreshInFlight = true;
    void refresh({ refreshToken: session.refreshToken })
      .then((next) => {
        saveAuthSession(next);
        sharedToken = next.accessToken;
        if (sharedSocket) {
          sharedSocket.auth = { token: next.accessToken };
          sharedSocket.connect();
        }
      })
      .catch(() => {
        clearAuthSession();
      })
      .finally(() => {
        reconnectRefreshInFlight = false;
      });
  });
  sharedToken = accessToken;
  return sharedSocket;
}

export function closeRealtimeSocket() {
  if (!sharedSocket) {
    return;
  }
  stopHeartbeat();
  stopActivityTracking();
  sharedSocket.disconnect();
  sharedSocket = null;
  sharedToken = null;
}
