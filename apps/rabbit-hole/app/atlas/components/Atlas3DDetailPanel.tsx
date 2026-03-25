"use client";

import { useEffect, useState } from "react";

import { Icon } from "@proto/icon-system";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
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
    dates?: {
      start?: string;
      end?: string;
    };
  };
  network: {
    total: number;
    incoming: number;
    outgoing: number;
    by_sentiment?: {
      hostile: number;
      supportive: number;
      neutral: number;
    };
  };
}

interface Atlas3DDetailPanelProps {
  entityId: string | null;
  entityName?: string;
  entityType?: string;
  entityColor?: string;
  onClose: () => void;
  onExpand?: (entityId: string) => void;
}

// ─── Prominent properties ordered by entity type ─────────────────────

const PROMINENT_PROPS: Array<{
  key: keyof EntityDetails["entity"];
  label: string;
}> = [
  { key: "bio", label: "Bio" },
  { key: "occupation", label: "Occupation" },
  { key: "nationality", label: "Nationality" },
  { key: "birthDate", label: "Birth Date" },
  { key: "birthPlace", label: "Birth Place" },
  { key: "politicalParty", label: "Political Party" },
];

const SECONDARY_PROPS: Array<{
  key: keyof EntityDetails["entity"];
  label: string;
}> = [
  { key: "education", label: "Education" },
  { key: "netWorth", label: "Net Worth" },
  { key: "residence", label: "Residence" },
];

// ─── Component ──────────────────────────────────────────────────────

export default function Atlas3DDetailPanel({
  entityId,
  entityName,
  entityType,
  entityColor,
  onClose,
  onExpand,
}: Atlas3DDetailPanelProps) {
  const [details, setDetails] = useState<EntityDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllProps, setShowAllProps] = useState(false);

  // Reset expanded state when entity changes
  useEffect(() => {
    setShowAllProps(false);
  }, [entityId]);

  // Fetch entity details when panel opens
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

  const open = entityId !== null;

  // Derive visual — prefer fetched details, fallback to prop-passed type
  const resolvedType = details?.entity.entityType ?? entityType ?? "unknown";
  const visual = getEntityVisual(resolvedType);
  const nodeColor = entityColor ?? visual.color;

  // Build prominent + secondary property entries for the loaded entity
  const prominentEntries = PROMINENT_PROPS.map(({ key, label }) => ({
    label,
    value: details?.entity[key] as string | undefined,
  })).filter((e) => Boolean(e.value));

  const secondaryEntries = SECONDARY_PROPS.map(({ key, label }) => ({
    label,
    value: details?.entity[key] as string | undefined,
  })).filter((e) => Boolean(e.value));

  // Count relationship types from sentiment data
  const sentimentData = details?.network.by_sentiment;
  const relTypeCount = sentimentData
    ? [
        sentimentData.hostile > 0,
        sentimentData.supportive > 0,
        sentimentData.neutral > 0,
      ].filter(Boolean).length
    : 0;

  const displayName = details?.entity.label ?? entityName ?? "Loading…";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-[420px] max-w-[420px] p-0 bg-[#0d0d18] border-l border-white/[0.06] flex flex-col overflow-hidden"
        style={{ transition: "transform 150ms ease" }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <SheetHeader className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="min-w-0">
              <SheetTitle className="text-xl font-semibold text-foreground leading-tight truncate">
                {displayName}
              </SheetTitle>
              <span
                className="inline-block mt-2 text-[11px] font-medium px-2.5 py-0.5 rounded-full capitalize"
                style={{
                  backgroundColor: `${nodeColor}22`,
                  color: nodeColor,
                  border: `1px solid ${nodeColor}44`,
                }}
              >
                {visual.label !== "Entity" ? visual.label : resolvedType}
              </span>
            </div>
          </div>
        </SheetHeader>

        {/* ── Body ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Icon
                name="Loader2"
                className="h-5 w-5 animate-spin text-muted-foreground"
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              <Icon name="AlertCircle" className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {!loading && !error && details && (
            <>
              {/* ── Metrics row ───────────────────────────────── */}
              <div className="grid grid-cols-3 gap-2">
                <KpiCard
                  label="Connections"
                  value={details.network.total}
                  icon="GitBranch"
                />
                <KpiCard
                  label="Rel. Types"
                  value={relTypeCount}
                  icon="Shuffle"
                />
                <KpiCard
                  label="Sources"
                  value={0}
                  icon="BookOpen"
                  muted
                />
              </div>

              {/* ── Bio block ──────────────────────────────────── */}
              {details.entity.bio && (
                <div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {details.entity.bio}
                  </p>
                </div>
              )}

              {/* ── Properties ─────────────────────────────────── */}
              {prominentEntries.length > 0 && (
                <section>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">
                    Properties
                  </p>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {prominentEntries
                      .filter((e) => e.label !== "Bio")
                      .map(({ label, value }) => (
                        <PropertyEntry
                          key={label}
                          label={label}
                          value={value!}
                        />
                      ))}
                  </dl>

                  {/* Collapsible secondary props */}
                  {secondaryEntries.length > 0 && (
                    <>
                      {showAllProps && (
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-2.5">
                          {secondaryEntries.map(({ label, value }) => (
                            <PropertyEntry
                              key={label}
                              label={label}
                              value={value!}
                            />
                          ))}
                        </dl>
                      )}
                      <button
                        onClick={() => setShowAllProps((v) => !v)}
                        className="mt-2.5 flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary transition-colors"
                      >
                        <Icon
                          name={showAllProps ? "ChevronUp" : "ChevronDown"}
                          className="h-3 w-3"
                        />
                        {showAllProps
                          ? "Show fewer"
                          : `Show all ${secondaryEntries.length + prominentEntries.filter((e) => e.label !== "Bio").length} properties`}
                      </button>
                    </>
                  )}
                </section>
              )}

              {/* ── Tags ────────────────────────────────────────── */}
              {details.entity.tags && details.entity.tags.length > 0 && (
                <section>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {details.entity.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-foreground/70 border border-white/[0.08]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Aliases ─────────────────────────────────────── */}
              {details.entity.aliases && details.entity.aliases.length > 0 && (
                <section>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                    Also known as
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    {details.entity.aliases.join(", ")}
                  </p>
                </section>
              )}
            </>
          )}

          {/* Placeholder content while loading first-time (entity name known) */}
          {!loading && !error && !details && entityId && (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              No details available
            </div>
          )}
        </div>

        {/* ── Footer actions ──────────────────────────────────── */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-white/[0.06] flex items-center gap-2">
          {onExpand && entityId && (
            <button
              onClick={() => onExpand(entityId)}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-md bg-primary/10 hover:bg-primary/15"
            >
              <Icon name="Maximize2" className="h-3.5 w-3.5" />
              Expand Neighborhood
            </button>
          )}
          {entityId && (
            <a
              href={`/atlas?viewMode=ego&centerEntity=${entityId}`}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-white/[0.04]"
            >
              <Icon name="Focus" className="h-3.5 w-3.5" />
              Ego view
            </a>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  muted,
}: {
  label: string;
  value: number;
  icon: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2.5 text-center">
      <p
        className={`text-lg font-semibold tabular-nums leading-tight ${muted ? "text-muted-foreground" : "text-foreground"}`}
      >
        {value.toLocaleString()}
      </p>
      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{label}</p>
    </div>
  );
}

function PropertyEntry({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wide truncate">
        {label}
      </dt>
      <dd className="text-xs text-foreground/90 mt-0.5 leading-relaxed">
        {value}
      </dd>
    </div>
  );
}
