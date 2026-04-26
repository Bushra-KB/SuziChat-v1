FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm --filter api prisma:generate
RUN pnpm --filter api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
# Prod install does not copy generated client from the builder graph; regenerate here (needs `prisma` CLI in deps).
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/suzi_chat"
RUN pnpm --filter api exec prisma generate --schema prisma/schema.prisma
ENV DATABASE_URL=
EXPOSE 4000
CMD ["pnpm", "--filter", "api", "start:prod"]
