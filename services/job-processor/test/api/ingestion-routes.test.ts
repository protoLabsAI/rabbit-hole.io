/**
 * Integration tests for the ingestion HTTP route handler.
 *
 * A lightweight in-process HTTP server is started for each test suite and
 * torn down afterwards.  The Sidequest module is mocked so that no real
 * PostgreSQL connection is required.
 *
 * NOTE: We use Node's built-in `http` module for requests rather than
 * global `fetch` because the root vitest.setup.ts stubs fetch with vi.fn().
 */

import { createServer, request as httpRequest, type Server } from "http";

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// ==================== Mock Sidequest before importing the handler ====================

vi.mock("sidequest", () => ({
  // Job base class — MediaIngestionJob extends Job, so we need a stub
  Job: class MockJob {},
  Sidequest: {
    build: vi.fn().mockReturnValue({
      queue: vi.fn().mockReturnValue({
        enqueue: vi.fn().mockResolvedValue({ id: "mock-job-id" }),
      }),
    }),
  },
}));

// Mock the Postgres pool — status/result/list read media_ingestion_status,
// and POST /ingest records the initial "queued" row.
const queryMock = vi.fn();
vi.mock("@protolabsai/database", () => ({
  getGlobalPostgresPool: () => ({ query: queryMock }),
}));

// Mock MinIO — the result endpoint fetches result.json for completed jobs.
const downloadFileMock = vi.fn();
vi.mock("@protolabsai/utils/storage", () => ({
  MinioService: class {
    downloadFile = downloadFileMock;
  },
}));

beforeEach(() => {
  // Default: queries succeed with no rows; tests override per-case.
  queryMock.mockReset().mockResolvedValue({ rows: [] });
  downloadFileMock.mockReset();
});

// Mock MediaIngestionJob so the handler can be imported without a database
vi.mock("../../jobs/MediaIngestionJob.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../jobs/MediaIngestionJob.js")>();
  return {
    ...original,
    MediaIngestionJob: class MockMediaIngestionJob {},
  };
});

import { handleIngestionRequest } from "../../src/api/ingestion-routes.js";

// ==================== HTTP helper (replaces global fetch) ====================

interface HttpResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
  json<T = Record<string, unknown>>(): T;
}

function httpGet(url: string): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = httpRequest(
      {
        hostname: parsed.hostname,
        port: Number(parsed.port),
        path: parsed.pathname + parsed.search,
        method: "GET",
      },
      (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => (body += chunk.toString()));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers as Record<
              string,
              string | string[] | undefined
            >,
            body,
            json<T>() {
              return JSON.parse(body) as T;
            },
          });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

function httpPost(
  url: string,
  bodyStr: string,
  contentType = "application/json"
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyBuf = Buffer.from(bodyStr, "utf8");
    const req = httpRequest(
      {
        hostname: parsed.hostname,
        port: Number(parsed.port),
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          "Content-Type": contentType,
          "Content-Length": bodyBuf.length,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => (body += chunk.toString()));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers as Record<
              string,
              string | string[] | undefined
            >,
            body,
            json<T>() {
              return JSON.parse(body) as T;
            },
          });
        });
      }
    );
    req.on("error", reject);
    req.write(bodyBuf);
    req.end();
  });
}

// ==================== Test server ====================

let server: Server;
let baseUrl: string;

