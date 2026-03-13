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
  // Keep pg external - let consuming apps handle it
  external: ["pg", "pg-native", "neo4j-driver"],
  platform: "node",
  target: "node18",
});
