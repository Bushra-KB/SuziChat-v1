# ENVIRONMENT.md

## Purpose

This file defines the environment variable strategy for Suzi Chat V1.

The goal is to keep local development simple while protecting production secrets, server config, database access, and uploads.

## Rules

- Never commit real `.env` files
- Commit only `.env.example`
- Use different values for local and server environments
- Keep production secrets only on the server
- Do not overwrite server `.env` files during deployment

## Files

### Local development
- `.env`
- optional app-specific env files later if needed

### Version controlled
- `.env.example`
- `docs/ENVIRONMENT.md`

## Initial Variables

### Shared
- `NODE_ENV`

### Web
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_API_BASE_URL`

### API
- `PORT`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_TTL`
- `JWT_REFRESH_TTL`
- `PASSWORD_RESET_TTL_MINUTES`
- `ARGON2_TIME_COST`
- `ARGON2_MEMORY_COST`
- `ARGON2_PARALLELISM`

### Storage
- `UPLOAD_DIR`

## Deployment Safety

- Production `.env` must live on the server only
- Docker Compose should read env values without recreating volumes
- Deployments must preserve:
  - database volume
  - uploads volume
  - server `.env`
  - proxy configuration

## V1 Note

This is intentionally minimal for Phase 0. Add more variables only when a feature actually needs them.
