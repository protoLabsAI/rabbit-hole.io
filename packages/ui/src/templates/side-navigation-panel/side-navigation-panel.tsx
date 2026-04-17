/**
 * SideNavigationPanel - VSCode-Style Side Navigation
 *
 * A reusable panel component with vertical tab navigation on the side.
 * Perfect for categorized content like domains, tool palettes, or settings.
 *
 * Features:
 * - Vertical tab navigation with icons
 * - Collapsible to icon-only mode
 * - Resizable navigation panel
 * - Left or right positioning
 * - Badge support for counts
 * - Layout persistence
 *
 * @example
 * ```tsx
 * <SideNavigationPanel
 *   tabs={[
 *     {
 *       id: "biological",
 *       label: "Biological",
 *       icon: <Microscope className="w-5 h-5" />,
 *       badge: 12,
 *       content: <BiologicalEntities />
 *     }
 *   ]}
 *   layoutId="entity-domains"
 *   navPosition="left"
 * />
 * ```
 */

"use client";

import React, { useState, useCallback, useEffect } from "react";

import { Icon } from "../../atoms/icon";

export interface SideNavTab {
  /**
   * Unique identifier for the tab
   */
  id: string;

  /**
   * Display label for the tab (shown when expanded)
   */
  label: string;

  /**
   * Icon component for the tab (required for icon-only mode)
   */
  icon: React.ReactNode;

  /**
   * Optional badge content (e.g., count)
   */
  badge?: string | number;

  /**
   * Content to display when tab is active
   */
  content: React.ReactNode;
}

export interface SideNavigationPanelProps {
  /**
   * Array of navigation tabs
   */
  tabs: SideNavTab[];

  /**
   * Unique ID for persisting layout state in localStorage
   */
  layoutId: string;

  /**
   * Position of navigation panel
   * @default "left"
   */
  navPosition?: "left" | "right";

  /**
   * Navigation panel width when expanded (pixels)
   * @default 140
   */
  navWidth?: number;

  /**
   * Width when collapsed to icon-only mode (pixels)
   * @default 50
   */
  collapsedWidth?: number;

  /**
   * Enable collapse/expand functionality
   * @default true
   */
  collapsible?: boolean;

  /**
   * Initial collapsed state
   * @default false
   */
  defaultCollapsed?: boolean;

  /**
   * Default active tab ID
   */
  defaultTab?: string;

  /**
   * Callback when active tab changes
   */
  onTabChange?: (tabId: string) => void;

  /**
   * Callback when collapse state changes
   */
  onCollapseChange?: (collapsed: boolean) => void;

  /**
   * Additional CSS classes for the container
   */
  className?: string;
}

export function SideNavigationPanel({
  tabs,
  layoutId,
  navPosition = "left",
  navWidth = 140,
  collapsedWidth = 50,
  collapsible = true,
  defaultCollapsed = false,
  defaultTab,
  onTabChange,
  onCollapseChange,
  className = "",
}: SideNavigationPanelProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || "");
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Get current active tab
  const currentTab = tabs.find((tab) => tab.id === activeTab);

  // Restore state from localStorage — mount-only. Including `tabs` in deps
  // caused a re-render cascade (callers often pass a fresh array every render),
  // which re-fired this effect every frame and spammed console warnings.

  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem(`${layoutId}-nav-collapsed`);
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === "true");
      }

      const savedTab = localStorage.getItem(`${layoutId}-nav-tab`);
      if (savedTab && tabs.some((t) => t.id === savedTab)) {
        setActiveTab(savedTab);
      }
    } catch (e) {
      console.warn("Failed to restore navigation state:", e);
    }
  }, [layoutId]);

  // Save collapsed state
  useEffect(() => {
    try {
      localStorage.setItem(`${layoutId}-nav-collapsed`, String(isCollapsed));
    } catch (e) {
      console.warn("Failed to save collapsed state:", e);
    }
  }, [isCollapsed, layoutId]);

  // Save active tab
  useEffect(() => {
    try {
      localStorage.setItem(`${layoutId}-nav-tab`, activeTab);
    } catch (e) {
      console.warn("Failed to save active tab:", e);
    }
  }, [activeTab, layoutId]);

  // Handle tab change
  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      onTabChange?.(tabId);
    },
    [onTabChange]
  );

  // Handle collapse toggle
  const handleCollapseToggle = useCallback(() => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapseChange?.(newState);
  }, [isCollapsed, onCollapseChange]);

  return (
    <div
      className={`h-full flex ${navPosition === "left" ? "flex-row" : "flex-row-reverse"} ${className}`}
    >
      {/* Navigation Panel */}
      <div
        className="h-full flex flex-col bg-card border-border transition-all"
        style={{
          width: isCollapsed ? `${collapsedWidth}px` : `${navWidth}px`,
          borderRightWidth: navPosition === "left" ? "1px" : "0",
          borderLeftWidth: navPosition === "right" ? "1px" : "0",
        }}
      >
        {/* Navigation Tabs */}
        <div className="flex-1 overflow-y-auto py-2">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                w-full flex items-center gap-2 px-2 py-2 transition-colors relative
                ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }
                ${isCollapsed ? "justify-center" : "justify-start"}
              `}
                title={isCollapsed ? tab.label : undefined}
              >
                {/* Icon */}
                <span className="flex-shrink-0">{tab.icon}</span>

                {/* Label (hidden when collapsed) */}
                {!isCollapsed && (
                  <span className="text-xs font-medium truncate flex-1 text-left">
                    {tab.label}
                  </span>
                )}

                {/* Badge */}
                {tab.badge && !isCollapsed && (
                  <span
                    className={`
                    px-1.5 py-0.5 text-xs rounded-full flex-shrink-0
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }
                  `}
                  >
                    {tab.badge}
                  </span>
                )}

                {/* Badge as dot when collapsed */}
                {tab.badge && isCollapsed && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Collapse Toggle Button */}
        {collapsible && (
          <div className="border-t border-border p-1.5">
            <button
              onClick={handleCollapseToggle}
              className={`
              w-full flex items-center justify-center gap-2
              px-2 py-1.5 rounded-md transition-colors
              text-muted-foreground hover:text-foreground hover:bg-accent
              ${isCollapsed ? "p-2" : ""}
            `}
              title={isCollapsed ? "Expand navigation" : "Collapse navigation"}
            >
              {navPosition === "left" ? (
                isCollapsed ? (
                  <Icon name="chevron-right" size={16} />
                ) : (
                  <Icon name="chevron-left" size={16} />
                )
              ) : isCollapsed ? (
                <Icon name="chevron-left" size={16} />
              ) : (
                <Icon name="chevron-right" size={16} />
              )}
              {!isCollapsed && <span className="text-xs">Collapse</span>}
            </button>
          </div>
        )}
      </div>

      {/* Content Panel */}
      <div className="flex-1 h-full overflow-hidden bg-background">
        {currentTab?.content}
      </div>
    </div>
  );
}
