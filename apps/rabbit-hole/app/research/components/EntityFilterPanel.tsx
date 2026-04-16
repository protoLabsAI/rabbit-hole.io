/**
 * EntityFilterPanel - Domain-based Entity Type Filter
 *
 * Provides a collapsible filter interface for entity types organized by domain.
 * Features check/uncheck all functionality at both global and domain levels.
 */

"use client";

import React, { useState } from "react";

import { Icon } from "@protolabsai/icon-system";

interface EntityFilterPanelProps {
  /**
   * Entity types organized by domain
   */
  entityTypesByDomain: Record<string, string[]>;

  /**
   * Map of entity type to count
   */
  entityCounts: Map<string, number>;

  /**
   * Set of hidden entity types
   */
  hiddenEntityTypes: Set<string>;

  /**
   * Whether to hide empty entities
   */
  hideEmpty: boolean;

  /**
   * Callback when entity type visibility is toggled
   */
  onToggleEntityType: (type: string) => void;

  /**
   * Callback when domain visibility is toggled
   */
  onToggleDomain: (domain: string, types: string[]) => void;

  /**
   * Callback when all entity types should be shown
   */
  onShowAll: () => void;

  /**
   * Callback when all entity types should be hidden
   */
  onHideAll: () => void;

  /**
   * Callback when hide empty is toggled
   */
  onToggleHideEmpty: (hideEmpty: boolean) => void;
}

export function EntityFilterPanel({
  entityTypesByDomain,
  entityCounts,
  hiddenEntityTypes,
  hideEmpty,
  onToggleEntityType,
  onToggleDomain,
  onShowAll,
  onHideAll,
  onToggleHideEmpty,
}: EntityFilterPanelProps) {
  // Start with all domains collapsed
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(
    new Set()
  );

  // Accordion behavior - only one domain open at a time
  const toggleDomain = (domain: string) => {
    setExpandedDomains((prev) => {
      if (prev.has(domain)) {
        // Close the domain
        return new Set();
      } else {
        // Open this domain, close all others
        return new Set([domain]);
      }
    });
  };

  // Calculate if domain is fully hidden/visible
  const isDomainHidden = (types: string[]) => {
    return types.every((type) => hiddenEntityTypes.has(type));
  };

  const isDomainVisible = (types: string[]) => {
    return types.every((type) => !hiddenEntityTypes.has(type));
  };

  // Calculate total visible/hidden counts
  const totalEntityTypes = Object.values(entityTypesByDomain).flat().length;
  const hiddenCount = hiddenEntityTypes.size;
  const visibleCount = totalEntityTypes - hiddenCount;
  const allHidden = hiddenCount === totalEntityTypes;

  return (
    <div className="flex flex-col h-full">
      {/* Header with Toggle Controls */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-sm font-medium text-foreground">
            Entity Filters
          </div>
          <div className="text-xs text-muted-foreground">
            {visibleCount} / {totalEntityTypes} visible
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-muted-foreground">Hide All</span>
            <input
              type="checkbox"
              checked={allHidden}
              onChange={(e) => {
                if (e.target.checked) {
                  onHideAll();
                } else {
                  onShowAll();
                }
              }}
              className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-1 focus:ring-primary cursor-pointer"
            />
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-muted-foreground">Hide Empty</span>
            <input
              type="checkbox"
              checked={hideEmpty}
              onChange={(e) => onToggleHideEmpty(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-1 focus:ring-primary cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Domain Sections */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(entityTypesByDomain)
          .filter(([domain, types]) => {
            // Filter out empty domains if hideEmpty is true
            if (hideEmpty) {
              const domainCount = types.reduce(
                (sum, type) => sum + (entityCounts.get(type) || 0),
                0
              );
              return domainCount > 0;
            }
            return true;
          })
          .map(([domain, types]) => {
            const isExpanded = expandedDomains.has(domain);
            const domainCount = types.reduce(
              (sum, type) => sum + (entityCounts.get(type) || 0),
              0
            );
            const domainHidden = isDomainHidden(types);
            const domainVisible = isDomainVisible(types);

            // Filter types if hideEmpty is true
            const visibleTypes = hideEmpty
              ? types.filter((type) => (entityCounts.get(type) || 0) > 0)
              : types;

            return (
              <div key={domain} className="border-b border-border">
                {/* Domain Header */}
                <div className="px-4 py-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleDomain(domain)}
                      className="flex items-center gap-2 flex-1 text-left hover:text-foreground transition-colors"
                    >
                      {isExpanded ? (
                        <Icon
                          name="chevron-down"
                          size={16}
                          className="text-muted-foreground"
                        />
                      ) : (
                        <Icon
                          name="chevron-right"
                          size={16}
                          className="text-muted-foreground"
                        />
                      )}
                      <span className="text-sm font-medium text-foreground capitalize">
                        {domain}
                      </span>
                      {domainCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({domainCount})
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => onToggleDomain(domain, types)}
                      className="ml-2 px-2 py-1 text-xs rounded hover:bg-accent transition-colors"
                      title={
                        domainHidden
                          ? "Show all in domain"
                          : "Hide all in domain"
                      }
                    >
                      {domainVisible ? (
                        <Icon name="check" size={12} className="text-success" />
                      ) : domainHidden ? (
                        <Icon
                          name="x"
                          size={12}
                          className="text-muted-foreground"
                        />
                      ) : (
                        <span className="w-3 h-3 block bg-muted-foreground/30 rounded-sm" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Entity Type Checkboxes */}
                {isExpanded && (
                  <div className="px-4 py-2 space-y-1">
                    {visibleTypes.map((type) => {
                      const isHidden = hiddenEntityTypes.has(type);
                      const count = entityCounts.get(type) || 0;

                      return (
                        <label
                          key={type}
                          className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="checkbox"
                              checked={!isHidden}
                              onChange={() => onToggleEntityType(type)}
                              className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                            />
                            <span
                              className={`text-sm ${
                                isHidden
                                  ? "text-muted-foreground line-through"
                                  : "text-foreground"
                              } group-hover:text-foreground transition-colors`}
                            >
                              {type}
                            </span>
                          </div>
                          {count > 0 && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                isHidden
                                  ? "text-muted-foreground bg-muted"
                                  : "text-primary bg-primary/10"
                              }`}
                            >
                              {count}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
