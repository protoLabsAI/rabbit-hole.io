"use client";

import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
} from "@xyflow/react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
} from "d3-force";
import { useEffect, useCallback, useState } from "react";

import "@xyflow/react/dist/style.css";

import { EntityNode } from "./EntityNode";
import { RelationEdge } from "./RelationEdge";

const nodeTypes = {
  entity: EntityNode,
};

const edgeTypes = {
  relation: RelationEdge,
};

interface ForceGraphProps {
  entities: any[];
  relationships: any[];
  onNodeClick?: (entity: any) => void;
}

interface SimulationNode extends SimulationNodeDatum {
  id: string;
  data: any;
}

function ForceGraphInner({
  entities,
  relationships,
  onNodeClick,
}: ForceGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [simulationRunning, setSimulationRunning] = useState(false);

  // Convert entities to React Flow nodes
  useEffect(() => {
    const newNodes: Node[] = entities.map((entity) => ({
      id: entity.uid,
      type: "entity",
      position:
        entity.canvas_x !== undefined && entity.canvas_y !== undefined
          ? { x: entity.canvas_x, y: entity.canvas_y }
          : { x: Math.random() * 500, y: Math.random() * 500 },
      data: {
        uid: entity.uid,
        name: entity.name,
        type: entity.type,
        properties: entity.properties,
        tags: entity.tags,
      },
    }));

    setNodes(newNodes);

    // Convert relationships to React Flow edges
    const newEdges = relationships.map((rel) => ({
      id: rel.uid,
      source: rel.source,
      target: rel.target,
      type: "relation",
      data: {
        type: rel.type,
        sentiment: rel.properties?.sentiment,
      },
    }));

    setEdges(newEdges);
  }, [entities, relationships, setNodes, setEdges]);

  // Run force simulation when nodes change
  useEffect(() => {
    if (nodes.length === 0) return;

    setSimulationRunning(true);

    const simulationNodes: SimulationNode[] = nodes.map((node) => ({
      id: node.id,
      x: node.position.x,
      y: node.position.y,
      data: node.data,
    }));

    const simulation = forceSimulation(simulationNodes)
      .force(
        "link",
        forceLink([])
          .id((d: any) => d.id)
          .distance(150)
      )
      .force("charge", forceManyBody().strength(-300))
      .force("center", forceCenter(400, 300))
      .force("collide", forceCollide().radius(80))
      .alphaDecay(0.02)
      .on("tick", () => {
        setNodes(
          simulationNodes.map((node) => ({
            id: node.id,
            type: "entity",
            position: { x: node.x || 0, y: node.y || 0 },
            data: node.data,
          }))
        );
      })
      .on("end", () => {
        setSimulationRunning(false);
      });

    simulation.tick(300);

    return () => {
      simulation.stop();
    };
  }, [nodes.length, setNodes]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.data);
    },
    [onNodeClick]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node: any) => node.data.color || "#3B82F6"}
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
        {simulationRunning && (
          <div className="absolute top-4 right-4 bg-background/90 border rounded-lg px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
              <span>Animating layout...</span>
            </div>
          </div>
        )}
      </ReactFlow>
    </div>
  );
}

export function ForceGraph(props: ForceGraphProps) {
  return (
    <ReactFlowProvider>
      <ForceGraphInner {...props} />
    </ReactFlowProvider>
  );
}
