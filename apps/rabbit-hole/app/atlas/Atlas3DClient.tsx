"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ForceGraphMethods } from "react-force-graph-3d";
import { FogExp2 } from "three";

import { useGraphTilesNuqs } from "./hooks/useGraphTilesNuqs";
import {
  adaptApiToForceGraph,
  EMPTY_GRAPH_DATA,
  type ForceGraphData,
  type ForceGraphNode,
  type ForceGraphLink,
} from "./lib/data-adapter";
import {
  INITIAL_COOLDOWN_TICKS,
  SCENE_BACKGROUND_COLOR,
  SCENE_FOG_COLOR,
  SCENE_FOG_DENSITY,
  STABLE_COOLDOWN_TICKS,
  WARMUP_TICKS,
} from "./lib/scene-config";
import { AtlasApiService } from "./services/AtlasApiService";

// react-force-graph-3d requires browser APIs (WebGL, canvas) — disable SSR
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
});

const apiService = new AtlasApiService();

export default function Atlas3DClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [cooldownTicks, setCooldownTicks] = useState(INITIAL_COOLDOWN_TICKS);

  // URL-driven view mode state
  const { viewMode, centerEntity, communityId, timeWindow, egoSettings } =
    useGraphTilesNuqs();

  // Graph data state
  const [graphData, setGraphData] = useState<ForceGraphData>(EMPTY_GRAPH_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Responsive container
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Fetch graph data whenever URL-driven view params change
  useEffect(() => {
    let cancelled = false;

    async function fetchGraph() {
      setIsLoading(true);
      setFetchError(null);

      const response = await apiService.loadGraphData({
        viewMode,
        centerEntity,
        communityId,
        timeWindow,
        egoSettings,
      });

      if (cancelled) return;

      if (response.success && response.data) {
        // AtlasApiService returns CanonicalGraphData, but the underlying
        // /api/atlas/graph-payload endpoint returns a raw payload with
        // uid/name/type nodes and source/target edges. The service passes
        // the raw data through as-is, so we treat it as ApiGraphPayload.
        const raw = response.data as unknown as {
          nodes: Parameters<typeof adaptApiToForceGraph>[0]["nodes"];
          edges: Parameters<typeof adaptApiToForceGraph>[0]["edges"];
        };
        const adapted = adaptApiToForceGraph(raw);
        setGraphData(adapted);
      } else {
        setFetchError(response.error ?? "Failed to load graph data");
        setGraphData(EMPTY_GRAPH_DATA);
      }

      setIsLoading(false);
    }

    fetchGraph();
    return () => {
      cancelled = true;
    };
  }, [viewMode, centerEntity, communityId, timeWindow, egoSettings]);

  /**
   * Called when the force engine finishes its initial warmup and stops.
   * 1. Add exponential fog to the Three.js scene for depth perception.
   * 2. Switch cooldownTicks to Infinity so the layout stays stable
   *    and never freezes mid-interaction.
   */
  const handleEngineStop = useCallback(() => {
    if (graphRef.current) {
      const scene = graphRef.current.scene();
      if (scene && !scene.fog) {
        scene.fog = new FogExp2(SCENE_FOG_COLOR, SCENE_FOG_DENSITY);
      }
    }
    setCooldownTicks(STABLE_COOLDOWN_TICKS);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#000011] relative">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#000011]/80">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <span className="text-sm text-white/60">
              Loading {viewMode} graph…
            </span>
          </div>
        </div>
      )}

      {/* Error state */}
      {!isLoading && fetchError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="rounded-lg border border-red-500/30 bg-red-950/50 p-4 text-sm text-red-300">
            {fetchError}
          </div>
        </div>
      )}

      <ForceGraph3D
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor={SCENE_BACKGROUND_COLOR}
        showNavInfo={false}
        graphData={graphData}
        nodeColor={(node) => (node as ForceGraphNode).color ?? "#6B7280"}
        nodeLabel={(node) => (node as ForceGraphNode).label ?? ""}
        linkColor={(link) => (link as ForceGraphLink).color ?? "#666666"}
        // Camera controls: orbit / zoom / pan are enabled by default
        enableNavigationControls={true}
        enablePointerInteraction={true}
        // Force layout: pre-compute warmup off-screen, then hold stable
        warmupTicks={WARMUP_TICKS}
        cooldownTicks={cooldownTicks}
        onEngineStop={handleEngineStop}
      />
    </div>
  );
}
