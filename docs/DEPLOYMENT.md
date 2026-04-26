# Suzi Chat Fresh Deployment (Production)

This guide deploys a fresh, stable stack with Docker Compose: `web + api + postgres + caddy`.

**Branching:** deploy from **`main`**. Do feature work on a branch, open a PR, merge to `main` when approved, then deploy that `main` tip (prefer **`git pull` on the server** so the tree always matches Git).

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

## 6b) Optional: rsync from your laptop instead of `git pull`

Prefer **`git pull` on the server`** so you never ship a partial or wrong branch by accident.

If you still use `rsync`:

- **Do not use `--delete`** unless your laptop copy is a **complete** superset of what must exist on the server (same branch as production, fully up to date). Otherwise you can delete Dockerfiles, compose files, and **`infra/docker/.env.prod`**.
- **Secrets:** production `.env` files are **gitignored** on purpose. Keeping real secrets **only on the server** is safest. If you keep a copy on your laptop to `scp`/`rsync`, treat that machine like production: disk encryption, no accidental sharing, rotate if exposed.
- If you use `--delete`, protect server-only files, for example:

```bash
rsync -avz --delete \
  --filter='P infra/docker/.env.prod' \
  --exclude node_modules --exclude '.git' \
  --exclude apps/web/.next --exclude apps/api/dist \
  ./ user@server:~/apps/suzi-chat/
```

(`P` = do not delete that path on the server when it is missing from the laptop.)

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
