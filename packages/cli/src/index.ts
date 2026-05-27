import { Command } from "commander";

// Single source of truth for the version — tsup inlines this at build time, so
// `rh --version` always matches the published package (it used to be a
// hardcoded string that drifted behind package.json on every release).
import pkg from "../package.json";

import { runIngest } from "./commands/ingest.js";
import { runRecall } from "./commands/recall.js";
import { runResearch } from "./commands/research.js";
import { runSearch } from "./commands/search.js";
import { runStatus } from "./commands/status.js";

const program = new Command();

program
  .name("rh")
  .description(
    "Rabbit Hole CLI — search the web, ingest media, run deep research."
  )
  .version(pkg.version);

program
  .command("search")
  .description(
    "Web search via Tavily (with answer summary). Returns JSON by default."
  )
  .argument("<query>", "search query string")
  .option("--text", "human-readable markdown instead of JSON")
  .option("-m, --max <n>", "max results (default 5)", (v) => parseInt(v, 10))
  .action((query: string, opts) =>
    runSearch(query, opts).catch((err) => fail(err))
  );

program
  .command("recall")
  .description(
    "Corpus search over your ingested files (pgvector cosine). JSON by default."
  )
  .argument("<query>", "what to recall from ingested docs")
  .option("--text", "human-readable markdown instead of JSON")
  .option("-k, --top-k <n>", "number of chunks to return (default 8)", (v) =>
    parseInt(v, 10)
  )
  .action((query: string, opts) =>
    runRecall(query, { text: opts.text, topK: opts.topK }).catch((err) =>
      fail(err)
    )
  );

program
  .command("research")
  .description(
    "Multi-step deep research: planner → searches → synthesized markdown report."
  )
  .argument("<topic>", "research topic")
  .option(
    "-d, --depth <n>",
    "number of sub-queries to fan out (default 2)",
    (v) => parseInt(v, 10)
  )
  .option(
    "--max-results <n>",
    "max search results per sub-query (default 4)",
    (v) => parseInt(v, 10)
  )
  .action((topic: string, opts) =>
    runResearch(topic, opts).catch((err) => fail(err))
  );

program
  .command("ingest")
  .description(
    "Queue a file or URL to the job-processor for parsing / transcription."
  )
  .argument("<source>", "local file path or http(s) URL")
  .option(
    "-m, --media-type <type>",
    "MIME type override (e.g. application/pdf, audio/mpeg)"
  )
  .option("--wait", "block until the job finishes")
  .action((source: string, opts) =>
    runIngest(source, opts).catch((err) => fail(err))
  );

program
  .command("status")
  .description("Get current state of a job by id.")
  .argument("<job-id>", "job id returned by `rh ingest`")
  .option("--wait", "block until the job reaches a terminal state")
  .option("--result", "also fetch /ingest/:id/result when status=completed")
  .action((jobId: string, opts) =>
    runStatus(jobId, opts).catch((err) => fail(err))
  );

program.parseAsync();

function fail(err: unknown): never {
  process.stderr.write(
    `rh: ${err instanceof Error ? err.message : String(err)}\n`
  );
  process.exit(1);
}
