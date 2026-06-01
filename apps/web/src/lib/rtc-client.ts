import { apiJson } from "@/lib/api-auth-request";

export type IceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

let cached: { servers: RTCIceServer[]; expiresAt: number } | null = null;

/** Fetches ICE servers (STUN + short-lived TURN creds), cached until they expire. */
export async function getIceServers(accessToken: string): Promise<RTCIceServer[]> {
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.servers;
  }
  try {
    const res = await apiJson<{ iceServers: IceServerConfig[]; ttl: number }>(
      "/v1/rtc/ice",
      { method: "GET", accessToken },
    );
    const servers = (res.iceServers ?? []) as RTCIceServer[];
    cached = {
      servers,
      expiresAt: Date.now() + Math.max(60, res.ttl ?? 3600) * 1000,
    };
    return servers;
  } catch {
    return [{ urls: "stun:stun.l.google.com:19302" }];
  }
}
