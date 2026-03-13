# Multi-stage build for LangGraph Agent Services
# Using "copy everything" pattern for proper ESM workspace resolution
# This maintains the full workspace structure with all dependencies and symlinks.
# ESM requires access to monorepo workspace (node_modules/.pnpm) for module resolution.
# Trade-off: Larger image (~2.8GB) but guaranteed correct dependency resolution.
#
# Future optimization: Publish @proto/* packages to private registry, then use
# pnpm deploy with published packages for smaller, self-contained images (~200-400MB).

# ============================================
# BASE
# ============================================
FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat python3 make g++ curl

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /app

# ============================================
# DEPS - Install everything
# ============================================
FROM base AS deps

# Copy entire monorepo
COPY . .

# Install all dependencies with cache
RUN --mount=type=cache,id=pnpm-agent,target=/pnpm/store \
    pnpm install --filter=@proto/agent...

# ============================================
# BUILDER - Build
# ============================================
FROM base AS builder

# Copy everything from deps
COPY --from=deps /app .

# Build workspace packages and agent (Turbo handles dependency order automatically)
# SKIP_DTS=1 prevents @proto/llm-tools from generating .d.ts files (saves ~4GB RAM)
ENV NODE_ENV=production
ENV SKIP_DTS=1
RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm turbo run build --filter=@proto/agent... --concurrency=1

# ============================================
# PRODUCTION
# ============================================
FROM node:20-alpine AS production

RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS="--enable-source-maps"

RUN addgroup --system --gid 1001 agent && \
    adduser --system --uid 1001 agent

# Copy everything from builder (maintains workspace structure)
# This preserves symlinks and ensures all dependencies resolve correctly.
# Includes: node_modules with pnpm store, all workspace packages, built artifacts.
# Note: Selective copying breaks ESM resolution in pnpm workspaces.
# Image size: ~2.8GB (workspace + node_modules + built packages).
COPY --from=builder --chown=agent:agent /app .

USER agent

WORKDIR /app/agent

EXPOSE 8123

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
    CMD curl -f http://localhost:8123/ok || exit 1

# langgraphjs dev requires .env file (referenced in langgraph.json)
# Actual env vars are injected via docker-compose environment
RUN touch .env

CMD ["npx", "langgraphjs", "dev", "--port", "8123", "--host", "0.0.0.0", "--no-browser"]
