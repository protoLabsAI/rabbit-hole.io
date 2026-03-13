"use client";

import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
} from "@xyflow/react";
import { useEffect, useRef, useMemo } from "react";

import "@xyflow/react/dist/style.css";

import { getEntityColor, getEntityImage } from "@proto/utils/atlas";

import { EntityNode } from "./components/EntityNode";
import { GraphStats } from "./components/GraphStats";
import { RelationEdge } from "./components/RelationEdge";
import { useForceLayout } from "./hooks/useForceLayout";
import {
  useIncrementalGraph,
  type IncrementalEntity,
  type IncrementalRelationship,
} from "./hooks/useIncrementalGraph";

const nodeTypes = {
  entity: EntityNode,
};

const edgeTypes = {
  relation: RelationEdge,
};

interface DeepAgentForceGraphProps {
  /** Agent files for incremental parsing */
  files?: Record<string, string>;
  /** Primary entity being researched */
  primaryEntityName?: string;
  primaryEntityType?: string;
  /** Indicates research has fully completed (bundle.json exists) */
  isResearchComplete?: boolean;
  /** Legacy props for backward compatibility */
  entities?: any[];
  relationships?: any[];
  evidenceCount?: number;
  confidence?: number;
  completeness?: number;
  bundle?: any;
}

/**
 * Convert incremental entity to React Flow node
 */
function entityToNode(
  entity: IncrementalEntity,
  existingPosition?: { x: number; y: number }
): Node {
  return {
    id: entity.uid,
    type: "entity",
    position: existingPosition || {
      // Spread new nodes outward from center with more space
      x: 600 + (Math.random() - 0.5) * 800,
      y: 400 + (Math.random() - 0.5) * 600,
    },
    data: {
      uid: entity.uid,
      name:
        entity.name ||
        entity.uid.split(":").pop()?.replace(/_/g, " ") ||
        "Unknown",
      type: entity.type || "Unknown",
      properties: entity.properties || {},
      tags: entity.tags || [],
      color: getEntityColor(entity.type || "Unknown"),
      icon: getEntityImage(entity.type || "Unknown"),
      loadingState: entity.loadingState,
    },
  };
}

/**
 * Convert incremental relationship to React Flow edge
 */
function relationshipToEdge(rel: IncrementalRelationship): Edge {
  return {
    id: rel.uid,
    source: rel.source,
    target: rel.target,
    type: "relation",
    animated: rel.loadingState === "discovered",
    data: {
      type: rel.type,
      sentiment: rel.properties?.sentiment,
      loadingState: rel.loadingState,
    },
  };
}

/**
 * React 19 Optimized Force Graph Component
 *
 * Key React 19 patterns used:
 * - useDeferredValue in useIncrementalGraph: Non-blocking file parsing
 * - useTransition in useForceLayout: Non-blocking layout computation
 * - Inline event handlers: React Compiler handles memoization
 * - No manual memo(): React Compiler optimizes re-renders
 */
