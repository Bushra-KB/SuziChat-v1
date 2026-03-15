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
- Socket.IO
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
