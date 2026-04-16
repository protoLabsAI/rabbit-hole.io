import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    client: "src/client.ts",
    "playgrounds/index": "src/playgrounds/index.ts",
    "playgrounds/entity-research-playground/index":
      "src/playgrounds/entity-research-playground/index.ts",
    "playgrounds/llm-provider-playground/index":
      "src/playgrounds/llm-provider-playground/index.ts",
    "tools/research-agent-tools/index":
      "src/tools/research-agent-tools/index.ts",
    "tools/entity-extraction-basic/index":
      "src/tools/entity-extraction-basic/index.ts",
    "tools/writing-agent-tools/graph/index":
      "src/tools/writing-agent-tools/graph/index.ts",
  },
  format: ["esm"],
  dts: process.env.SKIP_DTS
    ? false
    : {
        resolve: true,
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
    "@protolabsai/types",
    "@protolabsai/ui",
    "@protolabsai/llm-providers",
    "@protolabsai/sidequest-utils",
    "@protolabsai/utils",
    "@protolabsai/icon-system",
    "@tanstack/react-query",
    "@uidotdev/usehooks",
    "react",
    "react-dom",
    "lucide-react",
    "nuqs",
    "langchain",
    "@langchain/core",
    "@langchain/langgraph",
    "@langchain/community",
    "@langchain/textsplitters",
    "@copilotkit/sdk-js",
    "@tiptap/core",
    "@tiptap/react",
    "@tiptap/starter-kit",
    "zod",
  ],
  outDir: "dist",
  target: "es2020",
});
