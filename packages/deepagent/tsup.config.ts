import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "graph/index": "src/graph/index.ts",
    "prompts/index": "src/prompts/index.ts",
    "subagents/index": "src/subagents/index.ts",
    "tools/index": "src/tools/index.ts",
    state: "src/state.ts",
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
    "@proto/types",
    "@proto/llm-providers",
    "@proto/vector",
    "@langchain/core",
    "@langchain/langgraph",
    "@copilotkit/sdk-js",
    "zod",
  ],
  outDir: "dist",
  target: "es2020",
});
