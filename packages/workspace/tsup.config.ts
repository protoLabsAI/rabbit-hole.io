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
    "@proto/auth",
    "@proto/types",
    "@proto/ui",
    "@proto/utils",
    "@proto/logger",
  ],
  treeshake: true,
  splitting: false,
});
