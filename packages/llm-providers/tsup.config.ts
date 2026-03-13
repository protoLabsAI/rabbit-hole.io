import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "client/index": "src/client/index.ts",
    "server/index": "src/server/index.ts",
    "testing/index": "src/testing/index.ts",
    "generated/config-types": "src/generated/config-types.ts",
  },
  format: ["esm"],
  dts: {
    compilerOptions: {
      composite: false,
      incremental: false,
    },
  },
  clean: true,
  sourcemap: true,
  splitting: false,
  external: [
    "@langchain/core",
    "@langchain/openai",
    "@langchain/anthropic",
    "@langchain/google-genai",
    "@langchain/groq",
    "@langchain/community",
    "@langchain/ollama",
    "zod",
  ],
});
