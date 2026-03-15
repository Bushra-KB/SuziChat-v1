import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  accessTokenSecret:
    process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
  refreshTokenSecret:
    process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
  accessTokenTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  refreshTokenTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  argon2: {
    timeCost: Number.parseInt(process.env.ARGON2_TIME_COST ?? '3', 10),
    memoryCost: Number.parseInt(process.env.ARGON2_MEMORY_COST ?? '65536', 10),
    parallelism: Number.parseInt(process.env.ARGON2_PARALLELISM ?? '1', 10),
  },
}));
