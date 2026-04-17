# Multi-stage build for the rabbit-hole.io researcher A2A agent.
#
# The production entrypoint is the A2A server (agent/src/a2a-main.ts). The
# langgraphjs dev server is retained for local debugging only — run it via
# `pnpm --filter @protolabsai/agent dev` on a dev machine. In production, research
# agent graphs are imported directly by the A2A skill producers, so no dev
# server is needed in the container.

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
# DEPS
# ============================================
FROM base AS deps

COPY . .

RUN --mount=type=cache,id=pnpm-agent,target=/pnpm/store \
    pnpm install --filter=@protolabsai/agent...

# ============================================
# BUILDER
# ============================================
FROM base AS builder

COPY --from=deps /app .

# SKIP_DTS=1 prevents @protolabsai/llm-tools from generating .d.ts files (saves ~4GB RAM)
ENV NODE_ENV=production
ENV SKIP_DTS=1
RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm turbo run build --filter=@protolabsai/agent... --concurrency=1

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
# Selective copying breaks ESM resolution in pnpm workspaces.
COPY --from=builder --chown=agent:agent /app .

USER agent

WORKDIR /app/agent

# ── A2A contract ────────────────────────────────────────────────────
#
# AGENT_VERSION flows from the release workflow (build-arg → ENV → card)
# so the agent card advertises the image's actual tag.
ARG AGENT_VERSION=dev
ENV AGENT_VERSION=${AGENT_VERSION}

# A2A port — workstacean resolves us as http://researcher:7870 on the
# ai_default Docker network. The runtime can override via A2A_PORT env.
ENV A2A_PORT=7870
ENV A2A_ADVERTISE_URL=http://researcher:7870
EXPOSE 7870

# protoWorkstacean discovery labels — the SkillBrokerPlugin enumerates
# containers that advertise these labels to build its service registry.
LABEL a2a.protoworkstacean/agent=true \
      a2a.protoworkstacean/name=researcher \
      a2a.protoworkstacean/version=${AGENT_VERSION} \
      org.opencontainers.image.title="rabbit-hole researcher" \
      org.opencontainers.image.description="A2A research agent backed by rabbit-hole.io" \
      org.opencontainers.image.source="https://github.com/protoLabsAI/rabbit-hole.io" \
      org.opencontainers.image.vendor="protoLabsAI"

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=5 \
    CMD curl -fsS http://localhost:${A2A_PORT}/ok || exit 1

# Production entrypoint: the A2A server. Producers import research-agent
# graphs directly, so langgraphjs dev is not part of the runtime. Devs
# who need LangSmith introspection can run `pnpm dev` outside the image.
CMD ["node", "--import", "tsx", "src/a2a-main.ts"]
