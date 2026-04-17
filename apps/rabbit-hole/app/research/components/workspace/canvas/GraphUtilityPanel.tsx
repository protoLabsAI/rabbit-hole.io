"use client";

/**
 * Graph Utility Panel
 *
 * Graph-specific utility tabs:
 * - Entities: Domain-organized entity grid
 * - Settings: Graph display and palette configuration
 */

import React, { useMemo, useState } from "react";

import { getEntityTypesByDomain } from "@protolabsai/forms";
import { Icon } from "@protolabsai/icon-system";
import type { UtilityTab, SideNavTab } from "@protolabsai/ui/templates";
import { SideNavigationPanel } from "@protolabsai/ui/templates";

import { EntityDomainGrid, type CardSize } from "../../EntityDomainGrid";

const getDomainIcon = (domain: string) => {
  // Match icons from original
  const icons: Record<string, React.ReactNode> = {
    people: "👤",
    organizations: "🏢",
    platforms: "💻",
    locations: "📍",
    emotions: "❤️",
    financial: "💰",
    creative: "🎨",
    knowledge: "🎓",
    legal: "⚖️",
    infrastructure: "🏗️",
    transit: "✈️",
    quality: "⭐",
    action: "👤",
    technical: "🔧",
  };
  return icons[domain] || "📄";
};

interface GraphUtilityPanelProps {
  graph: any;
  hiddenEntityTypes: Set<string>;
  expandedNodes: Set<string>;
  onToggleEntityType: (type: string) => void;
  onToggleDomain: (domain: string, types: string[]) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onToggleNodeExpanded: (nodeId: string) => void;
  readOnly?: boolean;
}

export function useGraphUtilityTabs({
  graph,
  hiddenEntityTypes,
  expandedNodes,
  onToggleEntityType,
  onToggleDomain,
  onShowAll,
  onHideAll,
  onToggleNodeExpanded,
  readOnly = false,
}: GraphUtilityPanelProps): UtilityTab[] {
  const [entityGridColumns, setEntityGridColumns] = useState(4);
  const [entityCardSize, setEntityCardSize] = useState<CardSize>("medium");
  const [hideEmptyEntities, setHideEmptyEntities] = useState(false);

  // Memoize so downstream useMemo deps are stable — otherwise domainTabs
  // rebuilds every render and the whole SideNavigationPanel resets.
  const entityTypesByDomain = useMemo(() => getEntityTypesByDomain(), []);

  // Count entities per type
  const entityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (graph) {
      graph.forEachNode((nodeId: string, attrs: any) => {
        const type = attrs.type;
        counts.set(type, (counts.get(type) || 0) + 1);
      });
    }
    return counts;
  }, [graph?.order]);

  // Calculate visible entity count
  const visibleEntityCount = useMemo(() => {
    if (!graph) return 0;
    let count = 0;
    graph.forEachNode((nodeId: string, attrs: any) => {
      if (!hiddenEntityTypes.has(attrs.type)) {
        count++;
      }
    });
    return count;
  }, [graph?.order, hiddenEntityTypes]);

  // Domain tabs for entity grid
  const domainTabs: SideNavTab[] = useMemo(() => {
    return Object.entries(entityTypesByDomain).map(([domain, types]) => {
      const domainTypes = types as string[];
      const domainCount = domainTypes.reduce(
        (sum, type) => sum + (entityCounts.get(type) || 0),
        0
      );

      return {
        id: domain,
        label: domain.charAt(0).toUpperCase() + domain.slice(1),
        icon: getDomainIcon(domain),
        badge: domainCount > 0 ? domainCount : undefined,
        content: (
          <EntityDomainGrid
            domain={domain}
            types={
              hideEmptyEntities
                ? domainTypes.filter(
                    (type) => (entityCounts.get(type) || 0) > 0
                  )
                : domainTypes
            }
            entityCounts={entityCounts}
            hiddenEntityTypes={hiddenEntityTypes}
            onToggleEntityType={onToggleEntityType}
            gridColumns={entityGridColumns}
            cardSize={entityCardSize}
            readOnly={readOnly}
          />
        ),
      };
    });
  }, [
    entityTypesByDomain,
    entityCounts,
    hideEmptyEntities,
    graph,
    hiddenEntityTypes,
    expandedNodes,
    entityGridColumns,
    entityCardSize,
    onToggleEntityType,
    onToggleNodeExpanded,
    readOnly,
  ]);

  return useMemo(
    () => [
      {
        id: "entities",
        label: "Entities",
        icon: <Icon name="grid" size={16} />,
        content: (
          <SideNavigationPanel
            tabs={domainTabs}
            layoutId="research-workspace-entity-domains"
            navPosition="left"
            navWidth={140}
            collapsible
          />
        ),
        headerContent: (
          <span className="text-xs" suppressHydrationWarning>
            {graph?.order || 0} nodes • {visibleEntityCount} visible •{" "}
            {entityGridColumns} cols
          </span>
        ),
      },
      {
        id: "settings",
        label: "Settings",
        icon: <Icon name="settings" size={16} />,
        content: (
          <div className="p-4 space-y-6 max-h-full overflow-y-auto">
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Entity Palette
              </label>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Grid Columns
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="2"
                    max="6"
                    step="1"
                    value={entityGridColumns}
                    onChange={(e) =>
                      setEntityGridColumns(parseInt(e.target.value))
                    }
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-xs text-muted-foreground font-mono w-8 text-right">
                    {entityGridColumns}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Card Size
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["small", "medium", "large"] as CardSize[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => setEntityCardSize(size)}
                      className={`px-3 py-2 rounded-md text-xs transition-colors ${
                        entityCardSize === size
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between p-2 rounded hover:bg-accent/50 cursor-pointer">
                <span className="text-sm text-foreground">
                  Hide Empty Types
                </span>
                <input
                  type="checkbox"
                  checked={hideEmptyEntities}
                  onChange={(e) => setHideEmptyEntities(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
              </label>
            </div>
          </div>
        ),
      },
    ],
    [
      graph,
      visibleEntityCount,
      entityGridColumns,
      entityCounts,
      entityTypesByDomain,
      hiddenEntityTypes,
      hideEmptyEntities,
      domainTabs,
      entityCardSize,
      onToggleEntityType,
      onToggleDomain,
      onShowAll,
      onHideAll,
      readOnly,
    ]
  );
}
