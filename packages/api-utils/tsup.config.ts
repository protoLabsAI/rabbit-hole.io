import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
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
  external: ["next", "zod", "@protolabsai/auth", "@protolabsai/types"],
  banner: {
    js: "/* @protolabsai/api-utils - Consolidated API utilities and middleware */",
  },
  outDir: "dist",
  target: "es2020",
});
