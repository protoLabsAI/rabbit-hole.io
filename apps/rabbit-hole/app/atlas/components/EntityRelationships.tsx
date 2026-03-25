"use client";

import { useEffect, useState } from "react";

import { Icon } from "@proto/icon-system";

import { getEntityVisual } from "../lib/atlas-schema";

// ─── Types ───────────────────────────────────────────────────────────

interface RelationshipRow {
  relType: string;
  sentiment: string | null;
  otherUid: string;
  otherName: string;
  otherType: string;
}

interface RelationshipGroup {
  relType: string;
  items: RelationshipRow[];
}

interface EntityRelationshipsProps {
  entityUid: string;
  onEntityClick: (uid: string, name: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatRelType(relType: string): string {
  return relType
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function groupByRelType(rows: RelationshipRow[]): RelationshipGroup[] {
  const map = new Map<string, RelationshipRow[]>();
  for (const row of rows) {
    const existing = map.get(row.relType);
    if (existing) {
      existing.push(row);
    } else {
      map.set(row.relType, [row]);
    }
  }
  return Array.from(map.entries()).map(([relType, items]) => ({
    relType,
    items,
  }));
}

// ─── Sub-components ──────────────────────────────────────────────────

function RelationshipGroupSection({
  group,
  onEntityClick,
}: {
  group: RelationshipGroup;
  onEntityClick: (uid: string, name: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      {/* Collapsible header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 py-1.5 group"
      >
        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          {formatRelType(group.relType)}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground tabular-nums">
            {group.items.length}
          </span>
          <Icon
            name={open ? "ChevronUp" : "ChevronDown"}
            className="h-3 w-3 text-muted-foreground"
          />
        </div>
      </button>

      {/* Entity cards */}
      {open && (
        <div className="space-y-0.5 mb-3">
          {group.items.map((item) => {
            const visual = getEntityVisual(item.otherType);
            return (
              <button
                key={`${item.relType}-${item.otherUid}`}
                onClick={() => onEntityClick(item.otherUid, item.otherName)}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer text-left"
              >
                {/* Colored dot */}
                <span
                  className="shrink-0 h-2 w-2 rounded-full"
                  style={{ backgroundColor: visual.color }}
                />
                {/* Name */}
                <span className="flex-1 text-xs text-foreground truncate">
                  {item.otherName}
                </span>
                {/* Type badge */}
                <span
                  className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${visual.color}20`,
                    color: visual.color,
                  }}
                >
                  {visual.label}
                </span>
                <Icon
                  name="ChevronRight"
                  className="shrink-0 h-3 w-3 text-muted-foreground"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

export function EntityRelationships({
  entityUid,
  onEntityClick,
}: EntityRelationshipsProps) {
  const [groups, setGroups] = useState<RelationshipGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityUid) return;

    setLoading(true);
    setError(null);

    fetch(`/api/atlas/entity-relationships/${encodeURIComponent(entityUid)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.relationships) {
          setGroups(groupByRelType(json.data.relationships));
        } else {
          setError(json.error ?? "Failed to load relationships");
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

  if (groups.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-3">
        No relationships found.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {groups.map((group) => (
        <RelationshipGroupSection
          key={group.relType}
          group={group}
          onEntityClick={onEntityClick}
        />
      ))}
    </div>
  );
}
