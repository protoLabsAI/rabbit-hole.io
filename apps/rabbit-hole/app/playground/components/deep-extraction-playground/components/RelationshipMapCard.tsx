/**
 * Relationship Map Card
 *
 * Generative UI component showing relationship extraction progress.
 */

import React from "react";

import { Icon } from "@proto/icon-system";
import { Badge } from "@proto/ui/atoms";

interface RelationshipMapCardProps {
  relationships: Array<{
    uid: string;
    type: string;
    source: string;
    target: string;
    confidence?: number;
  }>;
  focusEntityUids?: string[];
  stats?: {
    totalFound?: number;
    filtered?: number;
    focusEntityCount?: number;
  };
}

export function RelationshipMapCard({
  relationships,
  focusEntityUids = [],
  stats,
}: RelationshipMapCardProps) {
  // Group relationships by type
  const relationshipsByType = relationships.reduce(
    (acc, rel) => {
      const type = rel.type || "Unknown";
      if (!acc[type]) acc[type] = 0;
      acc[type]++;
      return acc;
    },
    {} as Record<string, number>
  );

  // Count focus relationships
  const focusSet = new Set(focusEntityUids);
  const focusRelCount = relationships.filter(
    (r) => focusSet.has(r.source) || focusSet.has(r.target)
  ).length;

  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 mt-2">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="network" size={16} className="text-emerald-600" />
        <span className="text-sm font-medium">
          Found {relationships.length} relationships
        </span>
      </div>

      {/* Stats */}
      {stats && (
        <div className="flex flex-wrap gap-2 mb-3">
          {stats.totalFound !== undefined && (
            <Badge variant="secondary" className="text-xs">
              Total: {stats.totalFound}
            </Badge>
          )}
          {stats.filtered !== undefined && stats.filtered > 0 && (
            <Badge variant="outline" className="text-xs">
              Filtered: {stats.filtered}
            </Badge>
          )}
          {focusEntityUids.length > 0 && (
            <Badge
              variant="outline"
              className="text-xs border-emerald-500 text-emerald-700"
            >
              Focus: {focusRelCount}
            </Badge>
          )}
        </div>
      )}

      {/* Relationship type breakdown */}
      <div className="space-y-1">
        {Object.entries(relationshipsByType)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([type, count]) => (
            <div
              key={type}
              className="flex items-center justify-between text-xs bg-muted/50 px-2 py-1 rounded"
            >
              <span className="font-medium">{type.replace(/_/g, " ")}</span>
              <Badge variant="outline" className="text-xs">
                {count}
              </Badge>
            </div>
          ))}
        {Object.keys(relationshipsByType).length > 5 && (
          <div className="text-xs text-muted-foreground text-center pt-1">
            +{Object.keys(relationshipsByType).length - 5} more types
          </div>
        )}
      </div>
    </div>
  );
}
