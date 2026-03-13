/**
 * Local Vitest configuration for services/job-processor.
 *
 * Run with:  npx vitest run --config services/job-processor/vitest.config.ts
 * Or from this directory:  npx vitest run
 */

import { resolve } from "path";
import { fileURLToPath } from "url";

import { defineConfig } from "vitest/config";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    // All tests live under the test/ directory
    include: ["test/**/*.test.ts"],

    // Node environment — this service has no browser code
    environment: "node",

    // Enable vitest globals (describe, it, expect, vi, …)
    globals: true,

    // Allow time for PDF / DOCX parsing in CI
    testTimeout: 30_000,
    hookTimeout: 30_000,

    // Verbose output for easier debugging
    reporters: ["verbose"],

    // No coverage thresholds in the local config — handled by root config
  },

  resolve: {
    alias: {
      // Mirror the workspace alias map from the root vitest.config.ts so that
      // @proto/* imports resolve to the right source packages.
      "@proto/types": resolve(__dirname, "../../packages/types/src"),
      "@proto/utils": resolve(__dirname, "../../packages/utils/src"),
      "@proto/database": resolve(__dirname, "../../packages/database/src"),
      "@proto/sidequest-utils": resolve(
        __dirname,
        "../../packages/sidequest-utils/src"
      ),
    },
  },

  esbuild: {
    target: "node18",
  },
});
