# Suzi Chat V1

Suzi Chat is a web-first social platform for adults. It combines public chat rooms, direct messaging, dating chat, snaps/reels, realtime games, WebRTC calls, media uploads, and ChatRoom live broadcasting in one maintainable modular monolith.

The project is organized as a pnpm monorepo with a Next.js web app, a NestJS API, PostgreSQL/Prisma persistence, Socket.IO realtime events, Docker Compose infrastructure, Caddy reverse proxying, coturn for WebRTC relay, and LiveKit for one-to-many room live video.

## Highlights

- Responsive authenticated app shell for desktop and mobile.
- Public/private chat rooms with messaging, membership, invites, moderation, and room management.
- Direct messages and dating messages with realtime delivery, typing indicators, call history, attachments, and voice messages.
- Raw WebRTC audio/video calls for DM and Dating, plus capped room audio calls with STUN/TURN support.
- ChatRoom Live broadcast using LiveKit SFU: owners/moderators host video, members watch.
- Snaps and Reels with upload support, discovery panels, fullscreen/mobile optimizations, views, likes, comments, and share flows.
- Realtime multiplayer games with lobbies, spectators, chat, replay/restart sync, and mobile board layouts.
- Admin dashboard for moderation, users, categories, notifications, and operational visibility.
- Production deployment via Docker Compose, Caddy TLS, Postgres volumes, upload volumes, coturn, and LiveKit.

## Tech Stack

| Area | Technology |
| --- | --- |
| Web | Next.js 16, React 19, TypeScript, Tailwind CSS |
| API | NestJS 11, TypeScript |
| Database | PostgreSQL, Prisma |
| Realtime | Socket.IO |
| Calls | Raw WebRTC, coturn STUN/TURN |
| Live Broadcast | LiveKit SFU |
| Uploads | Multer disk storage, server upload volume |
| Infrastructure | Docker Compose, Caddy |

## Repository Layout

```text
apps/
  api/                  NestJS API, Prisma schema, realtime gateway
  web/                  Next.js app, UI components, app shell
docs/                   Architecture and deployment notes
infra/
  caddy/                Caddy reverse proxy config
  coturn/               TURN server config
  docker/               Local and production compose files
```

## Requirements

- Node.js 20+
- pnpm 10+
- Docker and Docker Compose plugin
- PostgreSQL 16+ if not using the local Docker service

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy environment templates:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

3. Start local infrastructure:

```bash
pnpm db:up
```

For local LiveKit testing:

```bash
docker compose -f infra/docker/docker-compose.local.yml --profile live up -d livekit
```

For local TURN testing:

```bash
docker compose -f infra/docker/docker-compose.local.yml --profile turn up -d coturn
```

4. Generate Prisma client and apply the schema:

```bash
pnpm prisma:generate
pnpm db:push
```

5. Run API and web:

```bash
pnpm dev:api
pnpm dev:web
```

Default local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Postgres: `localhost:5432`
- LiveKit local signaling: `ws://localhost:7880`

## Key Environment Variables

The root `.env.example` and `apps/api/.env.example` contain the full list. Important values:

- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: strong random JWT secrets.
- `CORS_ORIGINS`: comma-separated allowed web origins.
- `NEXT_PUBLIC_API_BASE_URL`: public API base for the web app.
- `API_PROXY_TARGET`: server-side Next.js rewrite target, usually `http://api:4000` in Docker.
- `UPLOADS_DIR`: API upload storage root.
- `STUN_URLS`, `TURN_URLS`, `TURN_SECRET`, `TURN_REALM`, `TURN_EXTERNAL_IP`: WebRTC relay configuration.
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_NODE_IP`: ChatRoom Live broadcast configuration.
- `SMTP_*`, `MAIL_FROM`, `APP_BASE_URL`: email verification and password reset delivery.

## Development Commands

```bash
pnpm dev:web              # Run Next.js web app
pnpm dev:api              # Run NestJS API
pnpm build:web            # Production web build
pnpm build:api            # API TypeScript/Nest build
pnpm prisma:generate      # Generate Prisma client
pnpm db:push              # Push Prisma schema in development
pnpm --filter api test    # Run API tests
pnpm --filter web lint    # Run web lint checks
```

## Production Deployment

Production deployment is documented in `docs/DEPLOYMENT.md`. The supported stack is:

- `postgres`
- `api`
- `web`
- `caddy`
- `coturn`
- `livekit`

Typical production update:

```bash
git pull
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.prod build
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.prod up -d
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.prod exec api pnpm --filter api db:migrate:deploy
```

Required public ports:

- `80/tcp`, `443/tcp` for Caddy and HTTPS.
- `3478/tcp`, `3478/udp`, and TURN relay UDP range for coturn if TURN is enabled.
- `7881/tcp`, `7882/udp` for LiveKit media.

## Security Notes

- Never commit real `.env` files or production secrets.
- Keep JWT, TURN, LiveKit, SMTP, and database credentials long and random.
- Restrict `CORS_ORIGINS` in production.
- Uploaded chat attachments are validated and must reference internal upload URLs.
- API responses use validation pipes and a global exception filter for consistent, safe JSON errors.
- Web responses include standard hardening headers and disable the default powered-by header.
- Caddy should terminate TLS in production.

## Performance and UX Optimizations

Recent finalization work focused on smooth, stable UX without changing core behavior:

- Reels home feed now requests up to 100 items and uses backend ranking by recency, views, and likes.
- Reels fullscreen has a mobile-safe in-app fallback for browsers that block element fullscreen.
- ChatRoom Live watcher video now replaces the placeholder instead of stacking below it.
- Game replay/restart now syncs all players to the fresh session in realtime.
- Chat call-history pills and call/delete buttons were restyled for contrast.
- Several full document reloads were replaced with Next.js client-side navigation to preserve app shell state and improve perceived speed.
- Web and API security/error handling were tightened with headers and a global exception filter.

## Quality Checklist

Before opening a pull request:

```bash
pnpm build:api
pnpm build:web
pnpm --filter api test
```

Run focused checks for areas you touched. Some lint rules are intentionally strict and may surface legacy issues outside a narrow change; fix newly introduced diagnostics before merging.

## Documentation

- `docs/ARCHITECTURE.md`: system architecture and realtime/media design.
- `docs/DEPLOYMENT.md`: production deployment, LiveKit, firewall, and upgrade workflow.
- `apps/web/public/sounds/calls/README.md`: bundled call sound attribution.

## Branching Workflow

Use small feature branches from `main`:

```bash
git switch main
git pull
git switch -c feat/your-feature
```

Open a pull request, review CI/build output, merge to `main`, then deploy the `main` tip.
