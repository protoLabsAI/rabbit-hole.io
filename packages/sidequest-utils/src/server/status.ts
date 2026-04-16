/**
 * Server-side Job Status Utilities
 *
 * Query job status directly from PostgreSQL.
 */

import { getJobQueuePool } from "@protolabsai/database";

import type { Job, JobStatus } from "../types";

/**
 * Normalize timestamp value (pg returns timestamps as strings or Date objects)
 * to ISO string format, handling null/undefined safely
 */
function normalizeTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    const date = new Date(value as string | Date);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    // Fall through to return null
  }

  return null;
}

/**
 * Parse data field which may be a JSON string from pg
 */
function parseDataField(data: unknown): Record<string, unknown> {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (data as Record<string, unknown>) || {};
}

/**
 * Sanitize pagination parameters
 */
function sanitizePagination(limit?: number, offset?: number) {
  const MAX_LIMIT = 100;
  const parsedLimit =
    limit !== undefined ? Math.floor(Number(limit)) : undefined;
  const parsedOffset =
    offset !== undefined ? Math.floor(Number(offset)) : undefined;

  const safeLimitfinal =
    parsedLimit !== undefined && !isNaN(parsedLimit)
      ? Math.min(Math.max(1, parsedLimit), MAX_LIMIT)
      : 50;
  const safeOffset =
    parsedOffset !== undefined && !isNaN(parsedOffset)
      ? Math.max(0, parsedOffset)
      : 0;

  return { limit: safeLimitfinal, offset: safeOffset };
}

/**
 * Get job status by ID
 */