function DeepAgentForceGraphInner({
  files = {},
  primaryEntityName,
  primaryEntityType,
  isResearchComplete = false,
  entities: legacyEntities,
  relationships: legacyRelationships,
  evidenceCount: legacyEvidenceCount,
  confidence,
  completeness,
}: DeepAgentForceGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  // Track node positions to preserve layout on updates
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(
    new Map()
  );

  // React 19: useIncrementalGraph uses useDeferredValue for non-blocking parsing
  const {
    entities: incrementalEntities,
    relationships: incrementalRelationships,
    evidenceCount: incrementalEvidenceCount,
    isLoading,
    isParsing,
  } = useIncrementalGraph({
    files,
    primaryEntityName,
    primaryEntityType,
  });

  // Determine which data source to use - memoize to prevent infinite effect loops
  const hasIncrementalData =
    Object.keys(files).length > 0 || incrementalEntities.length > 0;

  const displayEntities = useMemo(() => {
    if (hasIncrementalData) {
      return incrementalEntities;
    }
    return (legacyEntities || []).map((e) => ({
      uid: e.uid,
      name: e.name,
      type: e.type,
      properties: e.properties,
      tags: e.tags,
      loadingState: "complete" as const,
    }));
  }, [hasIncrementalData, incrementalEntities, legacyEntities]);

  const displayRelationships = useMemo(() => {
    if (hasIncrementalData) {
      return incrementalRelationships;
    }
    return (legacyRelationships || []).map((r) => ({
      uid: r.uid || `${r.source}-${r.target}`,
      source: r.source,
      target: r.target,
      type: r.type,
      properties: r.properties,
      loadingState: "complete" as const,
    }));
  }, [hasIncrementalData, incrementalRelationships, legacyRelationships]);

  const displayEvidenceCount = hasIncrementalData
    ? incrementalEvidenceCount
    : legacyEvidenceCount || 0;

  // Incrementally update nodes - React 19 Compiler optimizes this effect
  useEffect(() => {
    setNodes((currentNodes) => {
      const existingNodeMap = new Map(currentNodes.map((n) => [n.id, n]));
      const newNodes: Node[] = [];

      for (const entity of displayEntities) {
        const existing = existingNodeMap.get(entity.uid);
        const savedPosition = nodePositionsRef.current.get(entity.uid);

        if (existing) {
          // Update existing node's data without changing position
          newNodes.push({
            ...existing,
            data: {
              ...existing.data,
              name: entity.name || existing.data.name,
              type: entity.type || existing.data.type,
              properties: entity.properties || existing.data.properties,
              loadingState: entity.loadingState,
              color: getEntityColor(entity.type || "Unknown"),
              icon: getEntityImage(entity.type || "Unknown"),
            },
          });
          nodePositionsRef.current.set(entity.uid, existing.position);
        } else {
          newNodes.push(entityToNode(entity, savedPosition));
        }
      }

      // Only update if structure or data changed
      if (
        newNodes.length !== currentNodes.length ||
        newNodes.some((n, i) => n.id !== currentNodes[i]?.id)
      ) {
        return newNodes;
      }

      const dataChanged = newNodes.some((newNode, i) => {
        const oldNode = currentNodes[i];
        return (
          oldNode &&
          (newNode.data.loadingState !== oldNode.data.loadingState ||
            newNode.data.name !== oldNode.data.name ||
            newNode.data.type !== oldNode.data.type)
        );
      });

      return dataChanged ? newNodes : currentNodes;
    });
  }, [displayEntities, setNodes]);

  // Incrementally update edges
  useEffect(() => {
    setEdges((currentEdges) => {
      const existingEdgeMap = new Map(currentEdges.map((e) => [e.id, e]));

      const newEdges: Edge[] = displayRelationships.map((rel) => {
        const existing = existingEdgeMap.get(rel.uid);
        if (existing) {
          return {
            ...existing,
            animated: rel.loadingState === "discovered",
            data: {
              ...existing.data,
              type: rel.type,
              loadingState: rel.loadingState,
            },
          };
        }
        return relationshipToEdge(rel);
      });

      if (newEdges.length !== currentEdges.length) {
        return newEdges;
      }

      return newEdges;
    });
  }, [displayRelationships, setEdges]);

  // React 19: Inline handler - Compiler handles memoization
  function handleNodesChange(changes: any) {
    onNodesChange(changes);
    for (const change of changes) {
      if (change.type === "position" && change.position) {
        nodePositionsRef.current.set(change.id, change.position);
      }
    }
  }

  // React 19: Inline handler for layout updates
  function handleLayoutUpdate(updatedNodes: Node[]) {
    setNodes(updatedNodes);
    for (const node of updatedNodes) {
      nodePositionsRef.current.set(node.id, node.position);
    }
    setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 100);
  }

  // React 19: useForceLayout uses useTransition for non-blocking layout
  const { isLayoutPending } = useForceLayout({
    nodes,
    edges,
    onNodesUpdate: handleLayoutUpdate,
  });

  // Empty state
  if (displayEntities.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <div className="text-lg font-medium">No entities yet</div>
          <div className="text-sm">
            Start research to visualize the knowledge graph
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <GraphStats
        evidenceCount={displayEvidenceCount}
        entityCount={displayEntities.length}
        relationshipCount={displayRelationships.length}
        confidence={confidence}
        completeness={completeness}
        isLoading={
          !isResearchComplete && (isLoading || isParsing || isLayoutPending)
        }
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

/**
 * Force Graph with React Flow Provider
 *
 * Note: memo() wrapper removed - React 19 Compiler handles memoization.
 * Keep ReactFlowProvider wrapper as it provides context.
 */
export function DeepAgentForceGraph(props: DeepAgentForceGraphProps) {
  return (
    <ReactFlowProvider>
      <DeepAgentForceGraphInner {...props} />
    </ReactFlowProvider>
  );
}
