import { loadConfig } from "../config.js";
import { webSearch } from "../lib/web-search.js";

export type SearchOptions = {
  text?: boolean;
  max?: number;
};

export async function runSearch(
  query: string,
  opts: SearchOptions
): Promise<void> {
  const cfg = loadConfig();
  const res = await webSearch(cfg, query, { maxResults: opts.max });

  if (opts.text) {
    process.stdout.write(`# ${res.query}  _(via ${res.provider})_\n\n`);
    if (res.answer) {
      process.stdout.write(`${res.answer}\n\n`);
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
