/**
 * Sigma Explorer Component
 *
 * High-performance graph renderer using Sigma.js for large graphs (10k+ nodes)
 */

"use client";

import {
  SigmaContainer,
  useLoadGraph,
  useSigma,
  useRegisterEvents,
} from "@react-sigma/core";
import type Graph from "graphology";
import React, { useEffect, useState } from "react";

import "@react-sigma/core/lib/react-sigma.min.css";
import {
  prepareGraphForSigma,
  getSigmaSettings,
} from "../model/adapters/sigma";
import type { GraphNodeAttributes, GraphEdgeAttributes } from "../model/graph";

import type { GraphEventHandlers } from "./types";

interface SigmaExplorerProps {
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>;
  eventHandlers?: GraphEventHandlers;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Inner component that has access to Sigma context
 */
function SigmaGraphLoader({
  graph,
  eventHandlers,
}: {
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>;
  eventHandlers?: GraphEventHandlers;
}) {
  const loadGraph = useLoadGraph();
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();

  // Load graph into Sigma
  useEffect(() => {
    const preparedGraph = prepareGraphForSigma(graph);
    loadGraph(preparedGraph);
  }, [graph, loadGraph]);

  // Register event handlers
  useEffect(() => {
    if (!eventHandlers) return;

    const eventConfig: any = {};

    if (eventHandlers.onNodeClick) {
      eventConfig.clickNode = (event: any) => {
        const nodeId = event.node;
        const nodeAttrs = graph.getNodeAttributes(nodeId);
        eventHandlers.onNodeClick?.(
          {
            uid: nodeAttrs.uid,
            name: nodeAttrs.name,
            type: nodeAttrs.type,
            display: {
              title: nodeAttrs.name,
              subtitle: nodeAttrs.type,
            },
            metadata: {
              position:
                nodeAttrs.x !== undefined && nodeAttrs.y !== undefined
                  ? { x: nodeAttrs.x, y: nodeAttrs.y }
                  : undefined,
              tags: nodeAttrs.tags,
              aliases: nodeAttrs.aliases,
              confidence: nodeAttrs.properties?.confidence || 1.0,
            },
          },
          event
        );
      };
    }

    if (eventHandlers.onNodeDoubleClick) {
      eventConfig.doubleClickNode = (event: any) => {
        const nodeId = event.node;
        const nodeAttrs = graph.getNodeAttributes(nodeId);
        eventHandlers.onNodeDoubleClick?.(
          {
            uid: nodeAttrs.uid,
            name: nodeAttrs.name,
            type: nodeAttrs.type,
            display: {
              title: nodeAttrs.name,
              subtitle: nodeAttrs.type,
            },
            metadata: {
              position:
                nodeAttrs.x !== undefined && nodeAttrs.y !== undefined
                  ? { x: nodeAttrs.x, y: nodeAttrs.y }
                  : undefined,
              tags: nodeAttrs.tags,
              aliases: nodeAttrs.aliases,
              confidence: nodeAttrs.properties?.confidence || 1.0,
            },
          },
          event
        );
      };
    }

    if (eventHandlers.onBackgroundClick) {
      eventConfig.clickStage = (event: any) => {
        eventHandlers.onBackgroundClick?.(event);
      };
    }

    if (eventHandlers.onContextMenu) {
      eventConfig.rightClickNode = (event: any) => {
        event.event.preventDefault();
        const nodeId = event.node;
        const nodeAttrs = graph.getNodeAttributes(nodeId);
        eventHandlers.onContextMenu?.("node", event.event.x, event.event.y, {
          uid: nodeAttrs.uid,
          name: nodeAttrs.name,
          type: nodeAttrs.type,
        });
      };

      eventConfig.rightClickStage = (event: any) => {
        event.event.preventDefault();
        eventHandlers.onContextMenu?.(
          "background",
          event.event.x,
          event.event.y,
          null
        );
      };
    }

    registerEvents(eventConfig);
  }, [eventHandlers, graph, registerEvents]);

  // Handle viewport changes
  useEffect(() => {
    if (!eventHandlers?.onViewportChange) return;

    const camera = sigma.getCamera();
    const handleCameraUpdate = () => {
      const state = camera.getState();
      eventHandlers.onViewportChange?.(state.ratio, { x: state.x, y: state.y });
    };

    camera.on("updated", handleCameraUpdate);
    return () => {
      camera.off("updated", handleCameraUpdate);
    };
  }, [sigma, eventHandlers]);

  return null;
}

/**
 * Sigma Explorer Component
 */
export const SigmaExplorer = React.memo(function SigmaExplorer({
  graph,
  eventHandlers,
  className = "w-full h-full",
  style,
}: SigmaExplorerProps) {
  const [nodeCount, setNodeCount] = useState(0);

  useEffect(() => {
    setNodeCount(graph.order);
  }, [graph]);

  const settings = getSigmaSettings(nodeCount);

  if (nodeCount === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={style}
      >
        <div className="text-center py-8 text-muted-foreground">
          <p>No graph data to visualize</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <SigmaContainer
        graph={graph}
        settings={settings}
        style={{ width: "100%", height: "100%" }}
      >
        <SigmaGraphLoader graph={graph} eventHandlers={eventHandlers} />
      </SigmaContainer>
    </div>
  );
});
