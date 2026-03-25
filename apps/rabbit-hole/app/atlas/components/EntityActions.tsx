"use client";

import Link from "next/link";

import { Icon } from "@proto/icon-system";

// ─── Types ───────────────────────────────────────────────────────────

interface EntityActionsProps {
  entityUid: string;
  entityName: string;
  onExpand: () => void;
}

// ─── Component ───────────────────────────────────────────────────────

export function EntityActions({
  entityUid,
  entityName,
  onExpand,
}: EntityActionsProps) {
  const researchHref = `/?q=${encodeURIComponent(entityName)}`;
  const egoNetworkHref = `/atlas?viewMode=ego&centerEntity=${encodeURIComponent(entityUid)}`;

  return (
    <div className="flex gap-2">
      {/* Research */}
      <Link
        href={researchHref}
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md
          bg-muted hover:bg-muted/70 text-foreground text-xs font-medium
          transition-colors"
      >
        <Icon name="Search" className="h-3.5 w-3.5 shrink-0" />
        Research
      </Link>

      {/* Ego Network */}
      <Link
        href={egoNetworkHref}
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md
          bg-muted hover:bg-muted/70 text-foreground text-xs font-medium
          transition-colors"
      >
        <Icon name="Globe" className="h-3.5 w-3.5 shrink-0" />
        Ego Network
      </Link>

      {/* Expand */}
      <button
        onClick={onExpand}
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md
          bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium
          transition-colors"
      >
        <Icon name="Maximize2" className="h-3.5 w-3.5 shrink-0" />
        Expand
      </button>
    </div>
  );
}
