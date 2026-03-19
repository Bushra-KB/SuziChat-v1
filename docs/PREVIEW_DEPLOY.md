# PREVIEW_DEPLOY.md

## Purpose

This document records the preview deployment shape for Suzi Chat V1.

## Web

- Next.js web app runs on `127.0.0.1:3000`
- Caddy serves `suzichat.com` and `www.suzichat.com`
- Next.js proxies `/api/*` to `127.0.0.1:4000`

## API

- NestJS API runs on `127.0.0.1:4000`
- The preview web app forwards `/api/*` requests to the API so Caddy does
  not need special API routing

## Database

- PostgreSQL preview container runs from:
  - `infra/docker/docker-compose.preview.yml`

## Important Note

- The web app should use same-origin `/api` in preview/prod unless
  `NEXT_PUBLIC_API_BASE_URL` is explicitly set.
