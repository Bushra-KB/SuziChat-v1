import { createHmac } from 'node:crypto';
import { RtcService } from './rtc.service';

describe('RtcService', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns STUN servers only when TURN is not configured', () => {
    delete process.env.TURN_URLS;
    delete process.env.TURN_SECRET;
    process.env.STUN_URLS = 'stun:stun.example.com:3478';

    const { iceServers } = new RtcService().getIceServers('user-1');
    expect(iceServers).toHaveLength(1);
    expect(iceServers[0].urls).toEqual(['stun:stun.example.com:3478']);
    expect(iceServers[0].username).toBeUndefined();
  });

  it('issues ephemeral TURN credentials derived from the shared secret', () => {
    process.env.STUN_URLS = 'stun:stun.example.com:3478';
    process.env.TURN_URLS = 'turn:turn.example.com:3478';
    process.env.TURN_SECRET = 'top-secret';
    process.env.TURN_TTL_SECONDS = '3600';

    const before = Math.floor(Date.now() / 1000);
    const { iceServers, ttl } = new RtcService().getIceServers('user-42');
    expect(ttl).toBe(3600);

    const turn = iceServers.find((server) =>
      String(server.urls).includes('turn:'),
    );
    expect(turn).toBeDefined();
    expect(turn?.username).toMatch(/^\d+:user-42$/);

    const [expiryStr, userId] = (turn?.username ?? '').split(':');
    expect(userId).toBe('user-42');
    expect(Number(expiryStr)).toBeGreaterThanOrEqual(before + 3600);

    const expectedCredential = createHmac('sha1', 'top-secret')
      .update(turn?.username ?? '')
      .digest('base64');
    expect(turn?.credential).toBe(expectedCredential);
  });
});
