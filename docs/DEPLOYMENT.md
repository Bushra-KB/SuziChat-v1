# Suzi Chat Fresh Deployment (Production)

This guide deploys a fresh, stable stack with Docker Compose: `web + api + postgres + caddy`.

## 1) Server prerequisites

- Ubuntu 22.04+ (or similar)
- Docker + Docker Compose plugin
- Open ports `80` and `443`
- DNS A record pointing your domain to this server

## 2) Clone and prepare env

```bash
git clone <your-repo-url> suzi-chat
cd suzi-chat
cp infra/docker/.env.example infra/docker/.env.prod
cp apps/api/.env.example apps/api/.env.prod
cp apps/web/.env.local.example apps/web/.env.prod
```

Set secure values:

- `infra/docker/.env.prod`
  - `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
  - `CORS_ORIGINS=https://your-domain.com`
  - `SUZI_DOMAIN=your-domain.com`

## 3) Build and start stack

```bash
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.prod build --no-cache
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.prod up -d
```

## 4) Run Prisma migrations (required)

Use migration-based deploys for production safety.

```bash
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.prod exec api pnpm --filter api prisma:generate
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.prod exec api pnpm --filter api db:migrate:deploy
```

## 5) Health checks

```bash
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.prod ps
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.prod logs -f api
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.prod logs -f web
```

- Open `https://your-domain.com`
- Login, open rooms, send DM, test notifications and realtime events

## 6) Upgrade workflow

```bash
git pull
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.prod build
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.prod up -d
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.prod exec api pnpm --filter api db:migrate:deploy
```

## 7) Rollback

- Roll back to previous git commit/tag
- Rebuild and restart stack
- Restore database backup if a migration was destructive

## 8) Security checklist

- Never commit real `.env` files
- Use long random JWT secrets
- Keep `CORS_ORIGINS` restricted to your domain
- Terminate TLS in Caddy (already configured)
- Keep server/firewall packages updated
