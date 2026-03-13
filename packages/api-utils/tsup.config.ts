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
  external: ["next", "zod", "@proto/auth", "@proto/types"],
  banner: {
    js: "/* @proto/api-utils - Consolidated API utilities and middleware */",
  },
  outDir: "dist",
  target: "es2020",
});
