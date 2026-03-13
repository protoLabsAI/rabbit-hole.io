/**
 * Flow Editor Component
 *
 * Interactive graph editor using React Flow for CRUD operations
 */

"use client";

import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  Node,
  Connection,
} from "@xyflow/react";
import type Graph from "graphology";
import React, { useCallback, useMemo } from "react";

import "@xyflow/react/dist/style.css";
import {
  graphToReactFlow,
  applyReactFlowNodeMove,
} from "../model/adapters/reactflow";
import type { GraphNodeAttributes, GraphEdgeAttributes } from "../model/graph";

import type { GraphEventHandlers } from "./types";

interface FlowEditorProps {
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>;
  eventHandlers?: GraphEventHandlers;
  onGraphChange?: (
    graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>
  ) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Custom Node Component with domain theming
 */
function CustomNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div
      style={{
        padding: "10px 15px",
        borderRadius: "8px",
        backgroundColor: data.color,
        border: `2px solid ${selected ? "#fff" : data.color}`,
        color: "#fff",
        fontSize: "12px",
        fontWeight: 500,
        minWidth: "100px",
        textAlign: "center",
        boxShadow: selected
          ? "0 4px 12px rgba(0,0,0,0.3)"
          : "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <div style={{ fontSize: "18px", marginBottom: "4px" }}>{data.icon}</div>
      <div>{data.name}</div>
      <div style={{ fontSize: "10px", opacity: 0.8, marginTop: "2px" }}>
        {data.type}
      </div>
    </div>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

/**
 * Inner Flow Editor with React Flow hooks
 */
function FlowEditorInner({
  graph,
  eventHandlers,
  onGraphChange,
  className = "w-full h-full",
  style,
}: FlowEditorProps) {
  const reactFlowInstance = useReactFlow();

  // Convert Graphology to React Flow format
  const { nodes, edges } = useMemo(() => {
    return graphToReactFlow(graph);
  }, [graph]);

  // Handle node click
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (eventHandlers?.onNodeClick) {
        const data = node.data as any;
        eventHandlers.onNodeClick(
          {
            uid: data.uid as string,
            name: data.name as string,
            type: data.type as string,
            display: {
              title: data.name as string,
              subtitle: data.type as string,
            },
            metadata: {
              position:
                data.x !== undefined && data.y !== undefined
                  ? { x: data.x as number, y: data.y as number }
                  : undefined,
              tags: data.tags as string[] | undefined,
              aliases: data.aliases as string[] | undefined,
              confidence: data.properties?.confidence || 1.0,
            },
          },
          _event
        );
      }
    },
    [eventHandlers]
  );

  // Handle node double click
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (eventHandlers?.onNodeDoubleClick) {
        const data = node.data as any;
        eventHandlers.onNodeDoubleClick(
          {
            uid: data.uid as string,
            name: data.name as string,
            type: data.type as string,
            display: {
              title: data.name as string,
              subtitle: data.type as string,
            },
            metadata: {
              position:
                data.x !== undefined && data.y !== undefined
                  ? { x: data.x as number, y: data.y as number }
                  : undefined,
              tags: data.tags as string[] | undefined,
              aliases: data.aliases as string[] | undefined,
              confidence: data.properties?.confidence || 1.0,
            },
          },
          _event
        );
      }
    },
    [eventHandlers]
  );

  // Handle background click
  const onPaneClick = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      eventHandlers?.onBackgroundClick?.(event as React.MouseEvent);
    },
    [eventHandlers]
  );

  // Handle node context menu
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      if (eventHandlers?.onContextMenu) {
        eventHandlers.onContextMenu("node", event.clientX, event.clientY, {
          uid: node.data.uid,
          name: node.data.name,
          type: node.data.type,
        });
      }
    },
    [eventHandlers]
  );

  // Handle background context menu
  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      if (eventHandlers?.onContextMenu) {
        eventHandlers.onContextMenu(
          "background",
          event.clientX,
          event.clientY,
          null
        );
      }
    },
    [eventHandlers]
  );

  // Handle node drag end - update positions in graph
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.position) {
        applyReactFlowNodeMove(graph, node.id, node.position);
        onGraphChange?.(graph);
      }
    },
    [graph, onGraphChange]
  );

  // Handle new edge connection
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      // Add edge to graphology
      const edgeId = `${connection.source}-${connection.target}`;
      graph.addEdgeWithKey(edgeId, connection.source, connection.target, {
        uid: edgeId,
        type: "RELATED_TO",
        source: connection.source,
        target: connection.target,
      });

      onGraphChange?.(graph);
    },
    [graph, onGraphChange]
  );

  return (
    <div className={className} style={style}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node: any) => node.data.color}
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}

/**
 * Flow Editor Component with Provider
 */
export const FlowEditor = React.memo(function FlowEditor(
  props: FlowEditorProps
) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner {...props} />
    </ReactFlowProvider>
  );
});
