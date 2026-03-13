/**
 * Entity Discovery Card
 *
 * Generative UI component showing discovered entities in chat.
 * Uses EntityCard component for consistent presentation.
 */

import React from "react";

import { Icon } from "@proto/icon-system";
import { Badge } from "@proto/ui/atoms";

interface EntityDiscoveryCardProps {
  entities: Array<{
    uid: string;
    name: string;
    type: string;
    _phase?: string;
    _confidence?: number;
    properties?: Record<string, any>;
  }>;
  focusEntityUids?: string[];
  stats: {
    totalFound: number;
    returned: number;
    limited: boolean;
  };
}

export function EntityDiscoveryCard({
  entities,
  focusEntityUids = [],
  stats,
}: EntityDiscoveryCardProps) {
  // Group entities by type for display
  const entitiesByType = entities.reduce(
    (acc, entity) => {
      const type = entity.type || "Unknown";
      if (!acc[type]) acc[type] = [];
      acc[type].push(entity);
      return acc;
    },
    {} as Record<string, typeof entities>
  );

  const focusSet = new Set(focusEntityUids);

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mt-2">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="search" size={16} className="text-primary" />
        <span className="text-sm font-medium">
          Discovered {stats.returned} entities
        </span>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant="secondary" className="text-xs">
          Found: {stats.totalFound}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          Returned: {stats.returned}
        </Badge>
        {stats.limited && (
          <Badge
            variant="outline"
            className="text-xs border-amber-500 text-amber-700"
          >
            Limited
          </Badge>
        )}
      </div>

      {/* Entity type breakdown */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {Object.entries(entitiesByType).map(([type, typeEntities]) => (
          <div
            key={type}
            className="flex items-center justify-between text-xs bg-muted/50 px-2 py-1 rounded"
          >
            <span className="font-medium">{type}</span>
            <Badge variant="outline" className="text-xs">
              {typeEntities.length}
            </Badge>
          </div>
        ))}
      </div>

      {/* Focus entities highlight */}
      {focusEntityUids.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Focus:</span>{" "}
          {entities
            .filter((e) => focusSet.has(e.uid))
            .map((e) => e.name)
            .join(", ")}
        </div>
      )}
    </div>
  );
}
