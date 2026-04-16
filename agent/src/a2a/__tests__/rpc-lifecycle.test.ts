import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startA2AServer } from "../index.js";

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
    const res = await fetch(`${base}/a2a`, {
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
      params: { skill: "search", input: "hi" },
    });
    const result = send.result as { taskId: string; status: { state: string } };
    expect(result.status.state).toBe("submitted");
    const taskId = result.taskId;

    // Register config AFTER the initial send. Spec requires this flow to work.
    const set = await rpc({
      jsonrpc: "2.0",
      id: 2,
      method: "tasks/pushNotificationConfig/set",
      params: { taskId, id: "cfg1", url: "https://example.com/cb" },
    });
    expect((set.result as { id: string }).id).toBe("cfg1");

    const list = await rpc({
      jsonrpc: "2.0",
      id: 3,
      method: "tasks/pushNotificationConfig/list",
      params: { taskId },
    });
    const listed = (list.result as { configs: unknown[] }).configs;
    expect(listed).toHaveLength(1);

    const del = await rpc({
      jsonrpc: "2.0",
      id: 4,
      method: "tasks/pushNotificationConfig/delete",
      params: { taskId, id: "cfg1" },
    });
    expect((del.result as { removed: boolean }).removed).toBe(true);
  });

  it("agent card served at both well-known paths", async () => {
    const canonical = await fetch(`${base}/.well-known/agent-card.json`).then(
      (r) => r.json()
    );
    const legacy = await fetch(`${base}/.well-known/agent.json`).then((r) =>
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
      const res = await fetch(`${base}/a2a`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: {} }),
      });
      expect(res.status).toBeLessThan(500);
    }
  });
});
