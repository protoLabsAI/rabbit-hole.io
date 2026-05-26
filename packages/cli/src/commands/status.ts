import { loadConfig } from "../config.js";
import { JobProcessorClient } from "../lib/job-processor.js";

export type StatusOptions = {
  wait?: boolean;
};

export async function runStatus(
  jobId: string,
  opts: StatusOptions
): Promise<void> {
  const cfg = loadConfig();
  const client = new JobProcessorClient(cfg.jobProcessorUrl);

  const job = opts.wait
    ? await client.waitFor(jobId)
    : await client.status(jobId);
  process.stdout.write(JSON.stringify(job, null, 2) + "\n");

  if (job.status === "failed" || job.status === "cancelled") process.exit(1);
}
