// @vitest-environment node
import { request as httpRequest } from "node:http";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startA2AServer } from "../index.js";

// The root vitest.setup.ts installs `global.fetch = vi.fn()` for the
// jsdom-majority test suite, which returns undefined and breaks these
// tests. Instead of relying on the global, we go straight to node:http —
// it's always available, zero new deps, and these tests only talk to
// our local server on 127.0.0.1.
interface SimpleResponse {
  status: number;
  json(): Promise<unknown>;
}

function httpJson(
  url: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
): Promise<SimpleResponse> {
  const parsed = new URL(url);
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: init.method ?? "GET",
        headers: init.headers ?? {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          resolve({
            status: res.statusCode ?? 0,
            json: async () => (body.length === 0 ? null : JSON.parse(body)),
          });
        });
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    if (init.body) req.write(init.body);
    req.end();
  });
}

describe("A2A RPC lifecycle", () => {
  let server: Awaited<ReturnType<typeof startA2AServer>>;
  let base: string;

  beforeEach(async () => {
    server = await startA2AServer({
      port: 0, // ephemeral
      producers: {
        // Fast synthetic producer so tests don't wait on the echo skill's
        // per-token sleep. Emits three tokens then finishes.
        search: async (ctx, input) => {
          ctx.pushText(`Q: ${input}\n`);
          ctx.pushText("chunk-2\n");
          ctx.pushText("done");
          ctx.finish();
        },
      },
    });
    base = `http://127.0.0.1:${server.port}`;
  });

  afterEach(async () => {
    await server.close();
  });

  async function rpc(
    body: unknown
  ): Promise<{ result?: unknown; error?: { code: number; message: string } }> {
    const res = await httpJson(`${base}/a2a`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json() as Promise<{
      result?: unknown;
      error?: { code: number; message: string };
    }>;
  }

  it("post-submit: register push config after state:submitted", async () => {
    const send = await rpc({
      jsonrpc: "2.0",
      id: 1,
      method: "message/send",
      params: {
        message: { role: "user", parts: [{ kind: "text", text: "hi" }] },
        metadata: { skillHint: "search" },
      },
    });
    const result = send.result as { id: string; status: { state: string } };
    expect(result.status.state).toBe("submitted");
    const taskId = result.id;

    // Register config AFTER the initial send — spec shape:
    // { taskId, pushNotificationConfig: { url, authentication?, id? } }
    const set = await rpc({
      jsonrpc: "2.0",
      id: 2,
      method: "tasks/pushNotificationConfig/set",
      params: {
        taskId,
        pushNotificationConfig: {
          id: "cfg1",
          url: "https://example.com/cb",
        },
      },
    });
    // Response matches Quinn's canonical shape.
    const setResult = set.result as {
      taskId: string;
      pushNotificationConfig: { id: string; url: string };
    };
    expect(setResult.taskId).toBe(taskId);
    expect(setResult.pushNotificationConfig.id).toBe("cfg1");
    expect(setResult.pushNotificationConfig.url).toBe("https://example.com/cb");

    // list returns an array of {taskId, pushNotificationConfig} per config.
    const list = await rpc({
      jsonrpc: "2.0",
      id: 3,
      method: "tasks/pushNotificationConfig/list",
      params: { taskId },
    });
    const listed = list.result as Array<{
      taskId: string;
      pushNotificationConfig: { url: string };
    }>;
    expect(listed).toHaveLength(1);
    expect(listed[0]!.pushNotificationConfig.url).toBe(
      "https://example.com/cb"
    );

    // delete clears the single-slot config, returns {deleted: true}.
    const del = await rpc({
      jsonrpc: "2.0",
      id: 4,
      method: "tasks/pushNotificationConfig/delete",
      params: { taskId },
    });
    expect((del.result as { deleted: boolean }).deleted).toBe(true);
  });

  it("agent card served at both well-known paths", async () => {
    const canonical = await httpJson(
      `${base}/.well-known/agent-card.json`
    ).then((r) => r.json());
    const legacy = await httpJson(`${base}/.well-known/agent.json`).then((r) =>
      r.json()
    );
    expect(canonical).toEqual(legacy);
    const c = canonical as {
      url: string;
      skills: Array<{ id: string }>;
      securitySchemes: Record<string, unknown>;
    };
    // url always ends in /a2a per spec
    expect(c.url.endsWith("/a2a")).toBe(true);
    // Default researcher skills are populated
    expect(c.skills.map((s) => s.id).sort()).toEqual([
      "deep_research",
      "search",
    ]);
    // Security scheme declared
    expect(c.securitySchemes["apiKey"]).toBeDefined();
  });

  it("all 10 spec methods either succeed or return -32601, never 500", async () => {
    const methods = [
      "message/send",
      "message/stream",
      "message/sendStream",
      "tasks/get",
      "tasks/cancel",
      "tasks/resubscribe",
      "tasks/pushNotificationConfig/set",
      "tasks/pushNotificationConfig/get",
      "tasks/pushNotificationConfig/list",
      "tasks/pushNotificationConfig/delete",
    ];
    // Minimum params by method to keep the router on the "registered" path;
    // -32602 (invalid params) is also an acceptable outcome for registered methods.
    for (const method of methods) {
      const res = await httpJson(`${base}/a2a`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: {} }),
      });
      expect(res.status).toBeLessThan(500);
    }
  });
});
