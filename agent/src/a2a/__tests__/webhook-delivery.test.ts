import { describe, expect, it, vi } from "vitest";

import { SsrfValidator } from "../security/ssrf.js";
import { deliver } from "../security/webhook-delivery.js";
import { PushConfigStore } from "../store/push-config-store.js";

describe("webhook delivery", () => {
  it("reads config from live store on every delivery — not closed over", async () => {
    const pushStore = new PushConfigStore();
    const ssrf = new SsrfValidator({ allowedHosts: ["example.com"] });
    const fetches: string[] = [];
    const doFetch = vi.fn(async (url: string | URL) => {
      fetches.push(String(url));
      return new Response("ok", { status: 200 });
    }) as unknown as typeof fetch;

    const taskId = "task-1";
    pushStore.set({ taskId, id: "c1", url: "https://example.com/v1" });

    // First delivery — hits v1
    await deliver("c1", taskId, {
      doFetch,
      timeoutMs: 1000,
      ssrf,
      pushStore,
      log: () => {},
      record: { taskId, artifact: {}, status: {} },
    });

    // Consumer mutates the config mid-flight.
    pushStore.set({ taskId, id: "c1", url: "https://example.com/v2" });

    // Second delivery — reads the updated URL, proving we don't cache.
    await deliver("c1", taskId, {
      doFetch,
      timeoutMs: 1000,
      ssrf,
      pushStore,
      log: () => {},
      record: { taskId, artifact: {}, status: {} },
    });

    expect(fetches).toEqual([
      "https://example.com/v1",
      "https://example.com/v2",
    ]);
  });

  it("SSRF-validates URL on every delivery even when config was registered earlier", async () => {
    const pushStore = new PushConfigStore();
    // workstacean is allowed so initial registration passes.
    const ssrf = new SsrfValidator({ allowedHosts: ["workstacean"] });
    const doFetch = vi.fn() as unknown as typeof fetch;
    const log = vi.fn();

    pushStore.set({
      taskId: "t",
      id: "c1",
      url: "http://workstacean:3000/cb",
    });

    // Mutate to a disallowed private IP. Delivery must catch this — a
    // config that "passed registration" isn't trusted forever.
    pushStore.set({ taskId: "t", id: "c1", url: "http://192.168.1.5/cb" });

    await deliver("c1", "t", {
      doFetch,
      timeoutMs: 1000,
      ssrf,
      pushStore,
      log,
      record: { taskId: "t", artifact: {}, status: {} },
    });

    expect(doFetch).not.toHaveBeenCalled();
    // Logged SSRF rejection (URL + reason), never the body.
    const joined = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).toMatch(/ssrf rejected/);
  });

  it("never logs body or Authorization header", async () => {
    const pushStore = new PushConfigStore();
    const ssrf = new SsrfValidator({ allowedHosts: ["example.com"] });
    const doFetch = vi.fn(async () => new Response("ok", { status: 200 }));
    const log = vi.fn();

    pushStore.set({
      taskId: "t",
      id: "c1",
      url: "https://example.com/cb",
      token: "super-secret-token",
    });

    await deliver("c1", "t", {
      doFetch: doFetch as unknown as typeof fetch,
      timeoutMs: 1000,
      ssrf,
      pushStore,
      log,
      record: {
        taskId: "t",
        artifact: { sensitive: "payload" },
        status: {},
      },
    });

    const joined = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).not.toContain("super-secret-token");
    expect(joined).not.toContain("sensitive");
    // We do log URL + status.
    expect(joined).toContain("https://example.com/cb");
    expect(joined).toContain("(200)");
  });
});
