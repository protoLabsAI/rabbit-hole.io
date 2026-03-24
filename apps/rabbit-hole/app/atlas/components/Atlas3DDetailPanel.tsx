"use client";

import { useEffect, useState } from "react";

import { Icon } from "@proto/icon-system";

import { getEntityVisual } from "../lib/atlas-schema";

// ─── Types ──────────────────────────────────────────────────────────

interface EntityDetails {
  entity: {
    id: string;
    label: string;
    entityType: string;
    tags: string[];
    bio?: string;
    birthDate?: string;
    birthPlace?: string;
    nationality?: string;
    occupation?: string;
    politicalParty?: string;
    education?: string;
    netWorth?: string;
    residence?: string;
    aliases: string[];
  };
  network: {
    total: number;
    incoming: number;
    outgoing: number;
  };
}

interface Atlas3DDetailPanelProps {
  entityId: string | null;
  onClose: () => void;
  onExpand?: (entityId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────

export default function Atlas3DDetailPanel({
  entityId,
  onClose,
  onExpand,
}: Atlas3DDetailPanelProps) {
  const [details, setDetails] = useState<EntityDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityId) {
      setDetails(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/atlas-details/${entityId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setDetails(json.data);
        } else {
          setError(json.error || "Failed to load entity details");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [entityId]);

  if (!entityId) return null;

  const visual = details
    ? getEntityVisual(details.entity.entityType)
    : null;

  return (
    <div
      className="absolute top-0 right-0 h-full w-[320px] bg-card/95 backdrop-blur-md border-l border-border
        flex flex-col z-20 animate-in slide-in-from-right-full duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground truncate">
          Entity Details
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted transition-colors"
          aria-label="Close detail panel"
        >
          <Icon name="X" className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Icon
              name="Loader2"
              className="h-5 w-5 animate-spin text-muted-foreground"
            />
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive py-4">{error}</div>
        )}

        {details && !loading && (
          <>
            {/* Name + type badge */}
            <div>
              <h4 className="text-base font-semibold text-foreground leading-tight">
                {details.entity.label}
              </h4>
              <span
                className="inline-block mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: visual
                    ? `${visual.color}20`
                    : "rgba(107,114,128,0.15)",
                  color: visual?.color ?? "#6B7280",
                }}
              >
                {visual?.label ?? details.entity.entityType}
              </span>
            </div>

            {/* Bio */}
            {details.entity.bio && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {details.entity.bio}
              </p>
            )}

            {/* Network stats */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard
                label="Total"
                value={details.network.total}
              />
              <StatCard
                label="Incoming"
                value={details.network.incoming}
              />
              <StatCard
                label="Outgoing"
                value={details.network.outgoing}
              />
            </div>

            {/* Property list */}
            <div className="space-y-1.5">
              <PropertyRow
                label="Occupation"
                value={details.entity.occupation}
              />
              <PropertyRow
                label="Nationality"
                value={details.entity.nationality}
              />
              <PropertyRow
                label="Birth Date"
                value={details.entity.birthDate}
              />
              <PropertyRow
                label="Birth Place"
                value={details.entity.birthPlace}
              />
              <PropertyRow
                label="Education"
                value={details.entity.education}
              />
              <PropertyRow
                label="Political Party"
                value={details.entity.politicalParty}
              />
              <PropertyRow
                label="Net Worth"
                value={details.entity.netWorth}
              />
              <PropertyRow
                label="Residence"
                value={details.entity.residence}
              />
            </div>

            {/* Tags */}
            {details.entity.tags.length > 0 && (
              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">
                  Tags
                </p>
                <div className="flex flex-wrap gap-1">
                  {details.entity.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Aliases */}
            {details.entity.aliases.length > 0 && (
              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">
                  Also known as
                </p>
                <p className="text-xs text-foreground">
                  {details.entity.aliases.join(", ")}
                </p>
              </div>
            )}

            {/* Expand button (Feature 4) */}
            {onExpand && (
              <button
                onClick={() => onExpand(entityId)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md
                  bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium
                  transition-colors"
              >
                <Icon name="Maximize2" className="h-4 w-4" />
                Expand Neighborhood
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/50 rounded-md px-2.5 py-2 text-center">
      <p className="text-sm font-semibold text-foreground tabular-nums">
        {value.toLocaleString()}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function PropertyRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] text-muted-foreground shrink-0 w-20">
        {label}
      </span>
      <span className="text-xs text-foreground truncate">{value}</span>
    </div>
  );
}
