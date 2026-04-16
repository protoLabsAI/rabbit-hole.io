/**
 * Entity Palette with Filtering
 *
 * Dual-purpose component:
 * - Drag-spawn new entities into the graph
 * - Filter visible entities by type/domain with eye icons
 * - Show entity counts from graph
 */

"use client";

import type Graph from "graphology";
import React, { useMemo } from "react";

import { getEntityTypesByDomain } from "@protolabsai/forms";
import { Icon } from "@protolabsai/icon-system";
import { getEntityColor, getEntityImage } from "@protolabsai/utils/atlas";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "../../graph-visualizer/model/graph";

interface EntityPaletteProps {
  graph?: Graph<GraphNodeAttributes, GraphEdgeAttributes>;
  graphVersion?: number;
  hiddenEntityTypes?: Set<string>;
  onToggleEntityType?: (type: string) => void;
  onToggleDomain?: (domain: string, types: string[]) => void;
  nodeCount?: number;
  edgeCount?: number;
  readOnly?: boolean;
}

function EntityPaletteComponent({
  graph,
  graphVersion,
  hiddenEntityTypes = new Set(),
  onToggleEntityType,
  onToggleDomain,
  nodeCount = 0,
  edgeCount = 0,
  readOnly = false,
}: EntityPaletteProps) {
  const entityTypesByDomain = getEntityTypesByDomain();

  // Compute counts from graph (only count visible non-hidden entities)
  const entityCounts = useMemo(() => {
    if (!graph) return new Map<string, number>();

    const counts = new Map<string, number>();
    graph.forEachNode((_, attrs) => {
      // Only count visible entities (not hidden context entities)
      if (!attrs.hidden) {
        counts.set(attrs.type, (counts.get(attrs.type) || 0) + 1);
      }
    });
    return counts;
  }, [graph?.order, graph?.size, graphVersion]);

  const handleDragStart = (event: React.DragEvent, entityType: string) => {
    event.dataTransfer.setData("application/reactflow-entitytype", entityType);
    event.dataTransfer.effectAllowed = "copy";
  };

  const handleToggleEntityType = (e: React.MouseEvent, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleEntityType?.(type);
  };

  const handleToggleDomain = (
    e: React.MouseEvent,
    domain: string,
    types: string[]
  ) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleDomain?.(domain, types);
  };

  // Check if entire domain is hidden
  const isDomainHidden = (types: string[]) => {
    return types.every((type) => hiddenEntityTypes.has(type));
  };

  // Get total visible entities
  const totalVisible = useMemo(() => {
    return Array.from(entityCounts.values()).reduce(
      (sum, count) => sum + count,
      0
    );
  }, [entityCounts]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 grid grid-cols-8 gap-3">
        {Object.entries(entityTypesByDomain).map(([domain, types]) => {
          const domainTypes = types as string[];
          const domainHidden = isDomainHidden(domainTypes);
          const domainCount = domainTypes.reduce(
            (sum, type) => sum + (entityCounts.get(type) || 0),
            0
          );

          return (
            <div key={domain} className="space-y-1.5">
              {/* Domain Header with Toggle */}
              <div className="sticky top-0 bg-card py-0.5 flex items-center justify-between group">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {domain}
                  <span className="ml-1 text-[10px] font-normal">
                    ({domainCount})
                  </span>
                </div>
                <button
                  onClick={(e) => handleToggleDomain(e, domain, domainTypes)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded"
                  title={domainHidden ? "Show domain" : "Hide domain"}
                >
                  {domainHidden ? (
                    <Icon
                      name="eye-off"
                      size={12}
                      className="text-muted-foreground"
                    />
                  ) : (
                    <Icon
                      name="eye"
                      size={12}
                      className="text-muted-foreground"
                    />
                  )}
                </button>
              </div>

              {/* Entity Types */}
              <div className="space-y-0.5">
                {domainTypes.map((type) => {
                  const color = getEntityColor(type);
                  const icon = getEntityImage(type);
                  const count = entityCounts.get(type) || 0;
                  const isHidden = hiddenEntityTypes.has(type);

                  return (
                    <div
                      key={type}
                      draggable={!readOnly}
                      onDragStart={(e) => !readOnly && handleDragStart(e, type)}
                      className={`
                            flex items-center gap-1 px-1.5 py-1 rounded transition-all text-sm group
                            ${
                              readOnly
                                ? "cursor-default"
                                : isHidden
                                  ? "opacity-40 cursor-grab hover:opacity-60"
                                  : "cursor-grab hover:bg-accent/50"
                            }
                          `}
                      style={{ borderLeft: `2px solid ${color}` }}
                    >
                      {/* Entity Icon & Name - draggable area */}
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <span className="text-sm flex-shrink-0">{icon}</span>
                        <span className="text-[11px] font-medium truncate">
                          {type}
                        </span>
                      </div>

                      {/* Count & Eye Icon - non-draggable */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {count > 0 && (
                          <span className="text-[9px] text-muted-foreground font-mono min-w-[1.2rem] text-right">
                            {count}
                          </span>
                        )}
                        <button
                          onClick={(e) => handleToggleEntityType(e, type)}
                          onDragStart={(e) => e.preventDefault()}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded cursor-pointer"
                          title={isHidden ? `Show ${type}` : `Hide ${type}`}
                        >
                          {isHidden ? (
                            <Icon
                              name="eye-off"
                              size={8}
                              className="text-muted-foreground"
                            />
                          ) : (
                            <Icon
                              name="eye"
                              size={8}
                              className="text-muted-foreground"
                            />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Memoize EntityPalette to prevent re-renders when props haven't changed
export const EntityPalette = React.memo(
  EntityPaletteComponent,
  (prevProps, nextProps) => {
    // Only re-render if relevant props changed
    return (
      prevProps.graphVersion === nextProps.graphVersion &&
      prevProps.hiddenEntityTypes === nextProps.hiddenEntityTypes &&
      prevProps.onToggleEntityType === nextProps.onToggleEntityType &&
      prevProps.onToggleDomain === nextProps.onToggleDomain &&
      prevProps.readOnly === nextProps.readOnly
    );
  }
);
