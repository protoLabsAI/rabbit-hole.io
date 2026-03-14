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
<<<<<<< HEAD
  external: [
    "next",
    "react",
    "react-dom",
    "@proto/ui",
    "@proto/icon-system",
  ],
=======
  external: ["next", "react", "react-dom", "@proto/ui", "@proto/icon-system"],
>>>>>>> origin/main
  outDir: "dist",
  target: "es2020",
});
