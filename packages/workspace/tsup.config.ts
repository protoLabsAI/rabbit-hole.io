import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  outDir: "dist",
  target: "es2020",
  dts: {
    compilerOptions: {
      composite: false,
      incremental: false,
    },
  },
  sourcemap: true,
  clean: true,
  external: [
    "react",
    "react-dom",
    "next",
    "yjs",
    "@hocuspocus/provider",
    "@tanstack/react-query",
    "nuqs",
    "zustand",
    "@protolabsai/auth",
    "@protolabsai/types",
    "@protolabsai/ui",
    "@protolabsai/utils",
    "@protolabsai/logger",
  ],
  treeshake: true,
  splitting: false,
});
