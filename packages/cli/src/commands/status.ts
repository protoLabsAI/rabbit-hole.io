import { loadConfig } from "../config.js";
import { JobProcessorClient } from "../lib/job-processor.js";

export type StatusOptions = {
  wait?: boolean;
  result?: boolean;
};

export async function runStatus(
  jobId: string,
  opts: StatusOptions
): Promise<void> {
  const cfg = loadConfig();
  const client = new JobProcessorClient(cfg.jobProcessorUrl);

  const s = opts.wait
    ? await client.waitFor(jobId)
    : await client.status(jobId);
  process.stdout.write(JSON.stringify(s, null, 2) + "\n");

  if (opts.result && s.status === "completed") {
    const r = await client.result(jobId);
    process.stdout.write("---\n");
    process.stdout.write(JSON.stringify(r, null, 2) + "\n");
  }

  if (s.status === "failed" || s.status === "cancelled") process.exit(1);
}
