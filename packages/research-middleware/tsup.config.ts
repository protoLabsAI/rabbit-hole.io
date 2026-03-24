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
  external: ["@proto/utils"],
  banner: {
    js: "/* @proto/research-middleware - Middleware pipeline for AI SDK streamText tool calls */",
  },
  outDir: "dist",
  target: "es2020",
});
