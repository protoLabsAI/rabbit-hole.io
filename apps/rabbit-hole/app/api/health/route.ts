import { NextResponse } from "next/server";

/**
 * Health check endpoint for Docker containers and monitoring.
 *
 * Returns 200 with `status: "healthy" | "degraded"` and per-service detail.
 * The Next.js app itself is "healthy" if this handler runs at all; the
 * dependent services (Postgres for sessions, MinIO for files, the
 * job-processor sidecar) are checked best-effort and their status is
 * downgraded but not blocking.
 */

type ServiceStatus = "healthy" | "degraded" | "skipped";

async function checkPostgres(): Promise<ServiceStatus> {
  if (!process.env.APP_DATABASE_URL) return "skipped";
  try {
    // Dynamic import keeps pg out of the edge bundle for routes that don't need it.
    const { Client } = await import("pg");
    const client = new Client({
      connectionString: process.env.APP_DATABASE_URL,
    });
    await client.connect();
    await client.query("SELECT 1");
    await client.end();
    return "healthy";
  } catch {
    return "degraded";
  }
}

async function checkMinio(): Promise<ServiceStatus> {
  const endpoint = process.env.MINIO_ENDPOINT;
  if (!endpoint) return "skipped";
  try {
    const url = endpoint.startsWith("http")
      ? `${endpoint}/minio/health/live`
      : `http://${endpoint}/minio/health/live`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.ok ? "healthy" : "degraded";
  } catch {
    return "degraded";
  }
}

async function checkJobProcessor(): Promise<ServiceStatus> {
  const url = process.env.JOB_PROCESSOR_URL;
  if (!url) return "skipped";
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok ? "healthy" : "degraded";
  } catch {
    return "degraded";
  }
}

export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();

  const [postgres, minio, jobProcessor] = await Promise.all([
    checkPostgres(),
    checkMinio(),
    checkJobProcessor(),
  ]);

  const services = {
    nextjs: "healthy" as ServiceStatus,
    postgres,
    minio,
    jobProcessor,
  };

  const anyDegraded = Object.values(services).some((s) => s === "degraded");

  return NextResponse.json(
    {
      status: anyDegraded ? "degraded" : "healthy",
      timestamp: new Date().toISOString(),
      services,
      performance: { responseTime: Date.now() - startTime },
      environment: {
        nodeEnv: process.env.NODE_ENV,
      },
    },
    { status: 200 }
  );
}

// Load balancers issue HEAD for cheap liveness; share the same handler.
export const HEAD = GET;
