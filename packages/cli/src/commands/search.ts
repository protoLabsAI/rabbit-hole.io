import { loadConfig } from "../config.js";
import { TavilyClient } from "../lib/tavily.js";

export type SearchOptions = {
  text?: boolean;
  max?: number;
};

export async function runSearch(
  query: string,
  opts: SearchOptions
): Promise<void> {
  const cfg = loadConfig();
  const client = new TavilyClient(cfg.tavilyApiKey ?? "");
  const res = await client.search(query, {
    maxResults: opts.max,
    includeAnswer: true,
  });

  if (opts.text) {
    if (res.answer) {
      process.stdout.write(`# ${res.query}\n\n${res.answer}\n\n`);
    }
    process.stdout.write("## Sources\n\n");
    for (const r of res.results) {
      process.stdout.write(`- [${r.title}](${r.url})\n`);
      if (r.content) process.stdout.write(`  ${r.content.slice(0, 200)}…\n`);
    }
    process.stdout.write("\n");
  } else {
    process.stdout.write(JSON.stringify(res, null, 2) + "\n");
  }
}
