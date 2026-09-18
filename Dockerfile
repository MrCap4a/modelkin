# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# 1. deps — install all dependencies (cached separately from source changes)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---------------------------------------------------------------------------
# 2. builder — generate Prisma client and produce the Next.js standalone build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Placeholder, non-secret values so Zod env validation and Next's
# build-time module evaluation succeed — nothing here makes a real network
# call, so there is no real credential to protect. Real secrets are only
# ever supplied at container *runtime* via `.env`/`env_file`, never baked
# into the image.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV APP_URL="http://localhost:3000"
ENV S3_ENDPOINT="http://localhost:9000"
ENV S3_REGION="us-east-1"
ENV S3_ACCESS_KEY_ID="build"
ENV S3_SECRET_ACCESS_KEY="build"
ENV S3_BUCKET="build"
ENV MAIL_FROM="no-reply@modelkin.ru"

RUN npx prisma generate
RUN npm run build

# ---------------------------------------------------------------------------
# 3. runner — minimal production image
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Next.js standalone output: a minimal server.js plus only the node_modules
# actually traced as used at runtime.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma CLI + schema/migrations for `prisma migrate deploy` at container
# start (docker-entrypoint.sh) — not included in the standalone trace since
# it's invoked via CLI, not imported at runtime.
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

# The `worker` container (docker-compose.prod.yml) reuses this exact image
# with a different command (`npm run worker`), which runs TypeScript
# directly via tsx rather than through Next's bundler — so it needs the raw
# source, tsx itself, and tsconfig.json (path aliases), none of which are
# part of the standalone trace above.
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/.bin/tsx ./node_modules/.bin/tsx
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p /app/logs && chown -R nextjs:nodejs /app/logs /app/prisma \
  && chmod +x /app/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
