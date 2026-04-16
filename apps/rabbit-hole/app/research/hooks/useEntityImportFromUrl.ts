/**
 * Entity Import from URL Hook
 *
 * Handles automatic entity import when navigating to /research?entity=X&settings=...
 * Creates new tab and fetches ego network data. The canvas component handles the actual graph import.
 */

import { useEffect, useState, useRef } from "react";
import * as Y from "yjs";

import type {
  ResearchSettings,
  TimeWindow,
  RabbitHoleBundleData,
} from "@protolabsai/types";
import {
  getBiologicalEntityType,
  getSocialEntityType,
  getGeographicEntityType,
  getTechnologyEntityType,
  getEconomicEntityType,
  getMedicalEntityType,
  getInfrastructureEntityType,
  getTransportationEntityType,
  getAstronomicalEntityType,
  getLegalEntityType,
  getAcademicEntityType,
  getCulturalEntityType,
} from "@protolabsai/types";

import type { CanonicalGraphData } from "../../types/canonical-graph";
import type { Workspace } from "../types/workspace";

import { addTabToYMap } from "./useWorkspaceYMapHelpers";

export interface PendingImport {
  entityUid: string;
  settings: ResearchSettings;
  showLabels: boolean;
  showEdgeLabels: boolean;
  timeWindow: TimeWindow;
}

export interface UseEntityImportFromUrlOptions {
  ydoc: Y.Doc | null;
  userId: string;
  workspace: Workspace | null;
  workspaceReady: boolean;
  pendingImport: PendingImport | null;
}

export interface ImportState {
  isPreparingImport: boolean;
  importError: string | null;
  pendingBundle: RabbitHoleBundleData | null;
  targetTabId: string | null;
}

/**
 * Convert CanonicalGraphData to RabbitHoleBundleData format
 * Filters out null/undefined values deeply to pass validation
 */
function convertEgoNetworkToBundle(
  egoData: CanonicalGraphData,
  centerEntityUid: string
): RabbitHoleBundleData {
  // Deep filter to remove null/undefined values
  const deepFilterNulls = (obj: any): any => {
    if (obj === null || obj === undefined) return undefined;
    if (Array.isArray(obj))
      return obj.map(deepFilterNulls).filter((v) => v !== undefined);
    if (typeof obj === "object") {
      return Object.fromEntries(
        Object.entries(obj)
          .map(([k, v]) => [k, deepFilterNulls(v)])
          .filter(([_, v]) => v !== undefined)
      );
    }
    return obj;
  };

  // Get entity type from UID using domain helpers from @protolabsai/types
  const getEntityTypeFromUid = (uid: string): string => {
    return (
      getBiologicalEntityType(uid) ||
      getSocialEntityType(uid) ||
      getGeographicEntityType(uid) ||
      getTechnologyEntityType(uid) ||
      getEconomicEntityType(uid) ||
      getMedicalEntityType(uid) ||
      getInfrastructureEntityType(uid) ||
      getTransportationEntityType(uid) ||
      getAstronomicalEntityType(uid) ||
      getLegalEntityType(uid) ||
      getAcademicEntityType(uid) ||
      getCulturalEntityType(uid) ||
      "Person" // Fallback
    );
  };

  // Separate content nodes from entity nodes
  const entities: any[] = [];
  const content: any[] = [];

  egoData.nodes.forEach((node) => {
    const isContent = node.uid.startsWith("content:");

    if (isContent) {
      // Handle content nodes separately
      content.push({
        uid: node.uid,
        content_type: "post",
        platform_uid: node.uid,
        author_uid: node.uid,
        published_at: new Date().toISOString(),
        url: node.uid,
        text_excerpt: node.name || node.uid.split(":")[1]?.replace(/_/g, " "),
      });
    } else {
      // Regular entity nodes
      const name =
        node.name ||
        node.display.title ||
        node.uid.split(":")[1]?.replace(/_/g, " ") ||
        "Unknown";

      const entityType = getEntityTypeFromUid(node.uid);

      const entity: any = {
        uid: node.uid,
        name,
        type: entityType,
      };

      const properties: any = {};
      if (node.metadata) {
        Object.assign(properties, node.metadata);
      }
      if (node.metrics?.speechActs) {
        properties.speechActs = node.metrics.speechActs;
      }
      if (node.metrics?.degree) {
        properties.degree = node.metrics.degree;
      }
      if (node.metrics?.lastActiveAt) {
        properties.lastActiveAt = node.metrics.lastActiveAt;
      }

      const cleanProps = deepFilterNulls(properties);
      if (cleanProps && Object.keys(cleanProps).length > 0) {
        entity.properties = cleanProps;
      }

      if (node.metadata?.tags?.length) {
        entity.tags = node.metadata.tags;
      }
      if (node.metadata?.aliases?.length) {
        entity.aliases = node.metadata.aliases;
      }

      entities.push(entity);
    }
  });

  const relationships = egoData.edges.map((edge) => {
    const rel: any = {
      uid: edge.uid || `rel:${edge.source}_${edge.target}_${Date.now()}`,
      source: edge.source,
      target: edge.target,
      type: edge.type || "RELATED_TO",
    };

    // Build properties
    const properties = deepFilterNulls({
      sentiment: edge.sentiment,
      intensity: edge.intensity,
      confidence: edge.metadata.confidence,
      at: edge.metadata.at,
      category: edge.metadata.category,
      label: edge.display.label,
    });

    if (properties && Object.keys(properties).length > 0) {
      rel.properties = properties;
    }

    return rel;
  });

  return {
    entities,
    relationships,
    evidence: [],
    content,
    files: [],
    entityCitations: {},
    relationshipCitations: {},
  };
}

