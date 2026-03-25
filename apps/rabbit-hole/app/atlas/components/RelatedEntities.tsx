"use client";

import { useEffect, useState } from "react";

import { Icon } from "@proto/icon-system";

import { getEntityVisual } from "../lib/atlas-schema";

// ─── Types ───────────────────────────────────────────────────────────

interface RelatedEntityRow {
  uid: string;
  name: string;
  type: string;
  connections: number;
}

interface RelatedEntitiesProps {
  entityUid: string;
  onEntityClick: (uid: string, name: string) => void;
}

// ─── Main Component ───────────────────────────────────────────────────

export function RelatedEntities({
  entityUid,
  onEntityClick,
}: RelatedEntitiesProps) {
  const [entities, setEntities] = useState<RelatedEntityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityUid) return;

    setLoading(true);
    setError(null);

    fetch(`/api/atlas/entity-relationships/${encodeURIComponent(entityUid)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.related) {
          setEntities(json.data.related);
        } else {
          setError(json.error ?? "Failed to load related entities");
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [entityUid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Icon
          name="Loader2"
          className="h-4 w-4 animate-spin text-muted-foreground"
        />
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-destructive py-3">{error}</p>;
  }

  if (entities.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-3">
        No related entities found.
      </p>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {entities.map((entity) => {
        const visual = getEntityVisual(entity.type);
        return (
          <button
            key={entity.uid}
            onClick={() => onEntityClick(entity.uid, entity.name)}
            className="shrink-0 flex flex-col gap-1.5 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer
              border border-border w-[120px] text-left"
          >
            {/* Dot + name */}
            <div className="flex items-center gap-1.5">
              <span
                className="shrink-0 h-2 w-2 rounded-full"
                style={{ backgroundColor: visual.color }}
              />
              <span className="text-xs text-foreground truncate leading-tight flex-1">
                {entity.name}
              </span>
            </div>

            {/* Connection count */}
            <p className="text-[10px] text-muted-foreground">
              {entity.connections} connection
              {entity.connections !== 1 ? "s" : ""}
            </p>
          </button>
        );
      })}
    </div>
  );
}
