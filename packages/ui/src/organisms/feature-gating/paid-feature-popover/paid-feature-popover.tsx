/**
 * Paid Feature Popover
 *
 * Reusable component for gating paid features with upgrade messaging.
 * Wraps any button/element and shows upgrade info on hover or click.
 *
 * Usage:
 * ```tsx
 * <PaidFeaturePopover
 *   feature={{
 *     name: "AI Chat",
 *     description: "Unlock AI-powered research assistance...",
 *     benefits: ["100 queries/day", "Smart suggestions"],
 *     tier: "basic"
 *   }}
 *   hasAccess={userTier !== "free"}
 *   trigger="click"
 * >
 *   <button>Chat</button>
 * </PaidFeaturePopover>
 * ```
 */

"use client";

import React, { useState, useEffect, useRef } from "react";

import { Icon } from "../../../atoms/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../atoms/popover";

export interface PaidFeatureInfo {
  /** Feature name (e.g., "AI Chat", "Drawing Tools") */
  name: string;

  /** Short description of what the feature does */
  description: string;

  /** List of benefits/capabilities (bullet points) */
  benefits: string[];

  /** Minimum required tier (e.g., "basic", "pro") */
  tier: "basic" | "pro" | "team" | "enterprise";

  /** Optional icon to show in header */
  icon?: React.ReactNode;

  /** Optional custom upgrade URL (defaults to /pricing) */
  upgradeUrl?: string;
}

export interface PaidFeaturePopoverProps {
  /** Feature information to display in popover */
  feature: PaidFeatureInfo;

  /** Whether user has access to this feature */
  hasAccess: boolean;

  /**
   * When to show the popover
   * - "click": Show on click only
   * - "hover": Show on hover after delay
   * - "both": Show on either click or hover
   * @default "click"
   */
  trigger?: "click" | "hover" | "both";

  /**
   * Hover delay in milliseconds (only applies if trigger includes hover)
   * @default 500
   */
  hoverDelay?: number;

  /**
   * Button or element to wrap
   */
  children: React.ReactElement;

  /**
   * Popover alignment relative to trigger
   * @default "start"
   */
  align?: "start" | "center" | "end";

  /**
   * Popover side relative to trigger
   * @default "right"
   */
  side?: "top" | "right" | "bottom" | "left";

  /**
   * Additional CSS classes for disabled state
   */
  disabledClassName?: string;
}

const TIER_LABELS: Record<string, string> = {
  basic: "Basic",
  pro: "Pro",
  team: "Team",
  enterprise: "Enterprise",
};

export function PaidFeaturePopover({
  feature,
  hasAccess,
  trigger = "click",
  hoverDelay = 500,
  children,
  align = "start",
  side = "right",
  disabledClassName = "",
}: PaidFeaturePopoverProps) {
  const [open, setOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // If user has access, render children as-is
  if (hasAccess) {
    return children;
  }

  // Handle hover with delay
  const handleMouseEnter = () => {
    if (trigger === "hover" || trigger === "both") {
      hoverTimeoutRef.current = setTimeout(() => {
        setOpen(true);
      }, hoverDelay);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Don't auto-close on mouse leave - let user interact with popover
  };

  // Handle click
  const handleClick = (e: React.MouseEvent) => {
    if (trigger === "click" || trigger === "both") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!open);
    }
  };

  // Clone children and add disabled styling + handlers
  const childProps = children.props as Record<string, unknown>;
  const originalClassName = childProps.className || "";
  const disabledClass = disabledClassName || "opacity-40 cursor-not-allowed";

  const newProps = {
    className: `${originalClassName} ${disabledClass}`.trim(),
    onClick: handleClick,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    title: `${feature.name} - Upgrade Required`,
    "aria-disabled": "true",
  };

  const triggerElement = React.cloneElement(children, newProps);

  const upgradeUrl = feature.upgradeUrl || "/pricing";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerElement}</PopoverTrigger>
      <PopoverContent className="w-80" align={align} side={side}>
        <div className="space-y-3">
          {/* Header with icon */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
              {feature.icon || (
                <Icon name="zap" size={20} className="text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">
                {feature.name} - Paid Feature
              </h3>
              <p className="text-xs text-muted-foreground">
                {feature.description}
              </p>
            </div>
          </div>

          {/* Benefits list */}
          {feature.benefits.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                <strong>{TIER_LABELS[feature.tier]} tier includes:</strong>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                {feature.benefits.map((benefit, i) => (
                  <li key={i}>• {benefit}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Upgrade CTA */}
          <a
            href={upgradeUrl}
            className="inline-flex items-center justify-center w-full rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
            onClick={() => setOpen(false)}
          >
            View Plans
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
