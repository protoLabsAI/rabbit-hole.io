import type { RefObject, ReactNode } from "react";

import type { CommunitySummary } from "./CommunityCard";
import type { GraphEntity } from "./EntityCard";
import type { ResearchSource } from "./SourceCard";

// ─── Shared activity event type ──────────────────────────────────────

export interface ActivityEvent {
  type: string;
  data: any;
  timestamp: number;
}

// ─── Shared layout props ─────────────────────────────────────────────

export interface ResearchLayoutProps {
  mode: "chat" | "deep-research";
  children: ReactNode;
  /** Activity feed events (tool calls for chat, research events for deep) */
  activityEvents?: ActivityEvent[];
  sources?: ResearchSource[];
  entities?: GraphEntity[];
  communities?: CommunitySummary[];
  /** Key findings to highlight in activity drawer (deep research) */
  findings?: string[];
  isStreaming?: boolean;
  /** Current research phase (for StepIndicator in chat mode, passed from parent) */
  currentPhase?: string;
  /** Highlighted source index for citation click scroll */
  highlightedSourceIndex?: number | null;
  /** Controlled drawer open state (optional; managed internally if omitted) */
  drawerOpen?: boolean;
  /** Called when internal drawer toggle is clicked */
  onDrawerToggle?: () => void;
  /** Ref for the report scroll container (deep-research only, for scrollToHeading) */
  reportRef?: RefObject<HTMLDivElement>;
  /** Mobile bottom sheet open state */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}
