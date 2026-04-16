/**
 * Research Page State Management Hook
 *
 * nuqs-powered URL state management for research sessions.
 * Enables shareable research URLs and browser navigation.
 */

import {
  useQueryState,
  useQueryStates,
  parseAsString,
  parseAsBoolean,
  parseAsJson,
  parseAsStringLiteral,
  parseAsInteger,
  parseAsArrayOf,
} from "nuqs";
import { useCallback } from "react";

// Import types from @protolabsai/types as single source of truth
import type {
  ResearchSettings,
  TimeWindow,
  ResearchSessionConfig,
  ResearchDepth,
} from "@protolabsai/types";
import { DEFAULT_RESEARCH_SESSION_CONFIG } from "@protolabsai/types";

// ==================== Validators ====================

const validateResearchSettings = (value: unknown): ResearchSettings | null => {
  if (
    typeof value === "object" &&
    value !== null &&
    "hops" in value &&
    "nodeLimit" in value
  ) {
    const obj = value as any;
    if (typeof obj.hops === "number" && typeof obj.nodeLimit === "number") {
      return {
        hops: Math.min(Math.max(obj.hops, 1), 3), // Clamp 1-3
        nodeLimit: Math.min(Math.max(obj.nodeLimit, 10), 100), // Clamp 10-100
        sentiments: Array.isArray(obj.sentiments) ? obj.sentiments : null,
        entityTypes: Array.isArray(obj.entityTypes) ? obj.entityTypes : null,
      };
    }
  }
  return null;
};

const validateTimeWindow = (value: unknown): TimeWindow | null => {
  if (
    typeof value === "object" &&
    value !== null &&
    "from" in value &&
    "to" in value
  ) {
    const obj = value as any;
    if (
      typeof obj.from === "string" &&
      typeof obj.to === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(obj.from) &&
      /^\d{4}-\d{2}-\d{2}$/.test(obj.to)
    ) {
      return { from: obj.from, to: obj.to };
    }
  }
  return null;
};

const validateHiddenTypes = (value: unknown): string[] => {
  if (value === null || value === undefined) return []; // Empty = show all
  if (Array.isArray(value)) {
    // Validate all items are strings
    if (value.every((v) => typeof v === "string")) {
      return value;
    }
  }
  return []; // Invalid input = show all
};

// ==================== Parsers ====================

const parseEntity = parseAsString;

const parseSettings = parseAsJson<ResearchSettings>(
  validateResearchSettings
).withDefault({
  hops: 0, // Default: show only center entity (but load 1 hop for AI context)
  nodeLimit: 50,
  sentiments: null,
  entityTypes: null,
});

const parseTimeWindow = parseAsJson<TimeWindow>(validateTimeWindow).withDefault(
  {
    from: "2024-01-01",
    to: new Date().toISOString().split("T")[0],
  }
);

const parseShowLabels = parseAsBoolean.withDefault(true);
const parseShowEdgeLabels = parseAsBoolean.withDefault(true);
const parseChatOpen = parseAsBoolean.withDefault(false);
const parseHiddenTypes = parseAsJson<string[]>(validateHiddenTypes).withDefault(
  []
);

// Session config parsers
const DEPTH_VALUES = ["basic", "detailed", "comprehensive"] as const;
const parseResearchDepth = parseAsStringLiteral(DEPTH_VALUES).withDefault(
  DEFAULT_RESEARCH_SESSION_CONFIG.depth
);
const parseMaxEntities = parseAsInteger.withDefault(
  DEFAULT_RESEARCH_SESSION_CONFIG.maxEntities
);
const parseMaxDepth = parseAsInteger.withDefault(
  DEFAULT_RESEARCH_SESSION_CONFIG.maxDepth
);
const parseSearchProviders = parseAsArrayOf(parseAsString).withDefault(
  DEFAULT_RESEARCH_SESSION_CONFIG.searchProviders
);

// ==================== Hook ====================

