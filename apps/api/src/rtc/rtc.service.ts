import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Issues ICE server configuration for WebRTC clients. STUN servers are static;
 * TURN credentials are short-lived and derived with the coturn REST scheme
 * (username = "<expiry>:<userId>", credential = base64(HMAC-SHA1(secret, username))),
 * so we never store per-user TURN passwords.
 */
@Injectable()
export class RtcService {
  getIceServers(userId: string): { iceServers: IceServer[]; ttl: number } {
    const stunUrls = splitList(
      process.env.STUN_URLS ?? 'stun:stun.l.google.com:19302',
    );
    const turnUrls = splitList(process.env.TURN_URLS);
    const turnSecret = process.env.TURN_SECRET?.trim();
    const ttl = Number(process.env.TURN_TTL_SECONDS ?? 3600);

    const iceServers: IceServer[] = [];
    if (stunUrls.length > 0) {
      iceServers.push({ urls: stunUrls });
    }

    if (turnUrls.length > 0 && turnSecret) {
      const expiry = Math.floor(Date.now() / 1000) + ttl;
      const username = `${expiry}:${userId}`;
      const credential = createHmac('sha1', turnSecret)
        .update(username)
        .digest('base64');
      iceServers.push({ urls: turnUrls, username, credential });
    }

    return { iceServers, ttl };
  }
}
