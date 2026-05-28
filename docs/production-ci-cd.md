# Production CI/CD

This repository uses GitHub Actions for two production-safe workflows:

- `CI` runs on pull requests and on pushes to `main`.
- `Deploy Production` runs after `main` is updated, or manually from GitHub Actions.

## Required GitHub Secrets

Add these in GitHub under `Settings -> Secrets and variables -> Actions`.

- `PROD_HOST`: production server hostname or IP, for example `91.98.200.74`
- `PROD_USER`: SSH user, for example `suziadmin`
- `PROD_SSH_KEY`: private SSH key that can log in as `PROD_USER`

Optional secrets:

- `PROD_PORT`: SSH port, defaults to `22`
- `PROD_APP_DIR`: app directory, defaults to `/home/suziadmin/apps/suzi-chat`
- `PROD_DOMAIN`: production domain, defaults to `suzichat.com`

## Deployment Safety

The production deploy syncs source code to the server and preserves:

- `infra/docker/.env.prod`
- `uploads/`
- `backups/`
- Docker named volumes, including Postgres data and uploaded media

Before applying Prisma schema changes, the workflow writes a compressed database backup to `~/backups` on the server.

The workflow runs:

1. `docker compose build`
2. database backup with `pg_dump`
3. `pnpm --filter api db:migrate:deploy`
4. `pnpm --filter api db:push`
5. `docker compose up -d`

`db:push` is intentionally run without `--accept-data-loss`, so Prisma should fail the deploy instead of applying destructive schema changes automatically.

## Uploaded Files

The API reads and writes uploads from `UPLOADS_DIR`, which is set to `/app/uploads` in the production Docker Compose file. This matches the persistent Docker volume and removes the need for any manual symlink inside the API container.
