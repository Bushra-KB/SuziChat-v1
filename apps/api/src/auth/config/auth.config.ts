import { registerAs } from '@nestjs/config';

function requireEnv(name: string, fallback?: string) {
  const value = process.env[name]?.trim() || fallback;
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export default registerAs('auth', () => ({
  accessTokenSecret: requireEnv('JWT_ACCESS_SECRET'),
  refreshTokenSecret: requireEnv('JWT_REFRESH_SECRET'),
  accessTokenTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  refreshTokenTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  passwordResetTtlMinutes: Number.parseInt(
    process.env.PASSWORD_RESET_TTL_MINUTES ?? '30',
    10,
  ),
  argon2: {
    timeCost: Number.parseInt(process.env.ARGON2_TIME_COST ?? '3', 10),
    memoryCost: Number.parseInt(process.env.ARGON2_MEMORY_COST ?? '65536', 10),
    parallelism: Number.parseInt(process.env.ARGON2_PARALLELISM ?? '1', 10),
  },
}));
