/**
 * Research Loop Node — ReAct Loop
 *
 * Replaces the old parallel-gather + gap-detection + 6-subagent pipeline
 * with a single ReAct loop node that drives multi-hop web research via
 * SearXNG, LangExtract, and optional Neo4j graph search.
 *
 * The loop runs INSIDE the node function — it is not a separate LangGraph
 * graph. The node calls the LLM in a loop, processes tool calls manually,
 * and returns the accumulated state delta once the loop terminates.
 */

import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { StructuredTool } from "@langchain/core/tools";

import { upsertResearchChunks } from "@protolabsai/vector";

import type { EntityResearchAgentStateType } from "../state";
import { communitySearchTool } from "../tools/community-search";
import { graphSearchTool } from "../tools/graph-search";
import { vectorMemoryTool } from "../tools/vector-memory";
import type { SearxngInfobox } from "../types";
import { getLangfuse, log } from "../utils";

// ---------------------------------------------------------------------------
// System prompt for the research loop LLM
// ---------------------------------------------------------------------------

const RESEARCH_LOOP_PROMPT = `You are a deep research agent executing multi-hop web research.

Your goal: gather comprehensive evidence for the research brief by strategically searching with SearXNG.

Available tools:
- search_memory(query) — semantic search over prior findings from this session
- search_graph(query) — hybrid BM25 + vector search over the knowledge graph (existing known entities)
- search_communities(query) — search community summaries for broad thematic context
- searxng_search(query, category?, time_range?, pageno?) — search web/news/science/it categories
- langextract_wrapper — extract structured entities from accumulated evidence files
- read_file / write_file — read/write evidence files

Research strategy:
1. Call search_memory FIRST for any topic before searching externally — avoid redundant searches
2. Call search_graph to check what is already known in the knowledge base before searching the web
3. Call search_communities for broad thematic context — understand how topics cluster
4. Only call searxng_search if memory, graph, and communities don't have sufficient coverage
4. Use searxng_search with appropriate categories:
   - general: broad web research
   - news: current events, recent developments (combine with time_range)
   - science: academic papers, research findings
   - it: code, technical documentation, GitHub
5. Use bang syntax for targeted searches: !wp (Wikipedia), !scholar (Google Scholar), !gh (GitHub)
6. After 2-3 searches, review pending suggestions and pursue the most relevant ones
7. When evidence is rich enough, call langextract_wrapper to extract entities
8. Stop when you have comprehensive coverage — don't search for the same thing twice

The research context below shows what you've already covered. Do NOT re-query executed queries.`;

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

