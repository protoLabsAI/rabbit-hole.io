/**
 * In-memory graph update event emitter.
 *
 * Singleton EventEmitter that bridges the ingest-bundle API route
 * to the SSE graph-updates endpoint. When entities or relationships
 * are written to Neo4j, the ingest route emits events here, and
 * the SSE endpoint streams them to connected Atlas clients.
 */

import { EventEmitter } from "events";

// Singleton — survives across API route invocations in the same process
const globalForEmitter = globalThis as unknown as {
  __graphUpdateEmitter?: EventEmitter;
};

if (!globalForEmitter.__graphUpdateEmitter) {
  globalForEmitter.__graphUpdateEmitter = new EventEmitter();
  globalForEmitter.__graphUpdateEmitter.setMaxListeners(50);
}

export const graphUpdateEmitter = globalForEmitter.__graphUpdateEmitter;

export interface GraphUpdateEvent {
  type: "entity_created" | "relationship_created" | "bundle_complete";
  uid: string;
  name?: string;
  entityType?: string;
  source?: string;
  target?: string;
  relationshipType?: string;
  timestamp: string;
}
