import { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { BaseChatModelCallOptions } from "@langchain/core/language_models/chat_models";
import {
  AIMessageChunk,
  HumanMessage,
  isAIMessage,
  MessageStructure,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import { StructuredTool, tool } from "@langchain/core/tools";
import {
  Annotation,
  END,
  messagesStateReducer,
  START,
  StateGraph,
} from "@langchain/langgraph";
import dotenv from "dotenv";
import * as z from "zod";

import { getModel } from "@protolabsai/llm-providers/server";
import { wikipediaSearchTool } from "@protolabsai/llm-tools";

dotenv.config();

// Set up the model and model with tools cache (avoid re-initializing the model and model with tools)
let model: ReturnType<typeof getModel> | null = null;
let modelWithTools: Runnable<
  BaseLanguageModelInput,
  AIMessageChunk<MessageStructure>,
  BaseChatModelCallOptions
> | null = null;

// Define the state schema
const MessagesState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  llmCalls: Annotation<number | undefined>,
});

// Define the llm call node
async function llmCall({
  state,
  systemPrompt,
}: {
  state: typeof MessagesState.State;
  systemPrompt: string;
}) {
  if (!modelWithTools) {
    throw new Error("Model with tools not initialized");
  }
  return {
    messages: await modelWithTools.invoke([
      new SystemMessage(systemPrompt),
      ...state.messages,
    ]),
    llmCalls: (state.llmCalls ?? 0) + 1,
  };
}

// Define the tool node
async function toolNode({
  state,
  tools,
}: {
  state: typeof MessagesState.State;
  tools: StructuredTool[];
}) {
  const lastMessage = state.messages.at(-1);

  if (lastMessage == null || !isAIMessage(lastMessage)) {
    return { messages: [] };
  }

  const result: ToolMessage[] = [];
  for (const toolCall of lastMessage.tool_calls ?? []) {
    const tool = tools.find((t) => t.name === toolCall.name);
    if (!tool) {
      throw new Error(`Tool ${toolCall.name} not found`);
    }
    const observation = await tool.invoke(toolCall);
    result.push(observation);
  }

  return { messages: result };
}

// Define the should continue node
async function shouldContinue(state: typeof MessagesState.State) {
  const lastMessage = state.messages.at(-1);
  if (lastMessage == null || !isAIMessage(lastMessage)) return END;

  // If the LLM makes a tool call, then perform an action
  if (lastMessage.tool_calls?.length) {
    return "toolNode";
  }

  // Otherwise, we stop (reply to the user)
  return END;
}

/**
 * Create the react agent
 */
export const createReactAgent = ({
  _name,
  systemPrompt,
  _description,
  tools,
}: {
  _name: string;
  systemPrompt: string;
  _description: string;
  tools: StructuredTool[];
}) => {
  if (!modelWithTools) {
    model = getModel("smart", "anthropic", { maxTokens: 8192 });
    if (!model.bindTools) {
      throw new Error("Model does not support tool binding");
    }
    modelWithTools = model.bindTools(tools);
  }

  const agent = new StateGraph(MessagesState)
    .addNode("llmCall", (state: typeof MessagesState.State) =>
      llmCall({ state, systemPrompt })
    )
    .addNode("toolNode", (state: typeof MessagesState.State) =>
      toolNode({ state, tools })
    )
    .addEdge(START, "llmCall")
    .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])
    .addEdge("toolNode", "llmCall")
    .compile();

  return agent;
};

const _searchTool = tool(({ query }) => wikipediaSearchTool.invoke({ query }), {
  name: "wikipedia_search",
  description:
    "Search Wikipedia for information about an entity. Returns article content with metadata.",
  schema: z.object({
    query: z.string().describe("Search query (entity name)"),
  }),
});

// Define tools
const add = tool(({ a, b }) => a + b, {
  name: "add",
  description: "Add two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

const multiply = tool(({ a, b }) => a * b, {
  name: "multiply",
  description: "Multiply two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

const divide = tool(({ a, b }) => a / b, {
  name: "divide",
  description: "Divide two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

// Augment the LLM with tools
const toolsByName = {
  [add.name]: add,
  [multiply.name]: multiply,
  [divide.name]: divide,
  [wikipediaSearchTool.name]: wikipediaSearchTool,
};
const tools = Object.values(toolsByName);

createReactAgent({
  _name: "test",
  systemPrompt: "You are a helpful assistant.",
  _description: "A helpful assistant.",
  tools,
})
  .invoke({
    messages: [
      new HumanMessage(
        "Add 3 and the birth year of Albert Einstein according to Wikipedia."
      ),
    ],
  })
  .then((result) => {
    for (const message of result.messages) {
      console.log(`[${message.type}] ${message.content}`);
    }
  });
