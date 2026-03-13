/**
 * Atlas Page - Sigma.js Explorer
 *
 * High-performance graph exploration with Neo4j GDS
 */

"use client";

import React, { useState, useCallback } from "react";

import { AtlasExplorer } from "./components/AtlasExplorer";
import { LegendV2 } from "./components/LegendV2";
import { useGraphTilesNuqs } from "./hooks/useGraphTilesNuqs";

export default function AtlasPage() {
  const graphTiles = useGraphTilesNuqs();
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [hiddenEntityTypes, setHiddenEntityTypes] = useState<Set<string>>(
    new Set()
  );

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
    console.log("Node clicked:", node);
  }, []);

  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node);
  }, []);

  const handleToggleEntityType = useCallback((entityType: string) => {
    setHiddenEntityTypes((prev) => {
      const next = new Set(prev);
      if (next.has(entityType)) {
        next.delete(entityType);
      } else {
        next.add(entityType);
      }
      return next;
    });
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/95 px-6 py-3">
        <h1 className="text-xl font-bold text-foreground">Atlas Explorer</h1>
        <p className="text-sm text-muted-foreground">
          High-performance graph exploration powered by Sigma.js
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        <AtlasExplorer
          viewMode={graphTiles.viewMode}
          centerEntity={graphTiles.centerEntity || undefined}
          communityId={graphTiles.communityId || undefined}
          timeWindow={graphTiles.timeWindow}
          hops={graphTiles.egoSettings?.hops || 2}
          limit={500}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          className="w-full h-full"
        />

        {/* Legend */}
        <div className="absolute bottom-4 left-4">
          <LegendV2
            graphData={null}
            hiddenEntityTypes={hiddenEntityTypes}
            onToggleEntityType={handleToggleEntityType}
            onToggleMultipleEntityTypes={(types, visible) => {
              setHiddenEntityTypes((prev) => {
                const next = new Set(prev);
                types.forEach((t) => {
                  if (visible) {
                    next.delete(t);
                  } else {
                    next.add(t);
                  }
                });
                return next;
              });
            }}
            onShowAllEntityTypes={() => setHiddenEntityTypes(new Set())}
            onIsolateEntityTypes={(types) => {
              const allTypes = new Set<string>();
              // Would need full graph data to get all types
              setHiddenEntityTypes(
                new Set([...allTypes].filter((t) => !types.includes(t)))
              );
            }}
            settingsPosition="bottom-left"
            viewMode={graphTiles.viewMode}
          />
        </div>

        {/* Node Details Panel */}
        {selectedNode && (
          <div className="absolute top-4 right-4 z-20 max-w-md">
            <div className="bg-card rounded-lg shadow-lg border">
              <div className="flex items-center justify-between p-3 border-b">
                <h3 className="font-bold text-foreground">Selected Node</h3>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <div className="p-4">
                <div className="text-lg font-semibold mb-2">
                  {selectedNode.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedNode.type}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hover Tooltip */}
        {hoveredNode && !selectedNode && (
          <div className="absolute top-4 right-4 z-10 bg-card/95 backdrop-blur rounded-lg shadow-lg border px-4 py-2">
            <div className="text-sm font-medium">{hoveredNode.name}</div>
            <div className="text-xs text-muted-foreground">
              {hoveredNode.type}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
