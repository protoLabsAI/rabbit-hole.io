/**
 * Legend V2 Component
 *
 * Advanced legend with domain-based filtering, individual entity toggle,
 * and shift-click isolation functionality using shadcn components.
 */

import React, { useState, useCallback, useMemo } from "react";

import { getEntityTypesByDomain } from "@protolabsai/forms";
import { Icon } from "@protolabsai/icon-system";
import { domainMetadata } from "@protolabsai/types";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@protolabsai/ui/atoms";
import { generateLegendData } from "@protolabsai/utils/atlas";

import type { CanonicalGraphData } from "../../types/canonical-graph";

interface LegendV2Props {
  graphData: CanonicalGraphData | null;
  hiddenEntityTypes: Set<string>;
  onToggleEntityType: (entityType: string) => void;
  onToggleMultipleEntityTypes: (
    entityTypes: string[],
    visible: boolean
  ) => void;
  onShowAllEntityTypes: () => void;
  onIsolateEntityTypes: (entityTypes: string[]) => void;
  settingsPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  viewMode: "full-atlas" | "ego" | "community" | "timeslice";
  maxVisibleItems?: number;
  metadata?: {
    entityCount?: number;
    relationshipCount?: number;
    evidenceCount?: number;
  };
}

interface DomainInfo {
  name: string;
  entityTypes: string[];
  color: string;
  icon: string;
  visible: boolean;
  partiallyVisible: boolean;
  totalEntities: number;
  visibleEntities: number;
}

interface EntityInfo {
  type: string;
  color: string;
  icon: string;
  count: number;
  visible: boolean;
  domain: string;
}

