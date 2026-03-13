/**
 * ResearchNeeded Component
 *
 * Displays a placeholder for missing entity data with a clickable
 * link to initiate research. Core tenant: highlight missing information.
 */

import React from "react";

interface ResearchNeededProps {
  /** Field name that needs research */
  field: string;
  /** Entity UID for research context */
  entityUid: string;
  /** Entity type for research context */
  entityType: string;
  /** Optional custom text (default: "Research needed") */
  text?: string;
  /** Display variant */
  variant?: "inline" | "badge";
}

export function ResearchNeeded({
  field,
  entityUid,
  entityType,
  text = "Research needed",
  variant = "inline",
}: ResearchNeededProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log("🔍 Research started:", {
      field,
      entityUid,
      entityType,
      timestamp: new Date().toISOString(),
    });

    // TODO: Open research interface
    // - Show research panel for this specific field
    // - Suggest sources to fill this data
    // - Allow user to input or fetch data
  };

  if (variant === "badge") {
    return (
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1 text-xs px-2 py-1 border border-dashed border-muted-foreground/40 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:border-muted-foreground/60 transition-colors cursor-pointer"
        style={{ borderRadius: "calc(var(--radius) * 0.75)" }}
        title={`Research ${field} for this ${entityType}`}
      >
        <span className="opacity-60">🔍</span>
        <span className="italic">{text}</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="text-xs text-muted-foreground hover:text-foreground underline decoration-dashed underline-offset-2 italic transition-colors cursor-pointer"
      title={`Research ${field} for this ${entityType}`}
    >
      {text}
    </button>
  );
}
