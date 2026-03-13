import { HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { StateGraph, END, START } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";
import { TokenTextSplitter } from "@langchain/textsplitters";
import * as z from "zod";

import { getModel } from "@proto/llm-providers/server";

// Configuration for chunking strategy
const CHUNK_CONFIG = {
  // Use token-based chunking to stay within model context limits
  chunkSize: 3000, // tokens per chunk (conservative to leave room for prompts)
  chunkOverlap: 200, // overlap to maintain context between chunks
  encodingName: "cl100k_base" as const, // GPT-4/GPT-3.5 tokenizer
};

// State schema for the summarization graph
const State = z.object({
  // Input: original content to summarize
  originalContent: z.string(),
  // Chunks of content to process
  chunks: z.array(z.string()).register(registry, {
    default: () => [],
  }),
  // Current chunk index being processed
  currentChunkIndex: z.number().register(registry, {
    default: () => 0,
  }),
  // Accumulated summary that grows with each chunk
  runningSummary: z.string().register(registry, {
    default: () => "",
  }),
  // Final summary output
  finalSummary: z.string().register(registry, {
    default: () => "",
  }),
  // Metadata about the summarization process
  metadata: z
    .object({
      totalChunks: z.number(),
      chunksSummaries: z.array(z.string()),
      originalLength: z.number(),
      finalLength: z.number(),
    })
    .register(registry, {
      default: () => ({
        totalChunks: 0,
        chunksSummaries: [],
        originalLength: 0,
        finalLength: 0,
      }),
    }),
});

/**
 * Node: Split the original content into manageable chunks
 */
const splitContent = async (state: z.infer<typeof State>) => {
  const { originalContent } = state;

  // If content is small enough, no need to split
  const splitter = new TokenTextSplitter({
    encodingName: CHUNK_CONFIG.encodingName,
    chunkSize: CHUNK_CONFIG.chunkSize,
    chunkOverlap: CHUNK_CONFIG.chunkOverlap,
  });

  const chunks = await splitter.splitText(originalContent);

  return {
    chunks,
    currentChunkIndex: 0,
    metadata: {
      totalChunks: chunks.length,
      chunksSummaries: [],
      originalLength: originalContent.length,
      finalLength: 0,
    },
  };
};

/**
 * Node: Summarize the current chunk, incorporating prior summary
 */
const summarizeChunk = async (state: z.infer<typeof State>) => {
  const { chunks, currentChunkIndex, runningSummary } = state;
  const currentChunk = chunks[currentChunkIndex];

  // Build context-aware prompt
  const prompt = runningSummary
    ? `You are summarizing a large document in chunks. Here is the summary so far:

<prior_summary>
${runningSummary}
</prior_summary>

Now, read this next chunk and update the summary by:
1. Integrating new information from the chunk
2. Resolving any conflicts with prior information
3. Maintaining a coherent narrative
4. Keeping the summary concise but comprehensive
5. Maintain all important entities, relationships, and evidence from the context

<current_chunk>
${currentChunk}
</current_chunk>

Provide the UPDATED COMPLETE SUMMARY (not just the changes):`
    : `You are starting to summarize a large document. This is the first chunk.

<current_chunk>
${currentChunk}
</current_chunk>

Provide a concise but comprehensive summary of this content:`;

  const response = await getModel("fast").invoke([new HumanMessage(prompt)]);

  const chunkSummary = String(response.content);

  // Update running summary and metadata
  return {
    runningSummary: chunkSummary,
    currentChunkIndex: currentChunkIndex + 1,
    metadata: {
      ...state.metadata,
      chunksSummaries: [...state.metadata.chunksSummaries, chunkSummary],
    },
  };
};

/**
 * Conditional edge: Check if there are more chunks to process
 */
const shouldContinue = (
  state: z.infer<typeof State>
): "summarizeChunk" | "finalize" => {
  const { chunks, currentChunkIndex } = state;

  if (currentChunkIndex < chunks.length) {
    return "summarizeChunk";
  }

  return "finalize";
};

/**
 * Node: Finalize the summary
 */
const finalize = async (state: z.infer<typeof State>) => {
  const { runningSummary } = state;

  return {
    finalSummary: runningSummary,
    metadata: {
      ...state.metadata,
      finalLength: runningSummary.length,
    },
  };
};

/**
 * Build the summarization graph
 */
const graph = new StateGraph(State)
  .addNode("splitContent", splitContent)
  .addNode("summarizeChunk", summarizeChunk)
  .addNode("finalize", finalize)
  .addEdge(START, "splitContent")
  .addEdge("splitContent", "summarizeChunk")
  .addConditionalEdges("summarizeChunk", shouldContinue)
  .addEdge("finalize", END)
  .compile();

/**
 * Simplified input schema for the tool
 */
const ToolInputSchema = z.object({
  content: z.string().describe("The text content to summarize"),
  priorSummary: z
    .string()
    .optional()
    .describe(
      "Optional prior summary to incorporate (for incremental summarization)"
    ),
});

/**
 * Export the summarize tool
 */
export const summarizeTool = tool(
  async (input: z.infer<typeof ToolInputSchema>) => {
    const { content, priorSummary } = input;

    // If prior summary exists, prepend it to content for context
    const fullContent = priorSummary
      ? `<prior_context>\n${priorSummary}\n</prior_context>\n\n${content}`
      : content;

    const result = await graph.invoke({
      originalContent: fullContent,
    });

    return {
      summary: result.finalSummary,
      metadata: {
        totalChunks: result.metadata.totalChunks,
        originalLength: result.metadata.originalLength,
        finalLength: result.metadata.finalLength,
        compressionRatio: (
          result.metadata.finalLength / result.metadata.originalLength
        ).toFixed(2),
      },
    };
  },
  {
    name: "summarize",
    description:
      "Summarize large bodies of text into a concise summary. Can include a prior summary to incorporate into the new summary.",
    schema: ToolInputSchema,
  }
);

// Debug: Visualize the graph
// import * as fs from "node:fs/promises";
// const drawableGraph = await graph.getGraphAsync();
// const image = await drawableGraph.drawMermaidPng();
// const imageBuffer = new Uint8Array(await image.arrayBuffer());
// await fs.writeFile("summarize-graph.png", imageBuffer);