/**
 * Fetch ego network from API
 */
async function fetchEgoNetwork(
  entityUid: string,
  settings: ResearchSettings,
  timeWindow: TimeWindow
): Promise<CanonicalGraphData> {
  const params = new URLSearchParams({
    hops: settings.hops.toString(),
    nodeLimit: settings.nodeLimit.toString(),
  });

  if (settings.sentiments?.length) {
    params.set("sentiments", settings.sentiments.join(","));
  }

  if (settings.entityTypes?.length) {
    params.set("types", settings.entityTypes.join(","));
  }

  if (timeWindow.from) {
    params.set("from", timeWindow.from);
  }

  if (timeWindow.to) {
    params.set("to", timeWindow.to);
  }

  const url = `/api/graph-tiles/ego/${encodeURIComponent(entityUid)}?${params}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "API returned failure");
    }

    return result.data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "Import timed out. Try reducing node limit or hop count."
      );
    }

    throw error;
  }
}

/**
 * Create import tab with entity name and set as active
 */
function createImportTab(
  ydoc: Y.Doc,
  entityName: string,
  userId: string
): string {
  const newTabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const newTab = {
    id: newTabId,
    name: `Import: ${entityName}`,
    type: "main" as const,
    canvasType: "graph" as const,
    canvasData: {},
    roomId: `${userId}:${newTabId}`,
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: userId,
    },
  };

  // Add tab to workspace
  addTabToYMap(ydoc, newTab, userId);

  // Set as active tab
  const yWorkspace = ydoc.getMap("workspace");
  ydoc.transact(() => {
    yWorkspace.set("activeTabId", newTabId);
  }, userId);

  console.log(`✅ Created and activated tab: ${newTabId}`);

  return newTabId;
}

/**
 * Main hook for entity import from URL
 * Prepares data for import; actual graph import happens in canvas component
 */
export function useEntityImportFromUrl(
  options: UseEntityImportFromUrlOptions
): ImportState {
  const { ydoc, userId, workspace, workspaceReady, pendingImport } = options;

  const [isPreparingImport, setIsPreparingImport] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingBundle, setPendingBundle] =
    useState<RabbitHoleBundleData | null>(null);
  const [targetTabId, setTargetTabId] = useState<string | null>(null);

  // Track imported entities to prevent re-import on browser back
  const importedEntities = useRef<Set<string>>(new Set());
  const importAttempted = useRef(false);

  useEffect(() => {
    // Skip if no pending import or already preparing
    if (!pendingImport || isPreparingImport || importAttempted.current) return;

    // Skip if workspace not ready
    if (!workspaceReady || !workspace || !ydoc || !userId) return;

    // Skip if already imported
    if (importedEntities.current.has(pendingImport.entityUid)) {
      console.log(
        `✅ Entity ${pendingImport.entityUid} already imported, skipping`
      );
      return;
    }

    importAttempted.current = true;

    const prepareImport = async () => {
      setIsPreparingImport(true);
      setImportError(null);

      try {
        console.log(`📥 Preparing import for ${pendingImport.entityUid}`);

        // 1. Fetch ego network
        console.log("📡 Fetching ego network...");
        const egoData = await fetchEgoNetwork(
          pendingImport.entityUid,
          pendingImport.settings,
          pendingImport.timeWindow
        );

        if (!egoData.nodes.length) {
          throw new Error(
            `No entities found for ${pendingImport.entityUid}. Entity may not exist.`
          );
        }

        const centerNode = egoData.nodes[0];

        // 2. Convert to bundle format
        console.log("🔄 Converting to bundle format...");
        const bundle = convertEgoNetworkToBundle(
          egoData,
          pendingImport.entityUid
        );

        // 3. Create new tab
        console.log(`📑 Creating tab for ${centerNode.name}...`);
        const tabId = createImportTab(ydoc, centerNode.name, userId);

        // Clean bundle by removing any undefined values via JSON round-trip
        const cleanedBundle = JSON.parse(JSON.stringify(bundle));

        // 4. Set bundle and tab for canvas to import
        setPendingBundle(cleanedBundle);
        setTargetTabId(tabId);

        // 5. Mark as imported
        importedEntities.current.add(pendingImport.entityUid);

        console.log(
          `✅ Import prepared, ${bundle.entities.length} entities ready`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Import preparation failed";
        console.error("❌ Import preparation failed:", errorMessage);
        setImportError(errorMessage);
        importAttempted.current = false; // Allow retry
      } finally {
        setIsPreparingImport(false);
      }
    };

    prepareImport();
  }, [
    pendingImport,
    isPreparingImport,
    workspaceReady,
    workspace,
    ydoc,
    userId,
  ]);

  return { isPreparingImport, importError, pendingBundle, targetTabId };
}
