/**
 * A2A server public API.
 *
 * Builds the full transport per the protoWorkstacean A2A spec:
 *   - Agent card at /.well-known/agent-card.json + /.well-known/agent.json
 *   - JSON-RPC 2.0 at POST /a2a with all 10 required methods
 *   - SSE streaming for message/stream, message/sendStream, tasks/resubscribe
 *   - X-API-Key enforcement when RESEARCHER_API_KEY is set
 *   - Push notification delivery gated by the SSRF validator with an
 *     allowlist for internal workstacean/automaker hostnames
 */

import { buildAgentCard, defaultResearcherSkills } from "./card.js";
import {
  registerMessageMethods,
  registerPushMethods,
  registerTaskMethods,
  type ProducerRegistry,
} from "./rpc/methods.js";
import { RpcRouter } from "./rpc/router.js";
import { SsrfValidator } from "./security/ssrf.js";
import { attachWebhookDelivery } from "./security/webhook-delivery.js";
import { createA2AServer } from "./server.js";
import { echoDeepResearchProducer, echoSearchProducer } from "./skills/echo.js";
import { PushConfigStore } from "./store/push-config-store.js";
import { TaskStore } from "./store/task-store.js";

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
   * /a2a is appended automatically to form the card's url field.
   */
  advertiseUrl?: string;
  /** API key required for /a2a; when empty, auth is advertised but not enforced. */
  apiKey?: string;
  /** Producer registry. Defaults to echo stubs (tests / smoke). */
  producers?: ProducerRegistry;
  /** Hostnames SSRF validator accepts despite private-range addresses. */
  allowedPushHosts?: string[];
}

export async function startA2AServer(cfg: StartConfig = {}): Promise<{
  close: () => Promise<void>;
  port: number;
  taskStore: TaskStore;
  pushStore: PushConfigStore;
}> {
  const port = cfg.port ?? Number(process.env["A2A_PORT"] ?? 7870);
  const host = cfg.host ?? "0.0.0.0";
  const apiKey = cfg.apiKey ?? process.env["RESEARCHER_API_KEY"] ?? "";
  const advertiseUrl =
    cfg.advertiseUrl ??
    process.env["A2A_ADVERTISE_URL"] ??
    `http://localhost:${port}`;
  const allowedPushHosts = cfg.allowedPushHosts ?? parseAllowedHosts();

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

  const taskStore = new TaskStore();
  const pushStore = new PushConfigStore();
  const ssrf = new SsrfValidator({ allowedHosts: allowedPushHosts });
  const delivery = attachWebhookDelivery({
    taskStore,
    pushStore,
    ssrf,
    logger: (msg) => {
      // URL + status only — task artifacts / tokens never logged.

      console.log(msg);
    },
  });

  const producers: ProducerRegistry = cfg.producers ?? {
    search: echoSearchProducer,
    deep_research: echoDeepResearchProducer,
  };

  const router = new RpcRouter();
  // Wrap message/send so every new task is auto-subscribed for webhook delivery.
  registerMessageMethods(router, taskStore, producers);
  wrapAutoSubscribe(router, taskStore, delivery);
  registerTaskMethods(router, taskStore);
  registerPushMethods(router, pushStore, taskStore);

  const server = createA2AServer({
    port,
    host,
    card,
    router,
    taskStore,
    apiKey: apiKey || undefined,
  });

  await new Promise<void>((resolve) => {
    server.listen(port, host, () => {
      resolve();
    });
  });

  // When port=0, the OS assigns an ephemeral port — read the actual bound
  // port off the server rather than returning the requested 0.
  const addr = server.address();
  const boundPort =
    typeof addr === "object" && addr && "port" in addr ? addr.port : port;

  return {
    port: boundPort,
    taskStore,
    pushStore,
    close: () =>
      new Promise((resolve, reject) => {
        delivery.dispose();
        taskStore.dispose();
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

function parseAllowedHosts(): string[] {
  const raw = process.env["PUSH_NOTIFICATION_ALLOWED_HOSTS"];
  const defaults = ["workstacean", "automaker-server"];
  if (!raw) return defaults;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function wrapAutoSubscribe(
  router: RpcRouter,
  taskStore: TaskStore,
  delivery: { subscribeTask: (id: string) => void }
): void {
  // Replace the message/send handler with one that auto-subscribes the
  // new task for webhook delivery. Subscription is free if no configs exist
  // and becomes live the moment pushNotificationConfig/set is called.
  const original = router.unwrap("message/send");
  if (!original) return;
  router.register("message/send", async (params, ctx) => {
    const result = await original(params, ctx);
    const record = result as { id?: string };
    if (record.id) delivery.subscribeTask(record.id);
    return result;
  });
}

export { buildAgentCard, defaultResearcherSkills } from "./card.js";
export { RpcRouter, RpcHandlerError } from "./rpc/router.js";
export type { AgentCard, Skill } from "./card.js";
export { JSON_RPC_ERRORS } from "./rpc/types.js";
export { TaskStore } from "./store/task-store.js";
export { PushConfigStore } from "./store/push-config-store.js";
export { SsrfValidator, SsrfError } from "./security/ssrf.js";
