/**
 * Standalone entrypoint for the A2A server.
 *
 * Runs as a sibling process to `langgraphjs dev` — the Dockerfile starts
 * both and waits for either to exit. In development, use:
 *   pnpm --filter @protolabsai/agent dev:a2a
 *
 * Env:
 *   A2A_PORT            — listen port (default 7870)
 *   A2A_ADVERTISE_URL   — URL workstacean uses to reach us (http://researcher:7870 in-cluster)
 *   RESEARCHER_API_KEY  — required API key (empty = auth advertised but not enforced)
 *   AGENT_VERSION       — semver for card, populated by Dockerfile at build time
 */

import { startA2AServer } from "./a2a/index.js";
import { ingestUrlProducer } from "./a2a/skills/ingest-url-producer.js";
import { searchProducer } from "./a2a/skills/search-producer.js";

async function main(): Promise<void> {
  const { port } = await startA2AServer({
    producers: {
      search: searchProducer,
      ingest_url: ingestUrlProducer,
    },
  });

  console.log(`[a2a] researcher listening on :${port}`);

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[a2a] received ${signal}, shutting down`);
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err: unknown) => {
  console.error("[a2a] fatal:", err);
  process.exit(1);
});