function buildResearchContext(state: EntityResearchAgentStateType): string {
  const {
    queriesExecuted,
    files,
    pendingSuggestions,
    infoboxes,
    hopCount,
    maxHops,
    researchBrief,
  } = state;

  const recentQueries = (queriesExecuted ?? []).slice(-5).join(", ");
  const fileCount = Object.keys(files ?? {}).length;
  const suggestions = (pendingSuggestions ?? []).slice(0, 5).join(", ");
  const infoboxNames = (infoboxes ?? []).map((i) => i.infobox).join(", ");

  return [
    "[Research context]",
    `Queries executed (${(queriesExecuted ?? []).length}): ${recentQueries}`,
    `Evidence files: ${fileCount}`,
    `Pending suggestions: ${suggestions}`,
    `Infoboxes: ${infoboxNames}`,
    `Hop: ${hopCount ?? 0}/${maxHops ?? 6}`,
    `Research brief: ${researchBrief ?? "(none)"}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Tool call result types
// ---------------------------------------------------------------------------

interface ToolCallRequest {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

interface AIMessageWithToolCalls {
  _getType(): string;
  content: string | Array<{ type: string; text?: string }>;
  tool_calls?: ToolCallRequest[];
}

// ---------------------------------------------------------------------------
// createResearchLoopNode
// ---------------------------------------------------------------------------

/**
 * Factory that returns a LangGraph node function implementing a ReAct
 * (Reason + Act) loop for multi-hop research.
 *
 * @param model - LLM instance (e.g. from getModel("smart"))
 * @param toolsMap - Map of tool name -> StructuredTool (must include
 *   searxng_search, langextract_wrapper, read_file, write_file at minimum)
 */
export function createResearchLoopNode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any,
  toolsMap: Record<string, StructuredTool>
) {
  // Assemble tools available to the research loop
  const searxngTool = toolsMap["searxng_search"];
  const langextractTool = toolsMap["langextract_wrapper"];
  const readFileTool = toolsMap["read_file"];
  const writeFileTool = toolsMap["write_file"];

  const tools: StructuredTool[] = [
    vectorMemoryTool as unknown as StructuredTool,
    graphSearchTool as unknown as StructuredTool,
    communitySearchTool as unknown as StructuredTool,
    searxngTool,
    langextractTool,
    readFileTool,
    writeFileTool,
  ].filter(Boolean) as StructuredTool[];

  const toolsByName: Record<string, StructuredTool> = {};
  for (const t of tools) {
    toolsByName[t.name] = t;
  }

  // Bind tools to the model once
  const modelWithTools = model.bindTools(tools);

  /**
   * The node function. Runs a ReAct loop internally and returns accumulated
   * state updates.
   */
  return async function researchLoopNode(
    state: EntityResearchAgentStateType,
    config: RunnableConfig
  ): Promise<Partial<EntityResearchAgentStateType>> {
    // -----------------------------------------------------------------------
    // Tracing setup (mirrors nodes.ts pattern)
    // -----------------------------------------------------------------------
    const threadId =
      (config?.configurable?.thread_id as string) || `thread-${Date.now()}`;
    const userId = config?.configurable?.user_id as string | undefined;

    const langfuse = getLangfuse();
    const trace = langfuse?.trace({
      name: "research-loop",
      sessionId: threadId,
      userId,
      tags: ["deep-agent", "research-loop"],
      metadata: {
        toolCount: tools.length,
        entityName: state.entityName,
        entityType: state.entityType,
        maxHops: state.maxHops ?? 6,
      },
    });

    // -----------------------------------------------------------------------
    // Accumulator state — collects deltas across loop iterations
    // -----------------------------------------------------------------------
    let hopCount = state.hopCount ?? 0;
    const maxHops = state.maxHops ?? 6;
    const queriesExecuted: string[] = [];
    const pendingSuggestions: string[] = [];
    const infoboxes: SearxngInfobox[] = [];
    const fileUpdates: Record<string, string> = {};
    const accumulatedMessages: BaseMessage[] = [];

    // Build a "live" view of state that evolves across iterations so the
    // context string stays current.
    const liveState = (): EntityResearchAgentStateType => ({
      ...state,
      hopCount,
      queriesExecuted: [...(state.queriesExecuted ?? []), ...queriesExecuted],
      pendingSuggestions: [
        ...(state.pendingSuggestions ?? []),
        ...pendingSuggestions,
      ],
      infoboxes: [...(state.infoboxes ?? []), ...infoboxes],
      files: { ...(state.files ?? {}), ...fileUpdates },
    });

    // -----------------------------------------------------------------------
    // Build the initial message list for the LLM
    // -----------------------------------------------------------------------
    const systemMessage = new SystemMessage(RESEARCH_LOOP_PROMPT);
    const contextMessage = new HumanMessage(buildResearchContext(liveState()));

    // Carry forward existing conversation messages (if any)
    let conversationMessages: BaseMessage[] = [
      systemMessage,
      ...(state.messages ?? []),
      contextMessage,
    ];

    // -----------------------------------------------------------------------
    // ReAct loop
    // -----------------------------------------------------------------------
    let iteration = 0;
    const MAX_SAFETY_ITERATIONS = 30; // absolute ceiling regardless of maxHops

    while (hopCount < maxHops && iteration < MAX_SAFETY_ITERATIONS) {
      iteration++;

      log.debug(
        `[research-loop] Iteration ${iteration}, hop ${hopCount}/${maxHops}`
      );

      // Create generation span for tracing
      const generation = trace?.generation({
        name: `research-loop-iter-${iteration}`,
        model: "claude-sonnet-4-20250514",
        input: {
          iteration,
          hopCount,
          maxHops,
          messageCount: conversationMessages.length,
        },
        metadata: {
          toolNames: tools.map((t) => t.name),
          queriesExecuted: [
            ...(state.queriesExecuted ?? []),
            ...queriesExecuted,
          ],
        },
      });

      try {
        // -------------------------------------------------------------------
        // Call the LLM
        // -------------------------------------------------------------------
        const response = (await modelWithTools.invoke(
          conversationMessages,
          config
        )) as AIMessageWithToolCalls & BaseMessage;

        // Track the AI response
        accumulatedMessages.push(response);
        conversationMessages = [...conversationMessages, response];

        const toolCalls = response.tool_calls ?? [];

        generation?.end({
          output: {
            hasToolCalls: toolCalls.length > 0,
            toolCallNames: toolCalls.map((tc) => tc.name),
          },
        });

        // -----------------------------------------------------------------
        // Termination: LLM emitted no tool calls (produced final text)
        // -----------------------------------------------------------------
        if (toolCalls.length === 0) {
          log.debug(
            "[research-loop] LLM produced final text — terminating loop"
          );
          break;
        }

        // -----------------------------------------------------------------
        // Process each tool call sequentially
        // -----------------------------------------------------------------
        for (const toolCall of toolCalls) {
          const toolName = toolCall.name;
          const toolInstance = toolsByName[toolName];

          if (!toolInstance) {
            const errMsg = `Unknown tool: ${toolName}`;
            log.warn(`[research-loop] ${errMsg}`);
            const errToolMessage = new ToolMessage({
              content: errMsg,
              tool_call_id: toolCall.id,
            });
            accumulatedMessages.push(errToolMessage);
            conversationMessages = [...conversationMessages, errToolMessage];
            continue;
          }

          log.debug(`[research-loop] Invoking tool: ${toolName}`, {
            args: toolCall.args,
          });

          // Create a span for the tool call
          const toolSpan = trace?.span({
            name: `tool:${toolName}`,
            input: toolCall.args,
          });

          try {
            const toolResult = await toolInstance.invoke(toolCall.args, {
              ...config,
              toolCall: { id: toolCall.id },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            // Handle Command results (searxng_search, write_file, etc.
            // return Command objects that carry state updates)
            if (
              toolResult &&
              typeof toolResult === "object" &&
              "update" in toolResult
            ) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const cmd = toolResult as any;
              const update = cmd.update ?? {};

              // Merge file updates
              if (update.files) {
                Object.assign(fileUpdates, update.files);
              }

              // Merge pending suggestions
              if (update.pendingSuggestions) {
                pendingSuggestions.push(...update.pendingSuggestions);
              }

              // Merge infoboxes
              if (update.infoboxes) {
                infoboxes.push(...update.infoboxes);
              }

              // Extract tool messages from the Command update
              if (update.messages) {
                for (const msg of update.messages) {
                  accumulatedMessages.push(msg);
                  conversationMessages = [...conversationMessages, msg];
                }
              }
            } else {
              // Simple string result (search_graph, read_file, ls)
              const content =
                typeof toolResult === "string"
                  ? toolResult
                  : JSON.stringify(toolResult);
              const toolMessage = new ToolMessage({
                content,
                tool_call_id: toolCall.id,
              });
              accumulatedMessages.push(toolMessage);
              conversationMessages = [...conversationMessages, toolMessage];
            }

            toolSpan?.end({ output: { success: true } });
          } catch (toolError) {
            const errorContent = `Tool error (${toolName}): ${
              toolError instanceof Error ? toolError.message : String(toolError)
            }`;
            log.warn(`[research-loop] ${errorContent}`);
            const errToolMessage = new ToolMessage({
              content: errorContent,
              tool_call_id: toolCall.id,
            });
            accumulatedMessages.push(errToolMessage);
            conversationMessages = [...conversationMessages, errToolMessage];
            toolSpan?.end({
              output: {
                success: false,
                error: errorContent,
              },
            });
          }

          // ---------------------------------------------------------------
          // Post-tool-call bookkeeping
          // ---------------------------------------------------------------
          if (toolName === "searxng_search") {
            const query = toolCall.args.query as string | undefined;
            if (query) {
              queriesExecuted.push(query);
            }
            hopCount++;

            log.debug(
              `[research-loop] Search hop ${hopCount}/${maxHops}: "${query}"`
            );

            // Embed search results into vector memory for future hops.
            // Fire-and-forget — never blocks the loop.
            const sessionId = state.sessionId ?? threadId;
            const newFileContent = Object.values(fileUpdates)
              .slice(-1)
              .join("\n")
              .slice(0, 3000);
            if (newFileContent) {
              upsertResearchChunks([
                {
                  sessionId,
                  content: newFileContent,
                  source: `searxng:${query ?? "unknown"}`,
                  hopIndex: hopCount,
                },
              ]).catch((err) =>
                log.warn("[research-loop] Vector upsert failed", { err })
              );
            }

            if (hopCount >= maxHops) {
              log.debug("[research-loop] Max hops reached — terminating loop");
              break;
            }
          }
        }

        // If we broke out of the tool-call loop due to max hops, break
        // the outer loop too
        if (hopCount >= maxHops) {
          break;
        }

        // Update the context message for the next iteration so the LLM
        // sees the latest research state
        const updatedContext = new HumanMessage(
          buildResearchContext(liveState())
        );
        // Replace the old context message at the end with the updated one.
        // We append rather than replace to keep message ordering clean for
        // the LLM — the most recent context is always the freshest.
        conversationMessages = [...conversationMessages, updatedContext];
      } catch (error) {
        generation?.end({
          output: null,
          metadata: {
            error: error instanceof Error ? error.message : String(error),
          },
        });

        log.error("[research-loop] LLM invocation failed", {
          error: error instanceof Error ? error.message : String(error),
          iteration,
        });

        // Don't crash the entire pipeline — break with what we have
        break;
      }
    }

    if (iteration >= MAX_SAFETY_ITERATIONS) {
      log.warn(
        `[research-loop] Safety ceiling (${MAX_SAFETY_ITERATIONS}) reached — forcing termination`
      );
    }

    // -----------------------------------------------------------------------
    // Return accumulated state delta
    // -----------------------------------------------------------------------
    log.debug("[research-loop] Complete", {
      iterations: iteration,
      hops: hopCount,
      queriesExecuted: queriesExecuted.length,
      newFiles: Object.keys(fileUpdates).length,
      newSuggestions: pendingSuggestions.length,
      newInfoboxes: infoboxes.length,
    });

    trace?.update({
      output: {
        iterations: iteration,
        hops: hopCount,
        queriesExecuted,
        fileCount: Object.keys(fileUpdates).length,
      },
    });

    return {
      messages: accumulatedMessages,
      files: fileUpdates,
      hopCount,
      queriesExecuted,
      pendingSuggestions,
      infoboxes,
    };
  };
}

export { createResearchLoopNode as default };
