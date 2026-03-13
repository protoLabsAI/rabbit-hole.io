import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: {
    compilerOptions: {
      composite: false,
      incremental: false,
    },
  },
  clean: true,
  splitting: true, // Enable code splitting to reduce bundle size
  sourcemap: true,
  minify: false,
  outDir: "dist",
  target: "es2020",
});
