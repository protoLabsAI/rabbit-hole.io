import { loadConfig } from "../config.js";
import { JobProcessorClient } from "../lib/job-processor.js";

export type RecallOptions = {
  text?: boolean;
  topK?: number;
};

export async function runRecall(
  query: string,
  opts: RecallOptions
): Promise<void> {
  const cfg = loadConfig();
  const client = new JobProcessorClient(cfg.jobProcessorUrl);

  const res = await client.recall(query, { topK: opts.topK });

  if (opts.text) {
    if (res.hits.length === 0) {
      process.stdout.write(`No corpus matches for "${query}".\n`);
      return;
    }
    process.stdout.write(`# Corpus matches for "${query}"\n\n`);
    for (const h of res.hits) {
      const pct = (h.score * 100).toFixed(1);
      process.stdout.write(
        `- **${h.source}** (chunk ${h.chunkIndex}, ${pct}%)\n`
      );
      process.stdout.write(
        `  ${h.content.slice(0, 240).replace(/\n+/g, " ")}…\n`
      );
    }
    process.stdout.write("\n");
  } else {
    process.stdout.write(JSON.stringify(res, null, 2) + "\n");
  }
}
