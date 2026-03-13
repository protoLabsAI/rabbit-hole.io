// ==== Cache Utilities ====
export * from "./cache";

// ==== Knowledge Graph Utilities ====
export * from "./knowledge-graph";

// ==== LangExtract Utilities ====
export * from "./langextract";

// ==== Atlas Utilities ====
// NOTE: Atlas utilities should be imported directly from "@proto/utils/atlas"
// to avoid naming conflicts with domain utilities (both export getEntityColor)

// ==== Timeline Utilities ====
export * from "./timeline/gantt-adapter";

// ==== File Processing Utilities ====
export * from "./file-processing";

// ==== Entity Utilities ====
export * from "./entity-helpers";

// ==== Domain Utilities ====
export * from "./domain";
export {
  getEntityColor,
  getEntityColors,
  getEntityTypeColor,
  getEntityColorArray,
  isDomainFeatureEnabled,
  canCreateEntity,
  canEditEntity,
  canDeleteEntity,
  shouldShowInSelector,
  canUserAccessDomain,
  getAccessibleDomains,
} from "./domain";

// ==== UUID Utilities ====
export * from "./uuid";

// ==== Share Token Utilities ====
export * from "./share-tokens";

// ==== Neo4j Conversion Utilities ====
export * from "./neo4j-conversion";

// ==== Crypto Utilities ====
// IndexedDB exports removed - unified Hocuspocus architecture

// ==== Workspace Usage Utilities ====
export * from "./workspace-usage/index";
export * from "./workspace-usage/canvas-limits";
export * from "./workspace-usage/storage-estimation";

// ==== Storage Utilities ====
export * from "./storage/indexeddb-quota";

// ==== Validation Utilities ====
export {
  buildWorkspaceRoomId,
  type WorkspaceRoomType,
  isValidRoomId,
} from "./validation/room-id";

// ==== Workspace Utilities ====
export {
  getSyncStrategy,
  type SyncStrategy,
  type UserTier as WorkspaceUserTier,
} from "./workspace/sync-strategy";

// ==== Dev Utilities ====
export * from "./dev/default-org";

// ==== Secure ID Generation ====
export * from "./secure-id";

// ==== String Similarity Utilities ====
export * from "./string-similarity";

// ==== Export Utilities ====
// Moved to separate client-only export to prevent SSR issues:
// - Client-side: import from "@proto/utils/export-client"

// ==== Security Utilities ====
// Moved to separate exports to prevent SSR issues:
// - Client-side: import from "@proto/utils/security-client"
// - Server-side: import from "@proto/utils/security-server"

// ==== Multi-Tenancy Utilities ====
// NOTE: Tenancy utilities use Node.js modules (pg, neo4j-driver)
// Import from @proto/utils/tenancy in server components/API routes
// Import from @proto/utils/tenancy-edge in middleware (Edge runtime)

// ==== Package Info ====
export const PACKAGE_VERSION = "0.1.0";
export const PACKAGE_NAME = "@proto/utils";