export function LegendV2({
  graphData,
  hiddenEntityTypes,
  onToggleEntityType,
  onToggleMultipleEntityTypes,
  onShowAllEntityTypes,
  onIsolateEntityTypes,
  settingsPosition,
  viewMode,
  maxVisibleItems = 12,
  metadata,
}: LegendV2Props) {
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(
    new Set()
  );
  const [showMore, setShowMore] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getPositionClasses = () => {
    switch (settingsPosition) {
      case "top-left":
        return "top-4 left-4";
      case "top-right":
        return "top-4 right-4";
      case "bottom-right":
        return "bottom-4 right-4";
      default:
        return "bottom-4 left-4";
    }
  };

  // Generate entity and domain data
  const { domainData, entityData, totalVisible, totalEntities } =
    useMemo(() => {
      if (!graphData) {
        return {
          domainData: [],
          entityData: [],
          totalVisible: 0,
          totalEntities: 0,
        };
      }

      const legendData = generateLegendData(
        graphData.nodes as any,
        hiddenEntityTypes
      );
      const entityTypesByDomain = getEntityTypesByDomain();

      // Create entity info map
      const entityMap = new Map<string, EntityInfo>();
      const domainMap = new Map<string, DomainInfo>();

      // Initialize domains
      Object.entries(entityTypesByDomain).forEach(([domain, types]) => {
        domainMap.set(domain, {
          name: domain,
          entityTypes: types,
          color: domainMetadata.getColor(domain),
          icon: domainMetadata.getIcon(domain),
          visible: true,
          partiallyVisible: false,
          totalEntities: 0,
          visibleEntities: 0,
        });
      });

      // Process legend data
      legendData.forEach((item) => {
        // Find domain for this entity type
        const domain =
          Object.entries(entityTypesByDomain).find(([, types]) =>
            types.includes(item.type)
          )?.[0] || "unknown";

        entityMap.set(item.type, {
          type: item.type,
          color: item.color,
          icon: item.icon,
          count: item.count,
          visible: item.visible,
          domain,
        });

        // Update domain stats
        const domainInfo = domainMap.get(domain);
        if (domainInfo) {
          domainInfo.totalEntities += item.count;
          domainInfo.visibleEntities += item.visibleCount;
        }
      });

      // Update domain visibility status
      domainMap.forEach((domain) => {
        const domainEntities = Array.from(entityMap.values()).filter(
          (e) => e.domain === domain.name
        );
        const visibleEntities = domainEntities.filter((e) => e.visible);

        domain.visible = visibleEntities.length === domainEntities.length;
        domain.partiallyVisible =
          visibleEntities.length > 0 &&
          visibleEntities.length < domainEntities.length;
      });

      return {
        domainData: Array.from(domainMap.values())
          .filter((domain) => domain.totalEntities > 0) // Only show domains with entities
          .sort((a, b) => b.totalEntities - a.totalEntities),
        entityData: Array.from(entityMap.values())
          .filter((entity) => entity.count > 0) // Only show entity types that exist
          .sort((a, b) => b.count - a.count),
        totalVisible: legendData.reduce(
          (sum, item) => sum + item.visibleCount,
          0
        ),
        totalEntities: legendData.reduce((sum, item) => sum + item.count, 0),
      };
    }, [graphData, hiddenEntityTypes]);

  const handleDomainToggle = useCallback(
    (domain: DomainInfo, event: React.MouseEvent) => {
      const entityTypes = entityData
        .filter((e) => e.domain === domain.name)
        .map((e) => e.type);

      if (event.shiftKey) {
        // Shift+click: isolate this domain
        onIsolateEntityTypes(entityTypes);
      } else {
        // Regular click: toggle all entities in domain
        const shouldShow = !domain.visible || domain.partiallyVisible;
        onToggleMultipleEntityTypes(entityTypes, shouldShow);
      }
    },
    [entityData, onToggleMultipleEntityTypes, onIsolateEntityTypes]
  );

  const handleEntityToggle = useCallback(
    (entity: EntityInfo, event: React.MouseEvent) => {
      if (event.shiftKey) {
        // Shift+click: isolate this entity
        onIsolateEntityTypes([entity.type]);
      } else {
        // Regular click: toggle this entity
        onToggleEntityType(entity.type);
      }
    },
    [onToggleEntityType, onIsolateEntityTypes]
  );

  const toggleDomainExpansion = (domain: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  };

  const visibleDomains = showMore
    ? domainData
    : domainData.slice(0, maxVisibleItems);
  const hasMoreDomains = domainData.length > maxVisibleItems;

  if (!graphData) {
    return (
      <div className={`absolute ${getPositionClasses()}`}>
        <Card className="w-80 bg-card border shadow-lg">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Loading...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={`absolute ${getPositionClasses()}`}
      data-testid="legend-v2-container"
    >
      <Collapsible
        open={!isCollapsed}
        onOpenChange={(open) => setIsCollapsed(!open)}
      >
        <Card className="w-80 max-h-[25vh] overflow-hidden shadow-lg bg-card/95 border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                Atlas Legend
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    title={isCollapsed ? "Expand legend" : "Collapse legend"}
                  >
                    {isCollapsed ? (
                      <Icon name="chevron-down" size={16} />
                    ) : (
                      <Icon name="chevron-up" size={16} />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onShowAllEntityTypes}
                disabled={hiddenEntityTypes.size === 0}
                className="text-xs"
              >
                Show All
              </Button>
            </CardTitle>
            <CollapsibleContent>
              <div className="text-xs text-muted-foreground space-y-1">
                {metadata ? (
                  <div className="flex items-center gap-2">
                    {metadata.entityCount !== undefined && (
                      <span>
                        {totalVisible} of {metadata.entityCount} entities
                      </span>
                    )}
                    {metadata.relationshipCount !== undefined && (
                      <>
                        <span>•</span>
                        <span>{metadata.relationshipCount} relationships</span>
                      </>
                    )}
                    {metadata.evidenceCount !== undefined &&
                      metadata.evidenceCount > 0 && (
                        <>
                          <span>•</span>
                          <span>{metadata.evidenceCount} evidence</span>
                        </>
                      )}
                  </div>
                ) : (
                  <div>
                    {totalVisible} visible • {totalEntities} total entities
                  </div>
                )}
                {viewMode !== "full-atlas" && (
                  <div className="text-primary mt-1">📊 {viewMode} view</div>
                )}
              </div>
            </CollapsibleContent>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0 overflow-y-auto max-h-[15vh]">
              <div className="space-y-2">
                {visibleDomains.map((domain) => {
                  const isExpanded = expandedDomains.has(domain.name);
                  const domainEntities = entityData.filter(
                    (e) => e.domain === domain.name
                  );

                  return (
                    <div
                      key={domain.name}
                      className="border border-border bg-muted/30 rounded-lg p-2"
                    >
                      {/* Domain Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={
                            domain.partiallyVisible
                              ? "indeterminate"
                              : domain.visible
                          }
                          onCheckedChange={(checked) => {
                            const entityTypes = domainEntities.map(
                              (e) => e.type
                            );
                            onToggleMultipleEntityTypes(entityTypes, !!checked);
                          }}
                        />

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDomainToggle(domain, e)}
                          className="flex-1 justify-start p-1 h-auto"
                          title={`Click to toggle, Shift+click to isolate ${domain.name}`}
                        >
                          <span
                            className="mr-2"
                            style={{ color: domain.color }}
                          >
                            {domain.icon}
                          </span>
                          <span className="capitalize text-sm font-medium">
                            {domain.name}
                          </span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {domain.visibleEntities}/{domain.totalEntities}
                          </span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleDomainExpansion(domain.name)}
                          className="p-1 h-auto w-6"
                        >
                          {isExpanded ? (
                            <Icon name="chevron-up" size={12} />
                          ) : (
                            <Icon name="chevron-down" size={12} />
                          )}
                        </Button>
                      </div>

                      {/* Entity List */}
                      {isExpanded && (
                        <div className="ml-6 space-y-1">
                          {domainEntities.map((entity) => (
                            <div
                              key={entity.type}
                              className="flex items-center gap-2 py-1"
                            >
                              <Checkbox
                                checked={entity.visible}
                                onCheckedChange={() =>
                                  onToggleEntityType(entity.type)
                                }
                              />

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleEntityToggle(entity, e)}
                                className="flex-1 justify-start p-1 h-auto text-xs"
                                title={`Click to toggle, Shift+click to isolate ${entity.type}`}
                              >
                                <span className="mr-2">{entity.icon}</span>
                                <span>{entity.type}</span>
                                <span className="ml-auto text-muted-foreground">
                                  {entity.count}
                                </span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* View More Button */}
                {hasMoreDomains && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMore(!showMore)}
                    className="w-full"
                  >
                    {showMore ? (
                      <>
                        <Icon name="chevron-up" size={16} className="mr-2" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <Icon
                          name="more-horizontal"
                          size={16}
                          className="mr-2"
                        />
                        Show {domainData.length - maxVisibleItems} More
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
