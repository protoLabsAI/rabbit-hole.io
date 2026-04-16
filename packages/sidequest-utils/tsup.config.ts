import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "client/index": "src/client/index.ts",
    "server/index": "src/server/index.ts",
    "components/index": "src/components/index.ts",
  },
  format: ["esm"],
  dts: {
    compilerOptions: {
      composite: false,
      incremental: false,
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    "react",
    "react-dom",
    "@tanstack/react-query",
    "sidequest",
    "@protolabsai/database",
    "@protolabsai/icon-system",
    "@protolabsai/ui",
    "pg",
  ],
});
