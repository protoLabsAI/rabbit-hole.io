/**
 * A2A server public API.
 *
 * Consumers (agent/src/a2a-main.ts, tests, external embedders) build the
 * server via `startA2AServer(config)`. The 10 JSON-RPC methods required by
 * the protoWorkstacean spec are registered incrementally across tasks 16c–16e
 * as they come online. Methods not yet registered return JSON-RPC -32601,
 * which is the correct spec-compliant behavior until the feature ships.
 */

import { buildAgentCard, defaultResearcherSkills } from "./card.js";
import { RpcHandlerError, RpcRouter } from "./rpc/router.js";
import { JSON_RPC_ERRORS } from "./rpc/types.js";
import { createA2AServer } from "./server.js";

export interface StartConfig {
  /** Bind port (default: $A2A_PORT or 7870) */
  port?: number;
  /** Bind host (default: 0.0.0.0 so containers expose it) */
  host?: string;
  /** Agent name — matches workstacean agents.yaml entry */
  name?: string;
  /** Semver from package.json */
  version?: string;
  /**
   * Public URL workstacean uses to reach this agent.
   * Example: http://researcher:7870 (container DNS) or https://researcher.proto-labs.ai.
   * /a2a is appended automatically to form the card's url field.
   */
  advertiseUrl?: string;
  /** API key required for /a2a; when empty, auth is advertised but not enforced. */
  apiKey?: string;
}

export async function startA2AServer(cfg: StartConfig = {}): Promise<{
  close: () => Promise<void>;
  port: number;
}> {
  const port = cfg.port ?? Number(process.env["A2A_PORT"] ?? 7870);
  const host = cfg.host ?? "0.0.0.0";
  const apiKey = cfg.apiKey ?? process.env["RESEARCHER_API_KEY"] ?? "";
  const advertiseUrl =
    cfg.advertiseUrl ??
    process.env["A2A_ADVERTISE_URL"] ??
    `http://localhost:${port}`;

  const card = buildAgentCard({
    name: cfg.name ?? "researcher",
    description:
      "Research agent backed by rabbit-hole.io — searches the web, knowledge graph, " +
      "Wikipedia, and runs deep multi-source research with entity extraction.",
    version: cfg.version ?? process.env["AGENT_VERSION"] ?? "0.0.0",
    advertiseUrl,
    skills: defaultResearcherSkills(),
    requireApiKey: apiKey.length > 0,
  });

  const router = new RpcRouter();

  // All 10 spec-required methods are registered as stubs that return -32601
  // until their handlers ship in 16c–16e. Per spec, unknown methods MUST
  // return -32601; registering them explicitly makes the "not yet implemented"
  // state observable in logs rather than invisible.
  const NOT_YET_IMPLEMENTED = [
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
  for (const method of NOT_YET_IMPLEMENTED) {
    router.register(method, () => {
      throw new RpcHandlerError(
        JSON_RPC_ERRORS.METHOD_NOT_FOUND,
        `${method} is not yet implemented`
      );
    });
  }

  const server = createA2AServer({
    port,
    host,
    card,
    router,
    apiKey: apiKey || undefined,
  });

  await new Promise<void>((resolve) => {
    server.listen(port, host, () => {
      resolve();
    });
  });

  return {
    port,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

export { buildAgentCard, defaultResearcherSkills } from "./card.js";
export { RpcRouter, RpcHandlerError } from "./rpc/router.js";
export type { AgentCard, Skill } from "./card.js";
export { JSON_RPC_ERRORS } from "./rpc/types.js";
