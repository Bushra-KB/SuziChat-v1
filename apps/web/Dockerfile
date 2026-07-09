FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL=
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG API_PROXY_TARGET=http://api:4000
ENV API_PROXY_TARGET=$API_PROXY_TARGET
# ExoClick ads. NEXT_PUBLIC_* are inlined at build time, so they must be present
# here (not just at runtime). Zone IDs come from the ExoClick publisher dashboard.
ARG NEXT_PUBLIC_ADS_ENABLED=false
ENV NEXT_PUBLIC_ADS_ENABLED=$NEXT_PUBLIC_ADS_ENABLED
ARG NEXT_PUBLIC_EXOCLICK_ZONE_BANNER_TOP=
ENV NEXT_PUBLIC_EXOCLICK_ZONE_BANNER_TOP=$NEXT_PUBLIC_EXOCLICK_ZONE_BANNER_TOP
ARG NEXT_PUBLIC_EXOCLICK_ZONE_BANNER_BOTTOM=
ENV NEXT_PUBLIC_EXOCLICK_ZONE_BANNER_BOTTOM=$NEXT_PUBLIC_EXOCLICK_ZONE_BANNER_BOTTOM
ARG NEXT_PUBLIC_EXOCLICK_ZONE_REELS=
ENV NEXT_PUBLIC_EXOCLICK_ZONE_REELS=$NEXT_PUBLIC_EXOCLICK_ZONE_REELS
ARG NEXT_PUBLIC_EXOCLICK_ZONE_SNAPS=
ENV NEXT_PUBLIC_EXOCLICK_ZONE_SNAPS=$NEXT_PUBLIC_EXOCLICK_ZONE_SNAPS
ARG NEXT_PUBLIC_EXOCLICK_ZONE_DATING=
ENV NEXT_PUBLIC_EXOCLICK_ZONE_DATING=$NEXT_PUBLIC_EXOCLICK_ZONE_DATING
RUN pnpm --filter web build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/next.config.mjs ./apps/web/next.config.mjs
COPY --from=builder /app/apps/web/next-env.d.ts ./apps/web/next-env.d.ts
COPY --from=builder /app/apps/web/src ./apps/web/src
EXPOSE 3000
CMD ["pnpm", "--filter", "web", "exec", "next", "start", "-p", "3000"]
