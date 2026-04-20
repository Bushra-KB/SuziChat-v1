# Suzi Chat V1

Suzi Chat is a web-first social platform for adults, built as a modular monolith with a shared backend, shared design system, and a responsive web app first.

## V1 Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- NestJS
- PostgreSQL
- Prisma
- Socket.IO (planned)
- Docker Compose

## Monorepo Shape

```text
apps/
  web/
  api/
packages/
  types/
  config/
  ui-tokens/
  schemas/
infra/
  docker/
  caddy/
```

## Principles

- Keep V1 simple and maintainable
- Use one shared backend
- Avoid premature abstractions
- Protect database, uploads, and environment files
- Build and merge in small safe steps

## Local Setup

1. Copy env templates:

```bash
cp .env.example .env
cp .env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local 2>/dev/null || true
```

2. Start local Postgres (Docker option):

```bash
pnpm db:up
```

3. Apply Prisma schema:

```bash
pnpm prisma:generate
pnpm db:push
```

4. Run API and web:

```bash
pnpm dev:api
pnpm dev:web
```

### Port Alignment

- API defaults to `PORT=4000`
- Web calls `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:4000` on localhost)
- Optional rewrite proxy target can be configured via `API_PROXY_TARGET`
