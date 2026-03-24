import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import baseConfig from "@proto/config-next/base.config.js";

// Load .env.research from the monorepo root (provides API keys + Langfuse config).
// Next.js only auto-loads .env / .env.local — this ensures research env vars are
// available during `pnpm dev` without manual sourcing or symlinking.
const envResearchPath = resolve(import.meta.dirname, "../../.env.research");
if (existsSync(envResearchPath)) {
  const content = readFileSync(envResearchPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const value = trimmed.slice(eqIdx + 1);
    // Don't override existing env vars (e.g., from .env.local or shell)
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

/** @type {import('next').NextConfig} */
export default {
  ...baseConfig,

  // Disable standalone output in Docker to avoid OOM during trace step.
  // When SKIP_STANDALONE=1, we copy the full workspace to production instead.
  ...(process.env.SKIP_STANDALONE === "1" ? { output: undefined } : {}),

  // Base path for path-based routing (e.g., /app)
  // Set NEXT_PUBLIC_BASE_PATH env var in Coolify for deployed environments
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",

  // Asset prefix for static files under base path
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || "",

  // Disable ESLint during build (already runs in CI)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // webpackBuildWorker disabled — spawns a parallel process that doubles
  // memory usage, causing OOM in 8GB Docker builds.
  experimental: {
    webpackBuildWorker: false,
  },

  webpack: (config, { isServer }) => {
    // Reduce memory usage during build
    config.optimization = {
      ...config.optimization,
      moduleIds: "deterministic",
      splitChunks: isServer
        ? false
        : {
            chunks: "all",
            cacheGroups: {
              default: false,
              vendors: false,
              // Separate large dependencies
              framework: {
                name: "framework",
                test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                priority: 40,
                enforce: true,
              },
              lib: {
                test: /[\\/]node_modules[\\/]/,
                name: "lib",
                priority: 30,
                minChunks: 1,
                reuseExistingChunk: true,
              },
            },
          },
    };

    if (!isServer) {
      // Prevent Node.js modules from being bundled in client-side code
      // AWS SDK and LangChain Bedrock provider use Node.js-specific modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        perf_hooks: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
      };
    }
    return config;
  },
};
