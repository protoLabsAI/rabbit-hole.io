"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ForceGraphMethods } from "react-force-graph-3d";
import { FogExp2 } from "three";
import {
  INITIAL_COOLDOWN_TICKS,
  SCENE_BACKGROUND_COLOR,
  SCENE_FOG_COLOR,
  SCENE_FOG_DENSITY,
  STABLE_COOLDOWN_TICKS,
  WARMUP_TICKS,
  generateTestGraphData,
} from "./lib/scene-config";

// react-force-graph-3d requires browser APIs (WebGL, canvas) — disable SSR
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
});

const TEST_GRAPH_DATA = generateTestGraphData();

export default function Atlas3DClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [cooldownTicks, setCooldownTicks] = useState(INITIAL_COOLDOWN_TICKS);

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
    <div ref={containerRef} className="w-full h-full bg-[#000011]">
      <ForceGraph3D
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor={SCENE_BACKGROUND_COLOR}
        showNavInfo={false}
        // Test dataset: 50 nodes colored by entity type
        graphData={TEST_GRAPH_DATA}
        nodeColor={(node) => (node as { color?: string }).color ?? "#6B7280"}
        nodeLabel={(node) => (node as { label?: string }).label ?? ""}
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
