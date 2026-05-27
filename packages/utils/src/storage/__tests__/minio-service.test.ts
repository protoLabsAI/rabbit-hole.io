/**
 * MinioService endpoint-parsing tests (#288)
 *
 * The minio-js Client validates `endPoint` as a bare hostname and throws
 * synchronously in the constructor for a colon-suffixed value
 * ("Invalid endPoint : minio:9000"). These guard the parsing that strips the
 * scheme/port so common MINIO_ENDPOINT conventions don't crash on startup.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MinioService } from "../minio-service";

const MINIO_ENV_KEYS = [
  "MINIO_ENDPOINT",
  "MINIO_PORT",
  "MINIO_USE_SSL",
  "MINIO_ACCESS_KEY",
  "MINIO_SECRET_KEY",
];

describe("MinioService endpoint parsing (#288)", () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(MINIO_ENV_KEYS.map((k) => [k, process.env[k]]));
    for (const k of MINIO_ENV_KEYS) delete process.env[k];
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  // Reach into the minio Client, which exposes host/port/protocol.
  const clientOf = (s: MinioService) =>
    (
      s as unknown as {
        client: { host: string; port: number; protocol: string };
      }
    ).client;

  it("accepts a host:port endpoint (the docker-compose default that used to crash)", () => {
    process.env.MINIO_ENDPOINT = "minio:9000";
    let service!: MinioService;
    expect(() => (service = new MinioService())).not.toThrow();
    expect(clientOf(service).host).toBe("minio");
    expect(clientOf(service).port).toBe(9000);
  });

  it("strips the scheme from a full URL endpoint", () => {
    process.env.MINIO_ENDPOINT = "https://minio.example.com:9443";
    const service = new MinioService();
    expect(clientOf(service).host).toBe("minio.example.com");
    expect(clientOf(service).port).toBe(9443);
  });

  it("accepts a bare hostname and defaults the port to 9000", () => {
    process.env.MINIO_ENDPOINT = "minio";
    const service = new MinioService();
    expect(clientOf(service).host).toBe("minio");
    expect(clientOf(service).port).toBe(9000);
  });

  it("lets an explicit MINIO_PORT win over a port in the endpoint", () => {
    process.env.MINIO_ENDPOINT = "minio:9000";
    process.env.MINIO_PORT = "9001";
    const service = new MinioService();
    expect(clientOf(service).host).toBe("minio");
    expect(clientOf(service).port).toBe(9001);
  });
});
