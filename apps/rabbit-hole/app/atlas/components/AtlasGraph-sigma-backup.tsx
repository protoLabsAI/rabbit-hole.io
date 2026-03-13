/**
 * AtlasGraph - Standalone Sigma.js Graph Component
 *
 * Reusable graph visualization with node images and context menu integration
 */

"use client";

import React, { useCallback, useRef, useState } from "react";

import { getEntityColor, getEntityImage } from "@proto/utils/atlas";

import { canonicalToGraph } from "../../graph-visualizer/model/adapters/canonical";
import type { CanonicalGraphData } from "../../types/canonical-graph";

interface AtlasGraphProps {
  /** View mode for data fetching */
  viewMode: string;
  /** Center entity UID for ego networks */
  centerEntity?: string;
  /** Community ID for community views */
  communityId?: number;
  /** Time window for timeslice views */
  timeWindow?: { from: string; to: string };
  /** Number of hops for ego networks */
  hops?: number;
  /** Node limit */
  limit?: number;
  /** Hidden entity types for filtering */
  hiddenEntityTypes?: Set<string>;
  /** Node click handler */
  onNodeClick?: (node: any) => void;
  /** Node hover handler */
  onNodeHover?: (node: any | null) => void;
  /** Additional CSS classes */
  className?: string;
}

