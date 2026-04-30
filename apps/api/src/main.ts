import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';
import express, { json, urlencoded } from 'express';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { loadEnvBeforeNestBootstrap } from './load-env';

loadEnvBeforeNestBootstrap();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const reelsDir = join(process.cwd(), 'uploads', 'reels');
  if (!existsSync(reelsDir)) {
    mkdirSync(reelsDir, { recursive: true });
  }
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ limit: '15mb', extended: true }));
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });
  app.enableShutdownHooks();
  const fallbackOrigins =
    process.env.NODE_ENV === 'production'
      ? ''
      : 'http://localhost:3000,http://127.0.0.1:3000';
  const allowlist = (process.env.CORS_ORIGINS ?? fallbackOrigins)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  const corsOrigin = (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowlist.length === 0 && process.env.NODE_ENV === 'production') {
        callback(
          new Error(
            'CORS blocked: CORS_ORIGINS is empty. Set allowed origins explicitly.',
          ),
        );
        return;
      }
      if (allowlist.length === 0) {
        callback(null, true);
        return;
      }
      if (allowlist.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
  };
  app.enableCors({
    origin: corsOrigin,
    credentials: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
