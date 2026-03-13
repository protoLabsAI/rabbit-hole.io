/**
 * Entity Selector Component
 *
 * Multi-entity selection interface for analytics page.
 * Reuses the timeline entity selector with analytics branding.
 */

"use client";

import React from "react";

// Import the existing timeline entity selector
import { EntitySelector as TimelineEntitySelector } from "../../timeline/components/EntitySelector";

// ==================== Component Props ====================

interface EntitySelectorProps {
  selectedEntities: string[];
  onEntitiesChange: (entities: string[]) => void;
  maxEntities?: number;
}

// ==================== Component ====================

export function EntitySelector({
  selectedEntities,
  onEntitiesChange,
  maxEntities = 5,
}: EntitySelectorProps) {
  // For now, reuse the timeline entity selector
  // In the future, this could be enhanced with analytics-specific features
  return (
    <TimelineEntitySelector
      selectedEntities={selectedEntities}
      onEntitiesChange={onEntitiesChange}
      maxEntities={maxEntities}
    />
  );
}
