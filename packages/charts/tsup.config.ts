import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "gantt/index": "src/gantt/index.ts",
    "map/index": "src/map/index.ts",
    "map/utils": "src/map/utils.ts",
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
    "react",
    "react-dom",
    "@dnd-kit/core",
    "@dnd-kit/modifiers",
    "date-fns",
    "jotai",
    "leaflet",
    "lodash.throttle",
    "@uidotdev/usehooks",
    "@protolabsai/ui",
    "@protolabsai/icon-system",
    "@protolabsai/utils",
  ],
  banner: {
    js: "/* @protolabsai/charts - Data visualization components */",
  },
  outDir: "dist",
  target: "es2020",
});
