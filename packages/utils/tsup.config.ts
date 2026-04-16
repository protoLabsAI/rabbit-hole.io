import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "atlas/index": "src/atlas/index.ts",
    "file-processing/index": "src/file-processing/index.ts",
    "storage/index": "src/storage/index.ts",
    "tenancy-edge/index": "src/tenancy-edge/index.ts",
    "tenancy-server/index": "src/tenancy-server/index.ts",
    "react/index": "src/react/index.ts",
    "react/lazy-loading/index": "src/react/lazy-loading/index.ts",
    "security/sanitize-svg.server": "src/security/sanitize-svg.server.ts",
    "security-client/index": "src/security-client/index.ts",
    "export-client/index": "src/export-client/index.ts",
  },
  format: ["esm"],
  dts: {
    compilerOptions: {
      composite: false,
      incremental: false,
    },
  },
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  external: [
    "react",
    "react-dom",
    "use-sync-external-store",
    "swr",
    "@protolabsai/types",
    "@protolabsai/database",
    "@protolabsai/auth",
    "@protolabsai/auth/client",
    "@protolabsai/ui",
    "@protolabsai/icon-system",
    "neo4j-driver",
    "pg",
    "minio",
    "crypto", // Node.js built-in - never bundle for browser
    "html2canvas", // Large library - don't bundle
    "isomorphic-dompurify", // Handles its own environment detection
    "dompurify", // Don't bundle DOMPurify
    "jsdom", // Node.js DOM implementation - server-only
  ],
  banner: {
    js: "/* @protolabsai/utils - Design token utilities and color manipulation tools */",
  },
  outDir: "dist",
  target: "es2020",
});
