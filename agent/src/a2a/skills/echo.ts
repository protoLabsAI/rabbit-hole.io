/**
 * Placeholder producers for the researcher's two skills.
 *
 * These exist so the A2A server has working handlers to register while the
 * real integrations (search pipeline, deep research graph) are rewired in
 * follow-up work. They stream a short acknowledgement and finish — enough
 * to exercise the full A2A lifecycle (submitted → working → artifact
 * deltas → terminal artifact → terminal status) during fleet testing.
 *
 * Real producers will call into agent/src/research-agent/ (deep_research)
 * and shared search utilities (search) and reuse the same ctx.pushText /
 * ctx.finish / ctx.fail contract.
 */

import type { ProducerFn } from "../store/task-store.js";

export const echoSearchProducer: ProducerFn = async (ctx, input) => {
  const header = `# Search results (stub)\n\nQuery: **${input}**\n\n`;
  for (const token of tokenize(
    header +
      "Results are not yet wired. Responding with a stub so A2A lifecycle exercises end-to-end."
  )) {
    if (ctx.signal.aborted) return;
    ctx.pushText(token);
    await sleep(20);
  }
  ctx.finish();
};

export const echoDeepResearchProducer: ProducerFn = async (ctx, input) => {
  const header = `# Deep research (stub)\n\nTopic: **${input}**\n\n## Plan\n\n`;
  const body = [
    "- Scope dimensions (stub)\n",
    "- Gather sources (stub)\n",
    "- Evaluate gaps (stub)\n",
    "- Synthesize (stub)\n\n",
    "Real pipeline will replace this with scope → plan → research → evaluate → synthesis via the LangGraph research_agent graph.\n",
  ].join("");

  for (const token of tokenize(header + body)) {
    if (ctx.signal.aborted) return;
    ctx.pushText(token);
    await sleep(30);
  }
  ctx.finish();
};

function tokenize(s: string): string[] {
  // Split on whitespace but keep the delimiters so reassembly is lossless.
  return s.match(/\S+|\s+/g) ?? [s];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
