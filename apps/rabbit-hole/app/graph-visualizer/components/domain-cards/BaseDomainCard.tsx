/**
 * BaseDomainCard Component
 *
 * Shared layout and styling foundation for all domain-specific cards.
 * Provides consistent structure while allowing domain customization.
 */

import React from "react";

import {
  // Domain metadata for UI configuration
  BIOLOGICAL_DOMAIN_INFO,
  SOCIAL_DOMAIN_INFO,
  MEDICAL_DOMAIN_INFO,
  TECHNOLOGY_DOMAIN_INFO,
  GEOGRAPHIC_DOMAIN_INFO,
  ECONOMIC_DOMAIN_INFO,
  ACADEMIC_DOMAIN_INFO,
  LEGAL_DOMAIN_INFO,
  CULTURAL_DOMAIN_INFO,
  INFRASTRUCTURE_DOMAIN_INFO,
  TRANSPORTATION_DOMAIN_INFO,
  ASTRONOMICAL_DOMAIN_INFO,
} from "@proto/types";

import type { BaseDomainCardProps, DomainName } from "./types";

/**
 * Domain metadata registry for UI configuration
 */
const DOMAIN_METADATA = {
  biological: BIOLOGICAL_DOMAIN_INFO,
  social: SOCIAL_DOMAIN_INFO,
  medical: MEDICAL_DOMAIN_INFO,
  technology: TECHNOLOGY_DOMAIN_INFO,
  geographic: GEOGRAPHIC_DOMAIN_INFO,
  economic: ECONOMIC_DOMAIN_INFO,
  academic: ACADEMIC_DOMAIN_INFO,
  legal: LEGAL_DOMAIN_INFO,
  cultural: CULTURAL_DOMAIN_INFO,
  infrastructure: INFRASTRUCTURE_DOMAIN_INFO,
  transportation: TRANSPORTATION_DOMAIN_INFO,
  astronomical: ASTRONOMICAL_DOMAIN_INFO,
} as const;

/**
 * Props for card sections
 */
interface CardSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Reusable card section component
 * Uses whitelabel semantic color tokens for theme compatibility
 */
export const CardSection: React.FC<CardSectionProps> = ({
  title,
  children,
  className = "",
}) => (
  <div className={`mb-3 ${className}`}>
    {title && (
      <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
        {title}
      </div>
    )}
    <div className="text-sm text-foreground">{children}</div>
  </div>
);

/**
 * Props for property display
 */
interface PropertyRowProps {
  label: string;
  value: React.ReactNode | string | number | boolean | null | undefined;
  type?: "text" | "badge" | "link" | "date" | "number" | "status" | "custom";
}

/**
 * Reusable property row component
 * Uses whitelabel semantic color tokens for theme compatibility
 */
export const PropertyRow: React.FC<PropertyRowProps> = ({
  label,
  value,
  type = "text",
}) => {
  if (!value && value !== 0 && value !== false) return null;

  const renderValue = () => {
    // For custom type or React nodes, render directly
    if (type === "custom" || React.isValidElement(value)) {
      return value;
    }

    switch (type) {
      case "badge":
      case "status":
        return (
          <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded">
            {String(value)}
          </span>
        );
      case "link":
        return (
          <span className="text-primary underline cursor-pointer">
            {String(value)}
          </span>
        );
      case "number":
        return (
          <span>
            {typeof value === "number" ? value.toLocaleString() : String(value)}
          </span>
        );
      case "date":
        return (
          <span>
            {value instanceof Date ? value.toLocaleDateString() : String(value)}
          </span>
        );
      default:
        return <span>{String(value)}</span>;
    }
  };

  return (
    <div className="flex justify-between items-start py-1">
      <span className="text-xs text-muted-foreground font-medium">
        {label}:
      </span>
      <span className="text-xs text-foreground ml-2 flex-1 text-right">
        {renderValue()}
      </span>
    </div>
  );
};

// Re-export for backward compatibility
export const PopoverSection = CardSection;

/**
 * Get domain color for styling accents
 */
function getDomainColor(domain: DomainName): string {
  const domainInfo = DOMAIN_METADATA[domain];
  return domainInfo?.ui?.color || "#D1D5DB";
}

/**
 * Get domain icon for entity type
 */
function getDomainIcon(domain: DomainName, entityType: string): string {
  const domainInfo = DOMAIN_METADATA[domain];
  return (
    domainInfo?.ui?.entityIcons?.[entityType] || domainInfo?.ui?.icon || "📄"
  );
}

/**
 * BaseDomainCard Component
 *
 * Provides consistent layout structure for all domain cards.
 * Handles styling, spacing, and common UI patterns with responsive design.
 */
export const BaseDomainCard: React.FC<BaseDomainCardProps> = ({
  node,
  domain,
  size = "standard",
  onClick,
  selectable = false,
  interactive = true,
  className = "",
  style,
  children,
}) => {
  const domainColor = getDomainColor(domain);
  const domainIcon = getDomainIcon(domain, node.type);

  const handleCardClick = React.useCallback(() => {
    if (onClick && interactive) {
      onClick(node);
    }
  }, [onClick, node, interactive]);

  // Size-specific styling
  const sizeClasses = {
    compact: "p-3",
    standard: "p-4",
    detailed: "p-6",
  };

  const textSizes = {
    compact: "text-sm",
    standard: "text-sm",
    detailed: "text-base",
  };

  return (
    <div
      className={`
        bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200
        ${sizeClasses[size]} ${textSizes[size]} text-foreground font-sans leading-relaxed
        ${interactive && onClick ? "cursor-pointer hover:bg-muted/50" : ""}
        ${selectable ? "ring-2 ring-transparent hover:ring-primary/20" : ""}
        ${size === "compact" ? "max-w-sm" : size === "detailed" ? "max-w-2xl" : "max-w-md"}
        w-full
        ${className}
      `}
      style={style}
      onClick={handleCardClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick && interactive ? 0 : undefined}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onClick && interactive) {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* Card header with domain color accent */}
      <div
        className={`border-l-4 pl-3 mb-${size === "compact" ? "2" : "3"}`}
        style={{ borderLeftColor: domainColor }}
      >
        <div className="flex items-center gap-2">
          <span className={size === "compact" ? "text-base" : "text-lg"}>
            {domainIcon}
          </span>
          <div className="flex-1 min-w-0">
            <h3
              className={`font-semibold text-foreground ${size === "compact" ? "text-sm" : size === "detailed" ? "text-lg" : "text-base"} truncate`}
            >
              {node.name}
            </h3>
            {size !== "compact" && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {node.type}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span
                  className="text-xs capitalize"
                  style={{ color: domainColor }}
                >
                  {domain}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card content */}
      <div className={`space-y-${size === "compact" ? "2" : "3"}`}>
        {children}
      </div>
    </div>
  );
};

BaseDomainCard.displayName = "BaseDomainCard";

// Backward compatibility export
export const BaseDomainPopover = BaseDomainCard;

export default BaseDomainCard;
