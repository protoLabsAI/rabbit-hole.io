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
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["pino", "pino-http"],
  platform: "node",
  target: "es2020",
  outDir: "dist",
});