export function AtlasGraph({
  viewMode,
  centerEntity,
  communityId,
  timeWindow,
  hops = 2,
  limit = 500,
  hiddenEntityTypes,
  onNodeClick,
  onNodeHover,
  className = "w-full h-full",
}: AtlasGraphProps) {
  const sigmaRef = useRef<any>(null); // Sigma instance type (dynamically loaded)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Callback ref pattern - executes immediately when DOM element is attached
  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      console.log(
        "🔄 AtlasGraph: Callback ref triggered, node:",
        node ? "attached" : "detached"
      );

      if (!node) {
        console.log("🧹 AtlasGraph: Container unmounting, cleaning up Sigma");
        if (sigmaRef.current) {
          sigmaRef.current.kill();
          sigmaRef.current = null;
        }
        return;
      }

      console.log(
        "✅ AtlasGraph: Container mounted, starting graph initialization"
      );

      const fetchAndRender = async () => {
        console.log("🚀 AtlasGraph: Starting fetchAndRender");
        setLoading(true);
        setError(null);

        try {
          console.log(
            "📦 AtlasGraph: Dynamically importing Sigma.js modules..."
          );
          // Dynamically import Sigma.js modules (client-side only)
          const [
            { default: Sigma },
            { createNodeImageProgram },
            { NodeCircleProgram, createNodeCompoundProgram },
          ] = await Promise.all([
            import("sigma"),
            import("@sigma/node-image"),
            import("sigma/rendering"),
          ]);
          console.log("✅ AtlasGraph: Sigma.js modules loaded successfully");

          // Fetch graph data - build params object first
          const paramsObj: Record<string, string> = {
            viewMode,
            hops: hops.toString(),
            limit: limit.toString(),
          };

          if (centerEntity) paramsObj.centerEntity = centerEntity;
          if (communityId !== undefined)
            paramsObj.communityId = communityId.toString();
          if (timeWindow) {
            paramsObj.timeFrom = timeWindow.from;
            paramsObj.timeTo = timeWindow.to;
          }

          const params = new URLSearchParams(paramsObj);
          const apiUrl = `/api/atlas/graph-payload?${params}`;
          console.log("🌐 AtlasGraph: Fetching graph data from:", apiUrl);

          const response = await fetch(apiUrl);
          console.log(
            "📡 AtlasGraph: Response status:",
            response.status,
            response.statusText
          );

          const result = await response.json();
          console.log("📊 AtlasGraph: API result:", {
            success: result.success,
            nodeCount: result.data?.nodes?.length,
            edgeCount: result.data?.edges?.length,
            error: result.error,
          });

          if (!result.success || !result.data) {
            console.error(
              "❌ AtlasGraph: Failed to load graph data:",
              result.error
            );
            setError(result.error || "Failed to load graph");
            setLoading(false);
            return;
          }

          // Convert to Graphology
          const graphData: CanonicalGraphData = {
            nodes: result.data.nodes,
            edges: result.data.edges,
            meta: {
              nodeCount: result.data.nodes.length,
              edgeCount: result.data.edges.length,
              generatedAt: new Date().toISOString(),
              schemaVersion: "canonical-v1" as const,
              viewMode: viewMode as
                | "full-atlas"
                | "ego"
                | "community"
                | "timeslice"
                | "batch",
            },
          };

          console.log(
            "🔄 AtlasGraph: Converting canonical data to Graphology..."
          );
          const graph = canonicalToGraph(graphData);
          console.log(
            "📊 AtlasGraph: Graph created with",
            graph.order,
            "nodes and",
            graph.size,
            "edges"
          );

          // Add Sigma-specific attributes for node images and filter hidden types
          console.log("🎨 AtlasGraph: Processing nodes for Sigma rendering...");
          let hiddenCount = 0;
          graph.forEachNode((nodeId, attrs) => {
            const entityType = attrs.type || "Unknown";

            // Filter out hidden entity types
            if (hiddenEntityTypes?.has(entityType)) {
              graph.dropNode(nodeId);
              hiddenCount++;
              return;
            }

            // Force all nodes to use "pictogram" as the Sigma node type
            graph.setNodeAttribute(nodeId, "type", "pictogram");
            graph.setNodeAttribute(
              nodeId,
              "color",
              getEntityColor(attrs.uid || nodeId)
            );
            graph.setNodeAttribute(
              nodeId,
              "pictoColor",
              getEntityColor(attrs.uid || nodeId)
            );
            graph.setNodeAttribute(nodeId, "image", getEntityImage(entityType));
            graph.setNodeAttribute(nodeId, "size", attrs.size || 20);
            graph.setNodeAttribute(nodeId, "label", attrs.name || nodeId);
          });

          console.log(
            `🔍 AtlasGraph: Filtered ${hiddenCount} hidden nodes. Final graph: ${graph.order} nodes, ${graph.size} edges`
          );

          // Configure node image program
          console.log("🖼️ AtlasGraph: Configuring node image programs...");
          const NodePictogramProgram = createNodeImageProgram({
            padding: 0.15,
            size: { mode: "force", value: 256 },
            drawingMode: "color",
            colorAttribute: "pictoColor",
          });

          const NodeProgram = createNodeCompoundProgram([
            NodeCircleProgram,
            NodePictogramProgram,
          ]);

          console.log(
            "🎯 AtlasGraph: Creating Sigma instance with container node"
          );
          const sigma = new Sigma(graph, node, {
            defaultNodeType: "pictogram",
            nodeProgramClasses: {
              pictogram: NodeProgram,
            },
            renderEdgeLabels: false,
          });

          // Register event handlers
          if (onNodeClick) {
            sigma.on("clickNode", ({ node }) => {
              const attrs = graph.getNodeAttributes(node);
              onNodeClick({
                uid: attrs.uid,
                name: attrs.name,
                type: attrs.type,
                properties: attrs.properties,
              });
            });
          }

          if (onNodeHover) {
            sigma.on("enterNode", ({ node }) => {
              const attrs = graph.getNodeAttributes(node);
              onNodeHover({
                uid: attrs.uid,
                name: attrs.name,
                type: attrs.type,
              });
            });

            sigma.on("leaveNode", () => {
              onNodeHover(null);
            });
          }

          sigmaRef.current = sigma;
          console.log("✅ AtlasGraph: Sigma instance created successfully!");
          setLoading(false);
          console.log(
            "✅ AtlasGraph: Rendering complete, loading state set to false"
          );
        } catch (err) {
          console.error("❌ AtlasGraph: Error during fetchAndRender:", err);
          const errorMessage =
            err instanceof Error ? err.message : "Network error";
          console.error("❌ AtlasGraph: Error message:", errorMessage);
          setError(errorMessage);
          setLoading(false);
        }
      };

      console.log("🚀 AtlasGraph: Calling fetchAndRender()...");
      fetchAndRender();
    },
    [
      viewMode,
      centerEntity,
      communityId,
      timeWindow,
      hops,
      limit,
      hiddenEntityTypes,
      onNodeClick,
      onNodeHover,
    ]
  );

  console.log(
    "🎨 AtlasGraph: Rendering component UI with loading state:",
    loading
  );

  return (
    <div className={`relative ${className}`}>
      {/* Always render the container so callback ref fires */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Overlay loading state on top */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <div className="text-lg font-medium">Loading graph...</div>
          </div>
        </div>
      )}

      {/* Overlay error state on top */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <div className="text-center text-destructive">
            <div className="text-lg font-semibold mb-2">
              Error Loading Graph
            </div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}
    </div>
  );
}
