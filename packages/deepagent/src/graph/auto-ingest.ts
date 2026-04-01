/**
 * Auto-Ingest Node — automatically populates the KG from research bundles
 *
 * Runs after bundle-assembler. POSTs the completed bundle to the
 * ingest-bundle endpoint with merge_smart strategy. Fire-and-forget:
 * never fails the pipeline, logs errors and moves on.
 */

import type { RunnableConfig } from "@langchain/core/runnables";

import type { EntityResearchAgentStateType } from "../state";
import { log } from "../utils/logger";

const RABBIT_HOLE_URL = process.env.RABBIT_HOLE_URL || "http://localhost:3000";

const AUTO_INGEST_CONFIDENCE_THRESHOLD = 0.7;

export function createAutoIngestNode() {
  return async function autoIngestNode(
    state: EntityResearchAgentStateType,
    _config: RunnableConfig
  ): Promise<Partial<EntityResearchAgentStateType>> {
    const bundle = state.bundle as
      | {
          entities?: Array<{
            uid: string;
            confidence?: number;
            [k: string]: unknown;
          }>;
          relationships?: Array<{ [k: string]: unknown }>;
          evidence?: Array<{ [k: string]: unknown }>;
          files?: Array<{ [k: string]: unknown }>;
          content?: Array<{ [k: string]: unknown }>;
        }
      | undefined;

    if (!bundle?.entities?.length) {
      log.debug("[auto-ingest] No bundle or empty entities — skipping");
      return {
        autoIngestResult: {
          ingested: false,
          entitiesIngested: 0,
          relationshipsIngested: 0,
        },
      };
    }

    // Filter entities by confidence if they have the field
    const entities = bundle.entities.filter((e) => {
      if (typeof e.confidence === "number") {
        return e.confidence >= AUTO_INGEST_CONFIDENCE_THRESHOLD;
      }
      // Deep research bundles are generally high quality — default to ingest
      return true;
    });

    if (entities.length === 0) {
      log.debug(
        "[auto-ingest] All entities below confidence threshold — skipping"
      );
      return {
        autoIngestResult: {
          ingested: false,
          entitiesIngested: 0,
          relationshipsIngested: 0,
        },
      };
    }

    const ingestPayload = {
      data: {
        entities,
        relationships: bundle.relationships ?? [],
        evidence: bundle.evidence ?? [],
        files: bundle.files ?? [],
        content: bundle.content ?? [],
      },
      mergeOptions: {
        strategy: "merge_smart",
        preserveTimestamps: true,
      },
    };

    try {
      log.debug(
        `[auto-ingest] Ingesting ${entities.length} entities, ${(bundle.relationships ?? []).length} relationships`
      );

      const res = await fetch(`${RABBIT_HOLE_URL}/api/ingest-bundle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ingestPayload),
      });

      if (res.ok) {
        log.debug(
          `[auto-ingest] Success — ${entities.length} entities ingested`
        );
        return {
          autoIngestResult: {
            ingested: true,
            entitiesIngested: entities.length,
            relationshipsIngested: (bundle.relationships ?? []).length,
          },
        };
      } else {
        const body = await res.text().catch(() => "");
        log.warn(
          `[auto-ingest] Ingest endpoint returned ${res.status}: ${body.slice(0, 200)}`
        );
        return {
          autoIngestResult: {
            ingested: false,
            entitiesIngested: 0,
            relationshipsIngested: 0,
            error: `HTTP ${res.status}`,
          },
        };
      }
    } catch (err) {
      log.warn("[auto-ingest] Failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        autoIngestResult: {
          ingested: false,
          entitiesIngested: 0,
          relationshipsIngested: 0,
          error: err instanceof Error ? err.message : String(err),
        },
      };
    }
  };
}
