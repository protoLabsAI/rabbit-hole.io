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
    "@xyflow/react",
    "yjs",
    "perfect-freehand",
    "@protolabsai/auth",
    "@protolabsai/ui",
    "@protolabsai/icon-system",
    "@protolabsai/utils",
  ],
  treeshake: true,
  splitting: false,
});
