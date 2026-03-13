import { createDeepAgent } from "deepagents";

import { wikipediaSearchTool } from "../research-agent-tools";

// System prompt to steer the agent to be an expert researcher
const researchInstructions = `You are an expert researcher. Your job is to conduct thorough research and then write a polished report.

You have access to a wikipedia search tool as your primary means of gathering information.

## \`wikipedia_search\`

Use this to run an wikipedia search for a given query.
`;

const agent = createDeepAgent({
  tools: [wikipediaSearchTool],
  systemPrompt: researchInstructions,
});

export async function runWikipediaAgent({ query }: { query: string }) {
  const result = await agent.invoke({
    messages: [{ role: "user", content: query }],
  });

  return result.messages[result.messages.length - 1].content;
}
