import { registerAs } from '@nestjs/config';

function requireEnv(name: string, fallback?: string) {
  const value = process.env[name]?.trim() || fallback;
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export default registerAs('auth', () => ({
  appBaseUrl: requireEnv(
    'APP_BASE_URL',
    process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3000',
  ),
  accessTokenSecret: requireEnv('JWT_ACCESS_SECRET'),
  refreshTokenSecret: requireEnv('JWT_REFRESH_SECRET'),
  accessTokenTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  refreshTokenTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  passwordResetTtlMinutes: Number.parseInt(
    process.env.PASSWORD_RESET_TTL_MINUTES ?? '30',
    10,
  ),
  emailVerificationTtlMinutes: Number.parseInt(
    process.env.EMAIL_VERIFICATION_TTL_MINUTES ?? '1440',
    10,
  ),
  googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || '',
  // Allowed audiences for "Sign in with Apple" identity tokens. The native
  // iOS flow issues tokens for the app bundle id (e.g. com.suzichat.app); the
  // web flow issues tokens for the Apple Service ID (e.g. com.suzichat.web).
  // Provide both as a comma-separated list in APPLE_CLIENT_IDS, or set the
  // single APPLE_CLIENT_ID. Defaults to the Capacitor bundle id.
  appleClientIds: (
    process.env.APPLE_CLIENT_IDS?.trim() ||
    process.env.APPLE_CLIENT_ID?.trim() ||
    'com.suzichat.app'
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  mail: {
    from:
      process.env.MAIL_FROM?.trim() ||
      process.env.SMTP_FROM?.trim() ||
      'Suzi Chat <no-reply@suzichat.com>',
    host: process.env.SMTP_HOST?.trim() || '',
    port: Number.parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER?.trim() || '',
    pass: process.env.SMTP_PASS ?? '',
  },
  argon2: {
    timeCost: Number.parseInt(process.env.ARGON2_TIME_COST ?? '3', 10),
    memoryCost: Number.parseInt(process.env.ARGON2_MEMORY_COST ?? '65536', 10),
    parallelism: Number.parseInt(process.env.ARGON2_PARALLELISM ?? '1', 10),
  },
}));
