/**
 * Graph Tiles Hook with nuqs - Basic Implementation
 *
 * Simplified URL state management using nuqs instead of manual approach
 */

import {
  useQueryStates,
  parseAsString,
  parseAsInteger,
  parseAsJson,
  parseAsFloat,
  parseAsBoolean,
} from "nuqs";
import { useCallback } from "react";

// Re-export types from original implementation
export type ViewMode = "full-atlas" | "ego" | "community" | "timeslice";

export interface TimeWindow {
  from: string;
  to: string;
}

export interface EgoSettings {
  hops: number;
  nodeLimit: number;
  sentiments: string[] | null;
}

export interface PanPosition {
  x: number;
  y: number;
}

// nuqs parsers with defaults
const parseViewMode = parseAsString.withDefault("full-atlas" as ViewMode);
const parseCenterEntity = parseAsString;
const parseCommunityId = parseAsInteger;
const parseZoom = parseAsFloat.withDefault(1);

// JSON validators
const validatePanPosition = (value: unknown): PanPosition | null => {
  if (
    typeof value === "object" &&
    value !== null &&
    "x" in value &&
    "y" in value
  ) {
    const obj = value as any;
    if (typeof obj.x === "number" && typeof obj.y === "number") {
      return { x: obj.x, y: obj.y };
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
    if (typeof obj.from === "string" && typeof obj.to === "string") {
      return { from: obj.from, to: obj.to };
    }
  }
  return null;
};

const validateEgoSettings = (value: unknown): EgoSettings | null => {
  if (
    typeof value === "object" &&
    value !== null &&
    "hops" in value &&
    "nodeLimit" in value
  ) {
    const obj = value as any;
    if (typeof obj.hops === "number" && typeof obj.nodeLimit === "number") {
      return {
        hops: obj.hops,
        nodeLimit: obj.nodeLimit,
        sentiments: obj.sentiments || null,
      };
    }
  }
  return null;
};

const parsePan = parseAsJson<PanPosition>(validatePanPosition).withDefault({
  x: 0,
  y: 0,
});

const parseTimeWindow = parseAsJson<TimeWindow>(validateTimeWindow).withDefault(
  {
    from: "2024-01-01",
    to: new Date().toISOString().split("T")[0],
  }
);

const parseEgoSettings = parseAsJson<EgoSettings>(
  validateEgoSettings
).withDefault({
  hops: 1,
  nodeLimit: 50,
  sentiments: null,
});

export function useGraphTilesNuqs() {
  // Single batch state management for all URL parameters
  const [state, setState] = useQueryStates({
    mode: parseViewMode,
    center: parseCenterEntity,
    community: parseCommunityId,
    zoom: parseZoom,
    pan: parsePan,
    timeWindow: parseTimeWindow,
    egoSettings: parseEgoSettings,
    chat: parseAsBoolean.withDefault(false),
  });

  // Extract values with proper defaults
  const viewMode = (state.mode || "full-atlas") as ViewMode;
  const centerEntity = state.center || null;
  const communityId = state.community || null;
  const zoom = state.zoom ?? 1;
  const pan = state.pan ?? { x: 0, y: 0 };
  const timeWindow = state.timeWindow ?? {
    from: "2024-01-01",
    to: new Date().toISOString().split("T")[0],
  };
  const egoSettings = state.egoSettings ?? {
    hops: 1,
    nodeLimit: 50,
    sentiments: null,
  };
  const chatMode = state.chat ?? false;

  // Individual setter methods for backward compatibility
  const setViewMode = useCallback(
    (mode: ViewMode) => {
      setState({ mode });
    },
    [setState]
  );

  const setCenterEntity = useCallback(
    (center: string | null) => {
      setState({ center });
    },
    [setState]
  );

  const setCommunityId = useCallback(
    (community: number | null) => {
      setState({ community });
    },
    [setState]
  );

  const setTimeWindow = useCallback(
    (timeWindow: TimeWindow) => {
      setState({ timeWindow });
    },
    [setState]
  );

  const setEgoSettings = useCallback(
    (egoSettings: EgoSettings | ((prev: EgoSettings) => EgoSettings)) => {
      if (typeof egoSettings === "function") {
        setState((prev) => ({
          egoSettings: egoSettings(
            prev.egoSettings ?? { hops: 1, nodeLimit: 50, sentiments: null }
          ),
        }));
      } else {
        setState({ egoSettings });
      }
    },
    [setState]
  );

  const setChatMode = useCallback(
    (chat: boolean) => {
      setState({ chat });
    },
    [setState]
  );

  const setZoom = useCallback(
    (zoom: number) => {
      setState({ zoom });
      if (typeof window !== "undefined") {
        localStorage.setItem("atlas-zoom", zoom.toString());
      }
    },
    [setState]
  );

  const setPan = useCallback(
    (pan: PanPosition) => {
      setState({ pan });
      if (typeof window !== "undefined") {
        localStorage.setItem("atlas-pan", JSON.stringify(pan));
      }
    },
    [setState]
  );

  const setViewport = useCallback(
    (newZoom: number, newPan: PanPosition) => {
      setState({ zoom: newZoom, pan: newPan });
      if (typeof window !== "undefined") {
        localStorage.setItem("atlas-zoom", newZoom.toString());
        localStorage.setItem("atlas-pan", JSON.stringify(newPan));
      }
    },
    [setState]
  );

  // Navigation methods
  const toFullAtlas = useCallback(() => {
    setState({
      mode: "full-atlas",
      center: null,
      community: null,
    });
  }, [setState]);

  const toEgoNetwork = useCallback(
    (entityUid: string, settings?: Partial<EgoSettings>) => {
      const updates: any = {
        mode: "ego",
        center: entityUid,
        community: null,
      };
      if (settings) {
        updates.egoSettings = { ...egoSettings, ...settings };
      }
      setState(updates);
    },
    [setState, egoSettings]
  );

  const toCommunity = useCallback(
    (id: number) => {
      setState({
        mode: "community",
        community: id,
        center: null,
      });
    },
    [setState]
  );

  // Legacy compatibility method (centerOnEntity from original)
  const centerOnEntity = useCallback(
    (
      entityId: string,
      entityLabel?: string,
      customEgoSettings?: Partial<EgoSettings>
    ) => {
      console.log(`🎯 Centering on entity: ${entityLabel || entityId}`);
      toEgoNetwork(entityId, customEgoSettings);
    },
    [toEgoNetwork]
  );

  return {
    // State values
    viewMode: viewMode as ViewMode,
    centerEntity,
    communityId,
    timeWindow,
    egoSettings,
    zoom,
    pan,
    chatMode,
    showGraphTileControls: false,

    // Individual setters
    setViewMode,
    setCenterEntity,
    setCommunityId,
    setTimeWindow,
    setEgoSettings,
    setZoom,
    setPan,
    setViewport,
    setChatMode,
    setShowGraphTileControls: (_value: boolean) => {},

    // Navigation methods
    toFullAtlas,
    toEgoNetwork,
    toCommunity,
    centerOnEntity,

    // Batch updates
    setState,
  };
}