export function useResearchPageState() {
  // Core research parameters
  const [entity, setEntity] = useQueryState("entity", parseEntity);
  const [settings, setSettings] = useQueryState("settings", parseSettings);
  const [timeWindow, setTimeWindow] = useQueryState(
    "timeWindow",
    parseTimeWindow
  );

  // UI preferences
  const [showLabels, setShowLabels] = useQueryState(
    "showLabels",
    parseShowLabels
  );
  const [showEdgeLabels, setShowEdgeLabels] = useQueryState(
    "showEdgeLabels",
    parseShowEdgeLabels
  );
  const [chatOpen, setChatOpen] = useQueryState("chatOpen", parseChatOpen);
  const [hiddenTypes, setHiddenTypes] = useQueryState(
    "hiddenTypes",
    parseHiddenTypes
  );

  // Batch state management for complex operations
  const [_state, setState] = useQueryStates({
    entity: parseEntity,
    settings: parseSettings,
  });

  // Helper: Load new entity with optional custom settings
  const loadEntity = useCallback(
    (entityUid: string, researchSettings?: Partial<ResearchSettings>) => {
      setState({
        entity: entityUid,
        settings: researchSettings
          ? { ...settings, ...researchSettings }
          : settings,
      });
    },
    [setState, settings]
  );

  // Helper: Update settings only (triggers reload)
  const updateSettings = useCallback(
    (partial: Partial<ResearchSettings>) => {
      setSettings((prev) => ({ ...prev, ...partial }));
    },
    [setSettings]
  );

  // Helper: Reset to empty state
  const reset = useCallback(() => {
    setState({
      entity: null,
      settings: {
        hops: 1,
        nodeLimit: 50,
        sentiments: null,
        entityTypes: null,
      },
    });
  }, [setState]);

  // Helper: Toggle single entity type
  const toggleEntityType = useCallback(
    (type: string) => {
      setHiddenTypes((prev) => {
        if (prev.length === 0) {
          // Currently showing all, hide this one type
          return [type];
        }

        if (prev.includes(type)) {
          // Remove from hidden list
          return prev.filter((t) => t !== type);
        } else {
          // Add to hidden list
          return [...prev, type];
        }
      });
    },
    [setHiddenTypes]
  );

  // Helper: Toggle entire domain
  const toggleDomain = useCallback(
    (domain: string, types: string[]) => {
      setHiddenTypes((prev) => {
        const allHidden = types.every((t) => prev.includes(t));

        if (allHidden) {
          // Show all types in domain
          return prev.filter((t) => !types.includes(t));
        } else {
          // Hide all types in domain
          return [...new Set([...prev, ...types])];
        }
      });
    },
    [setHiddenTypes]
  );

  // Helper: Show all types
  const showAllTypes = useCallback(() => {
    setHiddenTypes([]);
  }, [setHiddenTypes]);

  // Helper: Hide all types
  const hideAllTypes = useCallback(
    (allTypes: string[]) => {
      setHiddenTypes(allTypes);
    },
    [setHiddenTypes]
  );

  // Session config for research agent
  const [researchDepth, setResearchDepth] = useQueryState(
    "depth",
    parseResearchDepth
  );
  const [maxEntities, setMaxEntities] = useQueryState(
    "maxEntities",
    parseMaxEntities
  );
  const [maxDepth, setMaxDepth] = useQueryState("maxDepth", parseMaxDepth);
  const [searchProviders, setSearchProviders] = useQueryState(
    "providers",
    parseSearchProviders
  );

  const sessionConfig: ResearchSessionConfig = {
    depth: researchDepth as ResearchDepth,
    maxEntities,
    maxDepth,
    searchProviders,
  };

  const setSessionConfig = useCallback(
    (config: ResearchSessionConfig) => {
      setResearchDepth(config.depth);
      setMaxEntities(config.maxEntities);
      setMaxDepth(config.maxDepth);
      setSearchProviders(config.searchProviders);
    },
    [setResearchDepth, setMaxEntities, setMaxDepth, setSearchProviders]
  );

  return {
    // State
    entity,
    settings,
    timeWindow,
    showLabels,
    showEdgeLabels,
    chatOpen,
    hiddenTypes,

    // Setters
    setEntity,
    setSettings,
    setTimeWindow,
    setShowLabels,
    setShowEdgeLabels,
    setChatOpen,
    setHiddenTypes,

    // Session config
    sessionConfig,
    setSessionConfig,

    // Helpers
    loadEntity,
    updateSettings,
    reset,
    setState, // For batch updates
    toggleEntityType,
    toggleDomain,
    showAllTypes,
    hideAllTypes,
  };
}
