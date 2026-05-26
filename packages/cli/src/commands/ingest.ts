import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { loadConfig } from "../config.js";
import { JobProcessorClient } from "../lib/job-processor.js";

export type IngestOptions = {
  type?: string;
  wait?: boolean;
};

export async function runIngest(
  source: string,
  opts: IngestOptions
): Promise<void> {
  const cfg = loadConfig();
  const client = new JobProcessorClient(cfg.jobProcessorUrl);

  // If `source` looks like a local path, resolve + verify it exists. URLs
  // pass through untouched — the job-processor fetches them itself.
  let finalSource = source;
  if (!/^https?:\/\//.test(source)) {
    const abs = resolve(source);
    if (!existsSync(abs)) {
      process.stderr.write(`rh: ${abs} does not exist\n`);
      process.exit(1);
    }
    const st = statSync(abs);
    if (!st.isFile()) {
      process.stderr.write(
        `rh: ${abs} is not a file (only files supported in v1)\n`
      );
      process.exit(1);
    }
    finalSource = abs;
  }

  const job = await client.ingest({ source: finalSource, type: opts.type });
  process.stdout.write(JSON.stringify(job, null, 2) + "\n");

  if (opts.wait) {
    process.stderr.write(`rh: waiting for ${job.id}…\n`);
    const finished = await client.waitFor(job.id);
    process.stdout.write(JSON.stringify(finished, null, 2) + "\n");
    process.exit(finished.status === "completed" ? 0 : 1);
  }
}
