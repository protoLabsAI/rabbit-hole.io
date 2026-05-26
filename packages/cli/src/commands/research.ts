import { loadConfig } from "../config.js";
import { LlmClient, type ChatMessage } from "../lib/llm.js";
import { TavilyClient } from "../lib/tavily.js";

export type ResearchOptions = {
  depth?: number;
  maxResults?: number;
};

const PLANNER_SYSTEM = `You are a research planner.
Given a topic, output a JSON array of 2-5 specific sub-queries that, together,
would let a researcher answer the topic well. Output ONLY the JSON array,
no prose. Each query is a focused, search-engine-ready string.`;

const SYNTHESIZER_SYSTEM = `You are a research synthesizer.
Given a topic and a set of search results across multiple sub-queries,
write a concise markdown report. Cite sources inline as [n] referencing a
numbered list at the end. Be specific, avoid hedging when sources agree,
note disagreement when they don't.`;

export async function runResearch(
  topic: string,
  opts: ResearchOptions
): Promise<void> {
  const cfg = loadConfig();
  const depth = opts.depth ?? 2;
  const llm = new LlmClient(cfg.llmBaseUrl, cfg.llmKey, cfg.llmModel);
  const tavily = new TavilyClient(cfg.tavilyApiKey ?? "");

  // 1. Plan: ask the LLM to break the topic into sub-queries.
  process.stderr.write(`rh: planning (depth=${depth})…\n`);
  const planRaw = await llm.chat([
    { role: "system", content: PLANNER_SYSTEM },
    {
      role: "user",
      content: `Topic: ${topic}\nReturn ${depth + 1} sub-queries.`,
    },
  ]);
  const subQueries = extractJsonArray(planRaw).slice(0, depth + 1);
  if (subQueries.length === 0) {
    process.stderr.write(
      `rh: planner returned no queries, falling back to topic itself\n`
    );
    subQueries.push(topic);
  }

  // 2. Search: hit Tavily for each sub-query in parallel.
  process.stderr.write(`rh: searching ${subQueries.length} sub-queries…\n`);
  const searches = await Promise.all(
    subQueries.map((q) =>
      tavily.search(q, {
        maxResults: opts.maxResults ?? 4,
        includeAnswer: true,
      })
    )
  );

  // 3. Synthesize: hand all sources to the LLM, get a markdown report.
  process.stderr.write(`rh: synthesizing…\n`);
  const evidence = searches
    .map((s, i) => {
      const lines = [`### sub-query ${i + 1}: ${s.query}`];
      if (s.answer) lines.push(`tavily answer: ${s.answer}`);
      s.results.forEach((r, j) => {
        lines.push(`- [${i + 1}.${j + 1}] ${r.title} — ${r.url}`);
        if (r.content) lines.push(`  ${r.content.slice(0, 400)}`);
      });
      return lines.join("\n");
    })
    .join("\n\n");

  const messages: ChatMessage[] = [
    { role: "system", content: SYNTHESIZER_SYSTEM },
    {
      role: "user",
      content: `Topic: ${topic}\n\nEvidence:\n${evidence}\n\nWrite the report.`,
    },
  ];
  const report = await llm.chat(messages, {
    temperature: 0.2,
    maxTokens: 8000,
  });
  process.stdout.write(report + "\n");
}

function extractJsonArray(text: string): string[] {
  // Greedy: find first `[` and last `]`, attempt parse.
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(arr)
      ? arr.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}
