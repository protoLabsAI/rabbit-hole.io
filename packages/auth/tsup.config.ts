import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    client: "src/client.ts",
    "ui/index": "src/ui/index.ts",
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
  external: [
    "next",
    "react",
    "react-dom",
    "@protolabsai/ui",
    "@protolabsai/icon-system",
  ],
  outDir: "dist",
  target: "es2020",
});
