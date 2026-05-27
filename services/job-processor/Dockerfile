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

ENV NODE_ENV=production
ENV NODE_OPTIONS="--enable-source-maps"

RUN addgroup --system --gid 1001 jobprocessor && \
    adduser --system --uid 1001 jobprocessor

# Copy the FULL monorepo from the builder, preserving the pnpm workspace
# structure so every workspace symlink resolves. The job-processor depends
# on @protolabsai/vector (corpus search, added with the pgvector pipeline)
# and other workspace packages that pnpm does NOT hoist to the root
# node_modules — they live in services/job-processor/node_modules and only
# resolve when the monorepo layout is intact. The previous "flatten dist +
# root node_modules into /app" approach dropped them, causing
# `Cannot find package '@protolabsai/vector'` at runtime.
COPY --from=builder --chown=jobprocessor:jobprocessor /app /app

# Run from the package dir so dist/, sidequest.jobs.js (manual job
# resolution), and node_modules all resolve relative to the package.
WORKDIR /app/services/job-processor

RUN mkdir -p logs && chown -R jobprocessor:jobprocessor logs

USER jobprocessor

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8679/health || exit 1

EXPOSE 8678 8679 8680

CMD ["node", "dist/server.js"]
