# Multi-stage Dockerfile for Rabbit Hole App
# Uses "copy everything" pattern for reliable ESM workspace resolution.
# Trade-off: Larger image but guaranteed correct dependency resolution
# and works within 8GB Docker memory limits.

# ============================================
# BASE - Shared dependencies
# ============================================
FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat curl

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /app

# ============================================
# DEPENDENCIES - Install all deps for workspace
# ============================================
FROM base AS deps

COPY . .

RUN --mount=type=cache,id=pnpm-rabbit-hole,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ============================================
# BUILDER - Build the application
# ============================================
FROM base AS builder

COPY --from=deps /app .

# Build workspace packages (skip DTS to save ~4GB RAM)
ENV SKIP_DTS=1
RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm turbo run build --filter='./packages/*' --concurrency=1

# Generate custom domain registry
RUN pnpm run scan:domains

# Build Next.js app without standalone output tracing (saves ~2GB RAM)
# We copy the full workspace to production instead.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=1
ENV SKIP_STANDALONE=1
ENV NODE_OPTIONS="--max-old-space-size=6144"

RUN cd apps/rabbit-hole && npx next build

# ============================================
# PRODUCTION
# ============================================
FROM node:20-alpine AS production

RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--enable-source-maps"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy full workspace (maintains ESM resolution)
COPY --from=builder --chown=nextjs:nodejs /app .

USER nextjs

WORKDIR /app/apps/rabbit-hole

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["npx", "next", "start"]
