import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { loadConfig } from "../config.js";
import { JobProcessorClient } from "../lib/job-processor.js";

export type IngestOptions = {
  mediaType?: string;
  wait?: boolean;
};

export async function runIngest(
  source: string,
  opts: IngestOptions
): Promise<void> {
  const cfg = loadConfig();
  const client = new JobProcessorClient(cfg.jobProcessorUrl);

  // Local-path inputs get verified before we read+base64 them.
  let finalSource = source;
  if (!/^https?:\/\//.test(source)) {
    const abs = resolve(source);
    if (!existsSync(abs)) {
      process.stderr.write(`rh: ${abs} does not exist\n`);
      process.exit(1);
    }
    if (!statSync(abs).isFile()) {
      process.stderr.write(
        `rh: ${abs} is not a file (only files supported in v1)\n`
      );
      process.exit(1);
    }
    finalSource = abs;
  }

  const enq = await client.ingest({
    source: finalSource,
    mediaType: opts.mediaType,
  });
  process.stdout.write(JSON.stringify(enq, null, 2) + "\n");

  if (opts.wait) {
    process.stderr.write(`rh: waiting for ${enq.jobId}…\n`);
    const finished = await client.waitFor(enq.jobId);
    process.stdout.write(JSON.stringify(finished, null, 2) + "\n");
    process.exit(finished.status === "completed" ? 0 : 1);
  }
}
