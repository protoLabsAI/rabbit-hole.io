/**
 * Typed client for the job-processor HTTP API (port 8680).
 *
 * The job-processor is the existing rabbit-hole worker — postgres-backed
 * Sidequest queue, MinIO blob store, GPU-light. The CLI uses it to enqueue
 * media work (PDF parse, audio transcript, URL fetch) and poll status.
 */

export type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type Job = {
  id: string;
  type: string;
  status: JobStatus;
  result?: unknown;
  error?: string;
  created_at?: string;
  finished_at?: string;
};

export type IngestRequest = {
  /** Either a local path (read + uploaded) or a URL (fetched server-side). */
  source: string;
  /** Optional hint to route to a specific processor (paper | audio | url | etc). */
  type?: string;
  /** Free-form key/value passed through to the job. */
  metadata?: Record<string, unknown>;
};

export class JobProcessorClient {
  constructor(private baseUrl: string) {}

  async ingest(req: IngestRequest): Promise<Job> {
    const r = await fetch(`${this.baseUrl}/jobs/ingest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!r.ok) throw new Error(`ingest failed: ${r.status} ${await r.text()}`);
    return (await r.json()) as Job;
  }

  async status(jobId: string): Promise<Job> {
    const r = await fetch(`${this.baseUrl}/jobs/${jobId}`);
    if (!r.ok)
      throw new Error(`status ${jobId} failed: ${r.status} ${await r.text()}`);
    return (await r.json()) as Job;
  }

  async waitFor(
    jobId: string,
    opts: { intervalMs?: number; timeoutMs?: number } = {}
  ): Promise<Job> {
    const interval = opts.intervalMs ?? 2000;
    const deadline = Date.now() + (opts.timeoutMs ?? 5 * 60_000);
    while (Date.now() < deadline) {
      const j = await this.status(jobId);
      if (
        j.status === "completed" ||
        j.status === "failed" ||
        j.status === "cancelled"
      )
        return j;
      await new Promise((r) => setTimeout(r, interval));
    }
    throw new Error(`timed out waiting for job ${jobId}`);
  }
}
