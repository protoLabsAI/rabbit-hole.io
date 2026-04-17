# Job Processor Dockerfile
# pnpm monorepo pattern - simple and reliable

# ============================================
# BASE
# ============================================
FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat curl

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /app

# ============================================
# DEPS - Install everything
# ============================================
FROM base AS deps

# Copy entire monorepo (pnpm workspaces need complete structure)
COPY . .

# Install all dependencies with cache
RUN --mount=type=cache,id=pnpm-job-processor,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ============================================
# BUILDER - Build
# ============================================
FROM base AS builder

# Copy everything from deps (preserves node_modules symlinks)
COPY --from=deps /app .

# Build workspace packages and job processor (Turbo handles dependency order automatically)
ENV NODE_ENV=production
ENV SKIP_DTS=1
RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm turbo run build --filter=@protolabsai/job-processor... --concurrency=1

# ============================================
# PRODUCTION
# ============================================
FROM node:20-alpine AS production

# Runtime binaries for the media ingestion adapters (this service is the
# consolidated media pipeline — what proto-starter kept as separate
# langextract-service / youtube-processor-service / faster-whisper-server):
#   ffmpeg / ffprobe → audio-adapter + video-adapter (metadata, transcode)
#   yt-dlp          → video-adapter's YouTube path
#   curl            → healthchecks
#
# yt-dlp is Python-based and pulled from Alpine's community repo.
RUN apk add --no-cache curl ffmpeg yt-dlp

WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS="--enable-source-maps"

RUN addgroup --system --gid 1001 jobprocessor && \
    adduser --system --uid 1001 jobprocessor

# Copy built app (includes node_modules with workspace packages)
COPY --from=builder --chown=jobprocessor:jobprocessor /app/services/job-processor/dist ./dist
COPY --from=builder --chown=jobprocessor:jobprocessor /app/services/job-processor/package.json ./package.json
COPY --from=builder --chown=jobprocessor:jobprocessor /app/services/job-processor/sidequest.jobs.js ./sidequest.jobs.js
COPY --from=builder --chown=jobprocessor:jobprocessor /app/node_modules ./node_modules
COPY --from=builder --chown=jobprocessor:jobprocessor /app/packages ./packages

RUN mkdir -p /app/logs && chown -R jobprocessor:jobprocessor /app/logs

USER jobprocessor

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8679/health || exit 1

EXPOSE 8678 8679 8680

CMD ["node", "dist/server.js"]
