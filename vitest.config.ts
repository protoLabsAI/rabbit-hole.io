import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom", // Default to jsdom for React components

    // Include all test files across the project
    include: [
      "apps/rabbit-hole/app/**/*.{test,spec}.{js,ts,jsx,tsx}",
      "packages/**/*.{test,spec}.{js,ts,jsx,tsx}",
      "agent/**/*.{test,spec}.{js,ts,jsx,tsx}",
      "scripts/**/*.{test,spec}.{js,ts}",
      "services/**/*.{test,spec}.{js,ts}",
    ],

    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
      "**/*.d.ts",
      "**/*.config.{js,ts}",
      // Exclude any nested node_modules to be extra sure
      "packages/*/node_modules/**",
      "agent/node_modules/**",
      // @TODO: Exclude tests with missing imports/dependencies (to be fixed post-0.0.1)
      "apps/rabbit-hole/app/context/__tests__/dialogHistory.test.ts",
      "apps/rabbit-hole/app/context/__tests__/uiReducer.test.ts",
      "apps/rabbit-hole/app/hooks/__tests__/useDualRoomSync*.test.ts",
      "apps/rabbit-hole/app/evidence/__tests__/**/*.test.ts",
      "packages/types/src/__tests__/alice-validation.test.ts",
    ],

    // Setup files for different test environments
    setupFiles: ["./vitest.setup.ts"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        ".next/",
        "build/",
        "**/*.config.{js,ts}",
        "**/*.test.{js,ts,tsx}",
        "**/*.spec.{js,ts,tsx}",
        "**/*.d.ts",
        "**/types/",
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },

    // Performance settings
    testTimeout: 15000,
    hookTimeout: 15000,

    // Reporting
    reporters: ["verbose"],

    // Server configuration
    server: {
      deps: {
        external: ["neo4j-driver"],
      },
    },

    // Environment-specific overrides
    environmentMatchGlobs: [
      // Node environment for backend/server code
      ["apps/rabbit-hole/app/api/**", "node"],
      ["packages/database/**", "node"],
      ["packages/proto-llm-tools/**", "node"],
      ["packages/sidequest-utils/src/server/**", "node"],
      ["apps/rabbit-hole/app/evidence/services/**", "node"],
      ["agent/**", "node"],
      ["scripts/**", "node"],
      ["services/**", "node"],
      // JSdom for React components and browser code
      ["apps/rabbit-hole/app/components/**", "jsdom"],
      ["apps/rabbit-hole/app/atlas/components/**", "jsdom"],
      ["apps/rabbit-hole/app/context/**", "jsdom"],
      ["apps/rabbit-hole/app/hooks/**", "jsdom"],
      ["packages/sidequest-utils/src/client/**", "jsdom"],
    ],
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./apps/rabbit-hole/app"),
      "@/components": path.resolve(
        __dirname,
        "./apps/rabbit-hole/app/components"
      ),
      "@/lib": path.resolve(__dirname, "./apps/rabbit-hole/app/lib"),
      "@/hooks": path.resolve(__dirname, "./apps/rabbit-hole/app/hooks"),
      "@/types": path.resolve(__dirname, "./apps/rabbit-hole/app/types"),
      "@/context": path.resolve(__dirname, "./apps/rabbit-hole/app/context"),
      "@/utils": path.resolve(__dirname, "./apps/rabbit-hole/app/utils"),
      "@protolabsai/types": path.resolve(__dirname, "./packages/types/src"),
      "@protolabsai/utils": path.resolve(__dirname, "./packages/utils/src"),
      "@protolabsai/database": path.resolve(
        __dirname,
        "./packages/database/src"
      ),
      "@protolabsai/auth": path.resolve(__dirname, "./packages/auth/src"),
      // @protolabsai/deepagent subpaths
      "@protolabsai/deepagent/tools": path.resolve(
        __dirname,
        "./packages/deepagent/src/tools"
      ),
      "@protolabsai/deepagent/subagents": path.resolve(
        __dirname,
        "./packages/deepagent/src/subagents"
      ),
      "@protolabsai/deepagent/prompts": path.resolve(
        __dirname,
        "./packages/deepagent/src/prompts"
      ),
      "@protolabsai/deepagent/state": path.resolve(
        __dirname,
        "./packages/deepagent/src/state.ts"
      ),
      "@protolabsai/deepagent/graph": path.resolve(
        __dirname,
        "./packages/deepagent/src/graph"
      ),
      "@protolabsai/deepagent": path.resolve(
        __dirname,
        "./packages/deepagent/src"
      ),
      "@protolabsai/llm-tools/tools/entity-extraction-basic": path.resolve(
        __dirname,
        "./packages/proto-llm-tools/src/tools/entity-extraction-basic"
      ),
      "@protolabsai/llm-tools/playgrounds": path.resolve(
        __dirname,
        "./packages/proto-llm-tools/src/playgrounds"
      ),
      "@protolabsai/llm-tools/client": path.resolve(
        __dirname,
        "./packages/proto-llm-tools/src/client.ts"
      ),
      "@protolabsai/llm-tools": path.resolve(
        __dirname,
        "./packages/proto-llm-tools/src"
      ),
      "@protolabsai/api-utils": path.resolve(
        __dirname,
        "./packages/api-utils/src"
      ),
      "@protolabsai/sidequest-utils": path.resolve(
        __dirname,
        "./packages/sidequest-utils/src"
      ),
      "@protolabsai/sidequest-utils/client": path.resolve(
        __dirname,
        "./packages/sidequest-utils/src/client"
      ),
      "@protolabsai/sidequest-utils/server": path.resolve(
        __dirname,
        "./packages/sidequest-utils/src/server"
      ),
      "@protolabsai/ui": path.resolve(__dirname, "./packages/ui/src"),
      "@protolabsai/ui/atoms": path.resolve(
        __dirname,
        "./packages/ui/src/atoms"
      ),
      "@protolabsai/ui/molecules": path.resolve(
        __dirname,
        "./packages/ui/src/molecules"
      ),
      "@protolabsai/ui/organisms": path.resolve(
        __dirname,
        "./packages/ui/src/organisms"
      ),
      "@protolabsai/ui/templates": path.resolve(
        __dirname,
        "./packages/ui/src/templates"
      ),
      "@protolabsai/ui/theme": path.resolve(
        __dirname,
        "./packages/ui/src/theme"
      ),
      "@protolabsai/charts": path.resolve(__dirname, "./packages/charts/src"),
      "@protolabsai/charts/gantt": path.resolve(
        __dirname,
        "./packages/charts/src/gantt"
      ),
    },
  },

  esbuild: {
    target: "node18",
    jsx: "automatic",
  },
});
