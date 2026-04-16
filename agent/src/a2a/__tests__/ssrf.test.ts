// @vitest-environment node
import { describe, expect, it } from "vitest";

import { SsrfError, SsrfValidator } from "../security/ssrf.js";

describe("SsrfValidator", () => {
  const v = new SsrfValidator({
    allowedHosts: ["workstacean", "automaker-server"],
  });

  it("accepts public hostnames", () => {
    expect(() => v.validate("https://example.com/webhook")).not.toThrow();
    expect(() => v.validate("https://hooks.proto-labs.ai/cb")).not.toThrow();
  });

  it("rejects loopback (hostname + literal + v6)", () => {
    expect(() => v.validate("http://localhost:9999/cb")).toThrow(SsrfError);
    expect(() => v.validate("http://127.0.0.1/cb")).toThrow(SsrfError);
    expect(() => v.validate("http://127.255.0.1/cb")).toThrow(SsrfError);
    expect(() => v.validate("http://[::1]/cb")).toThrow(SsrfError);
  });

  it("rejects RFC1918 literals", () => {
    expect(() => v.validate("http://10.0.0.5/cb")).toThrow(SsrfError);
    expect(() => v.validate("http://172.16.0.5/cb")).toThrow(SsrfError);
    expect(() => v.validate("http://172.31.255.255/cb")).toThrow(SsrfError);
    expect(() => v.validate("http://192.168.1.1/cb")).toThrow(SsrfError);
    // 172.15 and 172.32 are outside 172.16/12
    expect(() => v.validate("http://172.15.0.1/cb")).not.toThrow();
    expect(() => v.validate("http://172.32.0.1/cb")).not.toThrow();
  });

  it("rejects link-local and multicast", () => {
    expect(() => v.validate("http://169.254.1.2/cb")).toThrow(SsrfError);
    expect(() => v.validate("http://224.0.0.1/cb")).toThrow(SsrfError);
    expect(() => v.validate("http://[fe80::1]/cb")).toThrow(SsrfError);
    expect(() => v.validate("http://[ff00::1]/cb")).toThrow(SsrfError);
  });

  it("allowlist bypasses private ranges for trusted hosts", () => {
    // workstacean's Docker DNS name resolves to RFC1918 but is explicitly
    // trusted — this is the critical path for in-cluster webhooks.
    expect(() => v.validate("http://workstacean:3000/cb")).not.toThrow();
    expect(() => v.validate("http://automaker-server:3008/cb")).not.toThrow();
    // Not on the allowlist
    expect(() => v.validate("http://researcher:7870/cb")).not.toThrow();
    // Case-insensitive match
    expect(() => v.validate("http://WORKSTACEAN/cb")).not.toThrow();
  });

  it("rejects non-http(s) schemes", () => {
    expect(() => v.validate("file:///etc/passwd")).toThrow(SsrfError);
    expect(() => v.validate("gopher://evil.com/")).toThrow(SsrfError);
  });

  it("rejects malformed URLs", () => {
    expect(() => v.validate("not a url")).toThrow(SsrfError);
  });
});
