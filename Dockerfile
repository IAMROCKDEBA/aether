# syntax=docker/dockerfile:1.7
# Production image: Next.js standalone server + Prisma migration tool, non-root.

ARG NODE_IMAGE=node:24.22.2-alpine

# ─── Dependencies ──────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl && corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
# prisma.config.ts reads DATABASE_URL even for `prisma generate`; no DB is contacted.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN pnpm install --frozen-lockfile

# ─── Build ─────────────────────────────────────────────────────────────────
FROM deps AS build
COPY . .
# Public, non-secret values baked into security headers (CSP origins, HSTS).
ARG APP_URL
ARG S3_BUCKET
ARG S3_REGION
ENV NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1 \
    APP_URL=${APP_URL} \
    S3_BUCKET=${S3_BUCKET} \
    S3_REGION=${S3_REGION} \
    S3_ACCESS_KEY_ID=build-placeholder \
    S3_SECRET_ACCESS_KEY=build-placeholder \
    BETTER_AUTH_SECRET=build-placeholder-build-placeholder-000
RUN pnpm build

# ─── Migration tool (Prisma CLI only, isolated from the app) ───────────────
FROM ${NODE_IMAGE} AS migrator
WORKDIR /migrate
RUN apk add --no-cache openssl
RUN npm init -y >/dev/null && npm install --omit=dev --no-audit --no-fund prisma@7.10.1 dotenv@17
COPY prisma ./prisma
COPY prisma.config.ts ./

# ─── Runtime ───────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS runner
RUN apk add --no-cache openssl tini
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=migrator --chown=node:node /migrate /migrate
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/sign-in || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