beforeAll(() => {
  return new Promise<void>((resolve) => {
    server = createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      const handled = await handleIngestionRequest(req, res);
      if (!handled) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
      }
    });

    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterAll(() => {
  return new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

// ==================== POST /ingest ====================

describe("POST /ingest", () => {
  it("returns 202 for a valid ingestion request", async () => {
    const body = {
      jobId: "job-abc-123",
      request: {
        source: {
          type: "file",
          bufferBase64: Buffer.from("hello").toString("base64"),
          mediaType: "text/plain",
        },
        workspaceId: "ws-1",
        requestedBy: "user-1",
      },
    };

    const res = await httpPost(`${baseUrl}/ingest`, JSON.stringify(body));

    expect(res.status).toBe(202);
    const json = res.json();
    expect(json.success).toBe(true);
    // The response echoes the caller's jobId; Sidequest's internal id is
    // surfaced separately as sidequestId. (#289)
    expect(json.jobId).toBe("job-abc-123");
    expect(json.sidequestId).toBe("mock-job-id");
  });

  it("returns 400 when jobId is missing", async () => {
    const res = await httpPost(
      `${baseUrl}/ingest`,
      JSON.stringify({ request: { source: {} } })
    );

    expect(res.status).toBe(400);
    const json = res.json();
    expect(json.error).toBeTruthy();
  });

  it("returns 400 when request is missing", async () => {
    const res = await httpPost(
      `${baseUrl}/ingest`,
      JSON.stringify({ jobId: "job-1" })
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const res = await httpPost(`${baseUrl}/ingest`, "{ invalid json }");

    expect(res.status).toBe(400);
    const json = res.json();
    expect(json.error).toMatch(/json/i);
  });

  it("returns JSON content-type on 202", async () => {
    const body = {
      jobId: "job-ct",
      request: { source: { type: "url", url: "https://example.com/v.mp4" } },
    };

    const res = await httpPost(`${baseUrl}/ingest`, JSON.stringify(body));

    const ct = (res.headers["content-type"] as string) ?? "";
    expect(ct).toContain("application/json");
  });
});

// ==================== GET /ingest/:jobId/status ====================

describe("GET /ingest/:jobId/status", () => {
  it("returns the persisted status for a known job", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          status: "completed",
          category: "document",
          error: null,
          text_length: 1234,
          artifacts_count: 2,
          created_at: "2026-05-27T00:00:00Z",
          updated_at: "2026-05-27T00:01:00Z",
        },
      ],
    });
    const res = await httpGet(`${baseUrl}/ingest/job-xyz/status`);
    expect(res.status).toBe(200);

    const json = res.json();
    expect(json.jobId).toBe("job-xyz");
    expect(json.status).toBe("completed");
    expect(json.textLength).toBe(1234);
  });

  it("returns 404 + status 'unknown' for an unknown job", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await httpGet(`${baseUrl}/ingest/nope-404/status`);
    expect(res.status).toBe(404);
    expect(res.json().status).toBe("unknown");
  });
});

// ==================== GET /ingest/:jobId/result ====================

describe("GET /ingest/:jobId/result", () => {
  it("returns the stored result for a completed job", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { status: "completed", results_key: "ingestion-results/x/r.json" },
      ],
    });
    downloadFileMock.mockResolvedValueOnce(
      Buffer.from(JSON.stringify({ text: "extracted", category: "document" }))
    );
    const res = await httpGet(`${baseUrl}/ingest/job-abc/result`);
    expect(res.status).toBe(200);

    const json = res.json<{
      jobId: string;
      status: string;
      result: { text: string };
    }>();
    expect(json.jobId).toBe("job-abc");
    expect(json.status).toBe("completed");
    expect(json.result.text).toBe("extracted");
  });

  it("returns null result while the job is not yet completed", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ status: "processing", results_key: null }],
    });
    const res = await httpGet(`${baseUrl}/ingest/job-pending/result`);
    expect(res.status).toBe(200);
    const json = res.json();
    expect(json.status).toBe("processing");
    expect(json.result).toBeNull();
    expect(downloadFileMock).not.toHaveBeenCalled();
  });
});

// ==================== GET /ingest (list) ====================

describe("GET /ingest", () => {
  it("returns recent jobs from the status table", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          job_id: "j1",
          status: "completed",
          category: "document",
          error: null,
          created_at: "2026-05-27T00:00:00Z",
          updated_at: "2026-05-27T00:01:00Z",
        },
      ],
    });
    const res = await httpGet(`${baseUrl}/ingest`);
    expect(res.status).toBe(200);

    const json = res.json<{ jobs: Array<{ jobId: string; status: string }> }>();
    expect(Array.isArray(json.jobs)).toBe(true);
    expect(json.jobs[0].jobId).toBe("j1");
    expect(json.jobs[0].status).toBe("completed");
  });
});

// ==================== SSE stream ====================

describe("GET /ingest/:jobId/stream", () => {
  it("returns 200 with text/event-stream content-type", async () => {
    const res = await httpGet(`${baseUrl}/ingest/job-stream/stream`);
    expect(res.status).toBe(200);
    const ct = (res.headers["content-type"] as string) ?? "";
    expect(ct).toContain("text/event-stream");
  });
});

// ==================== 404 for unknown routes ====================

describe("Unknown routes", () => {
  it("returns 404 for an unrecognised GET path", async () => {
    const res = await httpGet(`${baseUrl}/unknown-endpoint`);
    expect(res.status).toBe(404);
  });

  it("returns 404 for an unrecognised POST path", async () => {
    const res = await httpPost(`${baseUrl}/nonexistent`, "{}");
    expect(res.status).toBe(404);
  });
});
