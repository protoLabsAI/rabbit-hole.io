/**
 * Ingestion route tests — focused on the caller-jobId contract (#289).
 */

import type { IncomingMessage, ServerResponse } from "http";

import { beforeEach, describe, expect, it, vi } from "vitest";

const enqueueMock = vi.fn();

vi.mock("sidequest", () => ({
  Sidequest: {
    build: () => ({
      queue: () => ({ enqueue: enqueueMock }),
    }),
  },
  // MediaIngestionJob extends Job; provide a stub base so the import resolves.
  Job: class Job {},
}));

vi.mock("../../jobs/MediaIngestionJob.js", () => ({
  MediaIngestionJob: class MediaIngestionJob {},
}));

import { handleIngestionRequest } from "../ingestion-routes";

function makeReq(method: string, url: string, body?: string): IncomingMessage {
  const chunks = body ? [Buffer.from(body)] : [];
  return {
    method,
    url,
    async *[Symbol.asyncIterator]() {
      for (const c of chunks) yield c;
    },
  } as unknown as IncomingMessage;
}

interface CapturedRes extends ServerResponse {
  statusCode: number;
  body: string;
}

function makeRes(): CapturedRes {
  const res = { statusCode: 0, body: "" } as unknown as CapturedRes;
  res.writeHead = ((status: number) => {
    res.statusCode = status;
    return res;
  }) as ServerResponse["writeHead"];
  res.end = ((chunk?: string) => {
    if (chunk) res.body += chunk;
    return res;
  }) as ServerResponse["end"];
  res.write = ((chunk: string) => {
    res.body += chunk;
    return true;
  }) as ServerResponse["write"];
  return res;
}

describe("POST /ingest — caller jobId contract (#289)", () => {
  beforeEach(() => {
    enqueueMock.mockReset();
  });

  it("returns the caller's jobId, not Sidequest's internal id", async () => {
    enqueueMock.mockResolvedValue({ id: 999 });
    const callerId = "00000000-0000-0000-0000-000000000001";
    const req = makeReq(
      "POST",
      "/ingest",
      JSON.stringify({ jobId: callerId, request: { source: { type: "url" } } })
    );
    const res = makeRes();

    const handled = await handleIngestionRequest(req, res);

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(202);
    const payload = JSON.parse(res.body);
    expect(payload.jobId).toBe(callerId);
    // Sidequest's internal id is surfaced separately, for correlation only.
    expect(payload.sidequestId).toBe(999);
  });

  it("rejects a request missing jobId", async () => {
    const req = makeReq(
      "POST",
      "/ingest",
      JSON.stringify({ request: { source: { type: "url" } } })
    );
    const res = makeRes();

    await handleIngestionRequest(req, res);

    expect(res.statusCode).toBe(400);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("status route echoes the caller's jobId from the path", async () => {
    const callerId = "abc-123";
    const req = makeReq("GET", `/ingest/${callerId}/status`);
    const res = makeRes();

    await handleIngestionRequest(req, res);

    const payload = JSON.parse(res.body);
    expect(payload.jobId).toBe(callerId);
  });
});
