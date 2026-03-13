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

import { EntityNodeComponent, type EntityData } from "./EntityNode";

const nodeTypes = {
  entity: EntityNodeComponent,
};

interface Entity {
  uid: string;
  name?: string;
  type?: string;
  properties?: any;
  position?: { x: number; y: number };
  [key: string]: any;
}

interface ForceGraphProps {
  entities: Entity[];
  onNodeClick?: (entity: Entity) => void;
}

interface SimulationNode extends SimulationNodeDatum {
  id: string;
  data: EntityData;
}

function ForceGraphInner({ entities, onNodeClick }: ForceGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<EntityData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [simulationRunning, setSimulationRunning] = useState(false);

  // Convert entities to React Flow nodes
  useEffect(() => {
    const newNodes: Node<EntityData>[] = entities.map((entity) => {
      const entityData: EntityData = {
        uid: entity.uid,
        name: entity.name || entity.uid,
        type: entity.type || "Unknown",
        properties: entity.properties || {},
      };

      return {
        id: entity.uid,
        type: "entity",
        position: entity.position || {
          x: Math.random() * 500,
          y: Math.random() * 500,
        },
        data: entityData,
      };
    });

    setNodes(newNodes);
  }, [entities, setNodes]);

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
      .on("end", () => {
        setSimulationRunning(false);
      });

    // Run simulation to completion
    simulation.tick(300);

    // Update nodes once with final positions
    setNodes(
      simulationNodes.map((node) => ({
        id: node.id,
        type: "entity",
        position: { x: node.x || 0, y: node.y || 0 },
        data: node.data,
      }))
    );

    setSimulationRunning(false);

    return () => {
      simulation.stop();
    };
  }, [nodes.length, setNodes]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<EntityData>) => {
      // Convert EntityData back to Entity for callback
      const entity: Entity = {
        uid: node.data.uid,
        name: node.data.name,
        type: node.data.type,
        properties: node.data.properties,
      };
      onNodeClick?.(entity);
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
        fitView
        proOptions={{ hideAttribution: true }}
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
