/**
 * EntityDomainGrid - Card-Based Entity Display
 *
 * Displays entities from a single domain in a card-based grid layout.
 * Optimized for tablet interaction with larger touch targets.
 *
 * Features:
 * - Configurable grid columns (3-6)
 * - Card sizes: small, medium, large
 * - Drag-and-drop entity creation
 * - Visibility toggle per entity type
 * - Entity counts
 */

"use client";

import React from "react";

import { Icon } from "@protolabsai/icon-system";
import { getEntityColor, getEntityImage } from "@protolabsai/utils/atlas";

export type CardSize = "small" | "medium" | "large";

interface EntityDomainGridProps {
  /**
   * Domain name
   */
  domain: string;

  /**
   * Array of entity type strings for this domain
   */
  types: string[];

  /**
   * Map of entity type to count
   */
  entityCounts: Map<string, number>;

  /**
   * Set of hidden entity types
   */
  hiddenEntityTypes: Set<string>;

  /**
   * Callback when entity type visibility is toggled
   */
  onToggleEntityType: (type: string) => void;

  /**
   * Number of grid columns
   * @default 4
   */
  gridColumns?: number;

  /**
   * Card size
   * @default "medium"
   */
  cardSize?: CardSize;

  /**
   * Read-only mode (no drag-and-drop)
   * @default false
   */
  readOnly?: boolean;
}

export function EntityDomainGrid({
  domain,
  types,
  entityCounts,
  hiddenEntityTypes,
  onToggleEntityType,
  gridColumns = 4,
  cardSize = "medium",
  readOnly = false,
}: EntityDomainGridProps) {
  // Handle drag start for entity creation
  const handleDragStart = (event: React.DragEvent, entityType: string) => {
    if (readOnly) return;
    event.dataTransfer.setData("application/reactflow-entitytype", entityType);
    event.dataTransfer.effectAllowed = "copy";
  };

  // Handle visibility toggle
  const handleToggle = (e: React.MouseEvent, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleEntityType(type);
  };

  // Get card dimensions based on size
  const getCardClasses = () => {
    switch (cardSize) {
      case "small":
        return "h-16"; // 64px
      case "medium":
        return "h-20"; // 80px (tablet-friendly)
      case "large":
        return "h-24"; // 96px (touch-optimized)
      default:
        return "h-20";
    }
  };

  // Get icon size based on card size
  const getIconSize = () => {
    switch (cardSize) {
      case "small":
        return "text-2xl"; // ~24px
      case "medium":
        return "text-3xl"; // ~32px
      case "large":
        return "text-4xl"; // ~40px
      default:
        return "text-3xl";
    }
  };

  // Get text sizes based on card size
  const getTextSize = () => {
    switch (cardSize) {
      case "small":
        return { name: "text-xs", count: "text-[10px]" };
      case "medium":
        return { name: "text-sm", count: "text-xs" };
      case "large":
        return { name: "text-base", count: "text-sm" };
      default:
        return { name: "text-sm", count: "text-xs" };
    }
  };

  const textSizes = getTextSize();

  return (
    <div className="h-full overflow-y-auto p-4">
      {/* Entity Cards Grid */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
        }}
        suppressHydrationWarning
      >
        {types.map((type) => {
          const color = getEntityColor(type);
          const icon = getEntityImage(type);
          const count = entityCounts.get(type) || 0;
          const isHidden = hiddenEntityTypes.has(type);

          return (
            <div
              key={type}
              draggable={!readOnly}
              onDragStart={(e) => handleDragStart(e, type)}
              className={`
                relative flex flex-col items-center justify-center
                rounded-lg border-2 transition-all group
                ${getCardClasses()}
                ${
                  readOnly
                    ? isHidden
                      ? "opacity-40 cursor-default bg-muted border-border"
                      : "cursor-default bg-card border-border"
                    : isHidden
                      ? "opacity-40 cursor-grab hover:opacity-60 bg-muted border-border"
                      : "cursor-grab hover:shadow-md bg-card border-border hover:border-primary"
                }
              `}
              style={{
                borderLeftWidth: "4px",
                borderLeftColor: color,
              }}
            >
              {/* Entity Icon */}
              <div className={`${getIconSize()} mb-1 flex-shrink-0`}>
                {icon}
              </div>

              {/* Entity Name */}
              <div
                className={`${textSizes.name} font-medium text-center px-2 truncate w-full text-foreground`}
              >
                {type}
              </div>

              {/* Count Badge */}
              {count > 0 && (
                <div
                  className={`
                    absolute top-1 right-1 ${textSizes.count} font-mono
                    px-1.5 py-0.5 rounded-full
                    ${
                      isHidden
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary"
                    }
                  `}
                >
                  {count}
                </div>
              )}

              {/* Visibility Toggle Button */}
              <button
                onClick={(e) => handleToggle(e, type)}
                onDragStart={(e) => e.preventDefault()}
                className="
                  absolute bottom-1 right-1
                  opacity-0 group-hover:opacity-100
                  transition-opacity p-1.5
                  hover:bg-accent rounded
                  cursor-pointer
                "
                title={isHidden ? `Show ${type}` : `Hide ${type}`}
                aria-label={isHidden ? `Show ${type}` : `Hide ${type}`}
              >
                {isHidden ? (
                  <Icon
                    name="eye-off"
                    size={12}
                    className="text-muted-foreground"
                  />
                ) : (
                  <Icon
                    name="eye"
                    size={12}
                    className="text-muted-foreground"
                  />
                )}
              </button>

              {/* Drag Indicator (subtle) */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-primary rounded-lg pointer-events-none transition-opacity" />
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {types.length === 0 && (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <p className="text-sm">No entities in this domain</p>
        </div>
      )}
    </div>
  );
}
