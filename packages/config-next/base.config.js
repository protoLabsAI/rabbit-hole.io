/** @type {import('next').NextConfig} */
export default {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,

  // ============================================================================
  // HOT RELOAD: Transpile workspace packages for instant HMR
  // ============================================================================
  // Next.js will compile these packages from source (src/) instead of using
  // built artifacts (dist/). This enables <1s hot reload for UI development.
  //
  // ONLY include client-side packages:
  // ✅ React components, UI libraries, browser utilities
  // ❌ Server packages with Node.js APIs or native dependencies
  transpilePackages: [
    "@protolabsai/ui", // Atomic Design component library (52 components)
    "@protolabsai/charts", // Chart components (Gantt, etc.)
    "@protolabsai/icon-system", // Icon components
    "@protolabsai/utils", // Utility functions (atlas, domain helpers)
    "@protolabsai/types", // Type definitions and Zod schemas
    "@protolabsai/llm-tools", // LLM playground components (client-safe parts only)
    "@xyflow/react", // ReactFlow - force graph visualization
    "d3-force", // D3 force simulation
    "@copilotkit/react-core", // CopilotKit React hooks
    "use-sync-external-store", // React state management (fixes dynamic require)
  ],

  // Mark native dependencies as external to prevent bundling issues
  serverExternalPackages: [
    "neo4j-driver",
    "pg",
    "pino",
    "pino-pretty",
    "thread-stream",
    "yjs",
    "lib0",
    "sharp",
    "canvas",
    "@langchain/core",
    "@langchain/langgraph",
    "@langchain/community",

    // Server-only workspace packages (not transpiled)
    "@protolabsai/database",
    "@protolabsai/auth",
    "@protolabsai/llm-providers",
    "@protolabsai/logger",
    "@protolabsai/prompts",
  ],

  // Turbopack-specific configuration for dynamic require issues
  turbopack: {
    resolveAlias: {
      "neo4j-driver": "neo4j-driver",
    },
  },
};