export async function getJobStatus(jobId: string): Promise<Job | null> {
  const pool = getJobQueuePool();

  const result = await pool.query(
    `
    SELECT 
      id::text as "jobId",
      queue,
      state as "status",
      args as "data",
      result,
      errors->0->>'message' as "error",
      attempt as "attempts",
      max_attempts as "maxAttempts",
      inserted_at as "createdAt",
      attempted_at as "startedAt",
      completed_at as "completedAt",
      failed_at as "failedAt"
    FROM sidequest_jobs
    WHERE id = $1
    `,
    [jobId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  // Map Sidequest states to our JobStatus type
  const statusMap: Record<string, JobStatus> = {
    available: "pending",
    executing: "active",
    completed: "completed",
    failed: "failed",
    retryable: "failed",
  };

  return {
    jobId: row.jobId,
    queue: row.queue,
    status: statusMap[row.status] || "pending",
    data: parseDataField(row.data),
    result: row.result,
    error: row.error,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    createdAt: normalizeTimestamp(row.createdAt) || new Date().toISOString(),
    startedAt: normalizeTimestamp(row.startedAt),
    completedAt: normalizeTimestamp(row.completedAt),
    failedAt: normalizeTimestamp(row.failedAt),
  };
}

/**
 * List jobs with filters
 */
export async function listJobs(options: {
  queue?: string;
  status?: JobStatus;
  limit?: number;
  offset?: number;
}): Promise<{ jobs: Job[]; count: number }> {
  const pool = getJobQueuePool();

  const { queue, status } = options;

  // Sanitize pagination parameters
  const { limit, offset } = sanitizePagination(options.limit, options.offset);

  // Build WHERE conditions
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (queue) {
    conditions.push(`queue = $${paramIndex++}`);
    params.push(queue);
  }

  if (status) {
    // Map our JobStatus to Sidequest state(s)
    const statesByStatus: Record<JobStatus, string[]> = {
      pending: ["waiting"],
      active: ["claimed", "running"],
      completed: ["completed"],
      failed: ["failed"],
    };
    const states = statesByStatus[status] ?? [];
    if (states.length === 1) {
      conditions.push(`state = $${paramIndex++}`);
      params.push(states[0]);
    } else if (states.length > 1) {
      conditions.push(`state = ANY($${paramIndex++}::text[])`);
      params.push(states);
    }
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM sidequest_jobs ${whereClause}`,
    params
  );

  const count = parseInt(countResult.rows[0].count, 10);

  // Get jobs
  const result = await pool.query(
    `
    SELECT 
      id::text as "jobId",
      queue,
      state as "status",
      args as "data",
      result,
      errors->0->>'message' as "error",
      attempt as "attempts",
      max_attempts as "maxAttempts",
      inserted_at as "createdAt",
      attempted_at as "startedAt",
      completed_at as "completedAt",
      failed_at as "failedAt"
    FROM sidequest_jobs
    ${whereClause}
    ORDER BY inserted_at DESC
    LIMIT $${paramIndex++}
    OFFSET $${paramIndex++}
    `,
    [...params, limit, offset]
  );

  // Map Sidequest states to our JobStatus type
  const statusMap: Record<string, JobStatus> = {
    available: "pending",
    executing: "active",
    completed: "completed",
    failed: "failed",
    retryable: "failed",
  };

  const jobs: Job[] = result.rows.map((row) => ({
    jobId: row.jobId,
    queue: row.queue,
    status: statusMap[row.status] || "pending",
    data: parseDataField(row.data),
    result: row.result,
    error: row.error,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    createdAt: normalizeTimestamp(row.createdAt) || new Date().toISOString(),
    startedAt: normalizeTimestamp(row.startedAt),
    completedAt: normalizeTimestamp(row.completedAt),
    failedAt: normalizeTimestamp(row.failedAt),
  }));

  return { jobs, count };
}

/**
 * Get cached job completion by ID
 *
 * Queries the completion cache which persists after Sidequest cleanup.
 * Returns null if not found or not yet completed.
 */
export async function getJobCompletion(jobId: string): Promise<Job | null> {
  const pool = getJobQueuePool();

  const result = await pool.query(
    `
    SELECT 
      job_id::text as "jobId",
      queue,
      status,
      result,
      error,
      completed_at as "completedAt"
    FROM sidequest_job_completions
    WHERE job_id = $1
    `,
    [jobId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  return {
    jobId: row.jobId,
    queue: row.queue,
    status: row.status as JobStatus,
    data: {},
    result: row.result,
    error: row.error,
    attempts: 0,
    maxAttempts: 0,
    createdAt: normalizeTimestamp(row.completedAt) || new Date().toISOString(),
    startedAt: null,
    completedAt: normalizeTimestamp(row.completedAt),
    failedAt:
      row.status === "failed" ? normalizeTimestamp(row.completedAt) : null,
  };
}

/**
 * List recent job completions with filters
 */
export async function listJobCompletions(options: {
  userId?: string;
  workspaceId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ completions: Job[]; count: number }> {
  const pool = getJobQueuePool();

  const { userId, workspaceId } = options;

  // Sanitize pagination parameters
  const { limit, offset } = sanitizePagination(options.limit, options.offset);

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (userId) {
    conditions.push(`user_id = $${paramIndex++}`);
    params.push(userId);
  }

  if (workspaceId) {
    conditions.push(`workspace_id = $${paramIndex++}`);
    params.push(workspaceId);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM sidequest_job_completions ${whereClause}`,
    params
  );

  const count = parseInt(countResult.rows[0].count, 10);

  const result = await pool.query(
    `
    SELECT 
      job_id::text as "jobId",
      queue,
      status,
      result,
      error,
      completed_at as "completedAt"
    FROM sidequest_job_completions
    ${whereClause}
    ORDER BY completed_at DESC
    LIMIT $${paramIndex++}
    OFFSET $${paramIndex++}
    `,
    [...params, limit, offset]
  );

  const completions: Job[] = result.rows.map((row) => ({
    jobId: row.jobId,
    queue: row.queue,
    status: row.status as JobStatus,
    data: {},
    result: row.result,
    error: row.error,
    attempts: 0,
    maxAttempts: 0,
    createdAt: normalizeTimestamp(row.completedAt) || new Date().toISOString(),
    startedAt: null,
    completedAt: normalizeTimestamp(row.completedAt),
    failedAt:
      row.status === "failed" ? normalizeTimestamp(row.completedAt) : null,
  }));

  return { completions, count };
}
