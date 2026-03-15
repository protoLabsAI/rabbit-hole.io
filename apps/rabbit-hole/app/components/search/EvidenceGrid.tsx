"use client";

import { Icon } from "@proto/icon-system";

import type { EvidenceNode } from "../../hooks/useSearch";

interface EvidenceGridProps {
  evidence: EvidenceNode[];
}

const KIND_ICONS: Record<string, string> = {
  research: "GraduationCap",
  major_media: "Newspaper",
  government: "Landmark",
  social_media: "MessageCircle",
  academic: "BookOpen",
  unknown: "File",
};

function ReliabilityDot({ score }: { score: number }) {
  const color =
    score >= 0.8
      ? "bg-green-500"
      : score >= 0.5
        ? "bg-yellow-500"
        : "bg-red-500";
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${color}`}
      title={`Reliability: ${Math.round(score * 100)}%`}
    />
  );
}

export function EvidenceGrid({ evidence }: EvidenceGridProps) {
  if (evidence.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Icon name="Shield" className="h-3.5 w-3.5" />
        Evidence ({evidence.length})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {evidence.map((ev) => {
          const iconName = KIND_ICONS[ev.kind] || KIND_ICONS.unknown;
          return (
            <div
              key={ev.uid}
              className="rounded-lg border border-border bg-card/50 p-3 text-sm"
            >
              <div className="flex items-start gap-2.5">
                <div className="flex-shrink-0 w-7 h-7 rounded-md bg-muted/80 flex items-center justify-center">
                  <Icon
                    name={iconName as any}
                    className="h-3.5 w-3.5 text-muted-foreground"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  {ev.url ? (
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
                    >
                      {ev.title || "Untitled"}
                    </a>
                  ) : (
                    <p className="text-xs font-medium text-foreground line-clamp-2">
                      {ev.title || "Untitled"}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <ReliabilityDot score={ev.reliability} />
                    {ev.publisher && <span>{ev.publisher}</span>}
                    {ev.date && (
                      <>
                        <span className="text-border">·</span>
                        <span>{ev.date}</span>
                      </>
                    )}
                  </div>
                  {ev.relatedEntities.length > 0 && (
                    <p className="text-[10px] text-muted-foreground/60 mt-1 truncate">
                      Re: {ev.relatedEntities.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
