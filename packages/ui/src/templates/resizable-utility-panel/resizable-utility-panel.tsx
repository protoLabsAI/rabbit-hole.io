/**
 * ResizableUtilityPanel - Universal Utility Panel with Tabs
 *
 * A reusable panel component for tools, legends, settings, and utilities.
 * Features:
 * - Tabbed interface with custom content per tab
 * - Per-tab custom header content and actions
 * - Collapsible with floating toggle button
 * - Resizable with min/max constraints
 * - Multiple positioning options (top, bottom, left, right)
 * - Theme-aware styling
 * - Layout persistence
 *
 * @example
 * ```tsx
 * <ResizableUtilityPanel
 *   tabs={[
 *     {
 *       id: 'entities',
 *       label: 'Entities',
 *       icon: <Grid className="w-4 h-4" />,
 *       content: <EntityPalette />,
 *       headerContent: <span>{nodeCount} nodes</span>,
 *       headerActions: <Button size="sm">Filter</Button>
 *     },
 *     {
 *       id: 'settings',
 *       label: 'Settings',
 *       content: <SettingsPanel />
 *     }
 *   ]}
 *   position="bottom"
 *   layoutId="research-utility-panel"
 * />
 * ```
 */

"use client";

import React, { useState, useCallback } from "react";

import { Button } from "../../atoms/button";
import { Icon } from "../../atoms/icon";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../atoms/tabs";

export interface UtilityTab {
  /**
   * Unique identifier for the tab
   */
  id: string;

  /**
   * Display label for the tab
   */
  label: string;

  /**
   * Optional icon component for the tab
   */
  icon?: React.ReactNode;

  /**
   * Content to display in the tab panel
   */
  content: React.ReactNode;

  /**
   * Optional metadata/info to display in the header when tab is active
   * @example <span>{nodeCount} nodes, {edgeCount} edges</span>
   */
  headerContent?: React.ReactNode;

  /**
   * Optional action buttons/controls in the header when tab is active
   * @example <Button size="sm">Export</Button>
   */
  headerActions?: React.ReactNode;

  /**
   * Badge content (e.g., count) to show on tab
   */
  badge?: string | number;
}

export interface ResizableUtilityPanelProps {
  /**
   * Array of tabs to display
   */
  tabs: UtilityTab[];

  /**
   * Panel position
   * @default "bottom"
   */
  position?: "top" | "bottom" | "left" | "right";

  /**
   * Unique ID for persisting layout state in localStorage
   */
  layoutId: string;

  /**
   * Default panel size in pixels (for top/bottom) or percentage (for left/right)
   * @default 300 (for top/bottom), 25 (for left/right)
   */
  defaultSize?: number;

  /**
   * Minimum panel size
   * @default 200 (for top/bottom), 15 (for left/right)
   */
  minSize?: number;

  /**
   * Maximum panel size
   * @default 600 (for top/bottom), 50 (for left/right)
   */
  maxSize?: number;

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
   * Additional CSS classes for the panel container
   */
  className?: string;

  /**
   * Show resize handle
   * @default true
   */
  showResizeHandle?: boolean;

  /**
   * Custom title for the panel (shown before tabs)
   */
  title?: string;

  /**
   * Panel-level header actions (shown on right side of header)
   */
  headerActions?: React.ReactNode;
}

export function ResizableUtilityPanel({
  tabs,
  position = "bottom",
  layoutId,
  defaultSize,
  minSize,
  maxSize,
  collapsible = true,
  defaultCollapsed = false,
  defaultTab,
  onTabChange,
  onCollapseChange,
  className = "",
  showResizeHandle = true,
  title,
  headerActions,
}: ResizableUtilityPanelProps) {
  // Determine if horizontal or vertical layout
  const isHorizontal = position === "top" || position === "bottom";

  // Set size defaults based on orientation
  const actualDefaultSize = defaultSize ?? (isHorizontal ? 300 : 25);
  const actualMinSize = minSize ?? (isHorizontal ? 200 : 15);
  const actualMaxSize = maxSize ?? (isHorizontal ? 600 : 50);

  // State management
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [currentSize, setCurrentSize] = useState(actualDefaultSize);
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || "");
  const [isDragging, setIsDragging] = useState(false);

  // Get current active tab
  const currentTab = tabs.find((tab) => tab.id === activeTab);

  // Handle collapse toggle
  const handleCollapseToggle = useCallback(() => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapseChange?.(newState);

    // Save to localStorage
    try {
      localStorage.setItem(`${layoutId}-collapsed`, String(newState));
    } catch (e) {
      console.warn("Failed to save collapse state:", e);
    }
  }, [isCollapsed, onCollapseChange, layoutId]);

  // Handle tab change
  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      onTabChange?.(tabId);
    },
    [onTabChange]
  );

  // Restore state from localStorage on mount ONLY
  React.useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem(`${layoutId}-collapsed`);
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === "true");
      }

      const savedSize = localStorage.getItem(`${layoutId}-size`);
      if (savedSize !== null) {
        setCurrentSize(parseInt(savedSize));
      }

      const savedTab = localStorage.getItem(`${layoutId}-tab`);
      if (savedTab && tabs.some((t) => t.id === savedTab)) {
        setActiveTab(savedTab);
      }
    } catch (e) {
      console.warn("Failed to restore panel state:", e);
    }
  }, [layoutId]); // Only run on mount/layoutId change, NOT when tabs change

  // Save size to localStorage
  const saveSize = useCallback(
    (size: number) => {
      try {
        localStorage.setItem(`${layoutId}-size`, String(size));
      } catch (e) {
        console.warn("Failed to save panel size:", e);
      }
    },
    [layoutId]
  );

  // Save tab to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem(`${layoutId}-tab`, activeTab);
    } catch (e) {
      console.warn("Failed to save active tab:", e);
    }
  }, [activeTab, layoutId]);

  // Resize handling (simplified - can be enhanced with react-resizable-panels)
  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      let newSize: number;

      if (isHorizontal) {
        // Calculate height based on mouse position
        if (position === "bottom") {
          newSize = window.innerHeight - e.clientY;
        } else {
          newSize = e.clientY;
        }
      } else {
        // Calculate width based on mouse position
        if (position === "right") {
          newSize = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
        } else {
          newSize = (e.clientX / window.innerWidth) * 100;
        }
      }

      // Clamp to min/max
      newSize = Math.max(actualMinSize, Math.min(actualMaxSize, newSize));
      setCurrentSize(newSize);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      saveSize(currentSize);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    isHorizontal,
    position,
    actualMinSize,
    actualMaxSize,
    currentSize,
    saveSize,
  ]);

  // Position-specific styles
  const getPositionStyles = () => {
    const baseStyles = "absolute z-20 bg-card border-border";

    switch (position) {
      case "top":
        return `${baseStyles} top-0 left-0 right-0 border-b`;
      case "bottom":
        return `${baseStyles} bottom-0 left-0 right-0 border-t`;
      case "left":
        return `${baseStyles} top-0 bottom-0 left-0 border-r`;
      case "right":
        return `${baseStyles} top-0 bottom-0 right-0 border-l`;
    }
  };

  const getSizeStyles = () => {
    if (isCollapsed) {
      return isHorizontal ? { height: "auto" } : { width: "auto" };
    }

    if (isHorizontal) {
      return { height: `${currentSize}px` };
    } else {
      return { width: `${currentSize}%` };
    }
  };

  const getResizeHandleStyles = () => {
    const baseStyles =
      "absolute bg-border hover:bg-primary/50 transition-colors cursor-resize";

    switch (position) {
      case "top":
        return `${baseStyles} bottom-0 left-0 right-0 h-1 cursor-ns-resize`;
      case "bottom":
        return `${baseStyles} top-0 left-0 right-0 h-1 cursor-ns-resize`;
      case "left":
        return `${baseStyles} right-0 top-0 bottom-0 w-1 cursor-ew-resize`;
      case "right":
        return `${baseStyles} left-0 top-0 bottom-0 w-1 cursor-ew-resize`;
    }
  };

  // Collapse icon based on position
  const getCollapseIcon = () => {
    if (isCollapsed) {
      switch (position) {
        case "top":
          return <Icon name="chevron-down" size={16} />;
        case "bottom":
          return <Icon name="chevron-up" size={16} />;
        case "left":
          return <Icon name="chevron-right" size={16} />;
        case "right":
          return <Icon name="chevron-left" size={16} />;
      }
    } else {
      switch (position) {
        case "top":
          return <Icon name="chevron-up" size={16} />;
        case "bottom":
          return <Icon name="chevron-down" size={16} />;
        case "left":
          return <Icon name="chevron-left" size={16} />;
        case "right":
          return <Icon name="chevron-right" size={16} />;
      }
    }
  };

  if (isCollapsed) {
    // Collapsed state - show minimal header bar
    return (
      <div
        className={`${getPositionStyles()} ${className}`}
        style={{ height: "auto", width: "auto" }}
      >
        <div className="flex items-center justify-between px-4 py-2 bg-card/95 backdrop-blur">
          <div className="flex items-center gap-3">
            {title && (
              <span className="text-sm font-medium text-foreground">
                {title}
              </span>
            )}
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    handleTabChange(tab.id);
                    handleCollapseToggle();
                  }}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    tab.id === activeTab
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  title={tab.label}
                >
                  {tab.icon || tab.label.charAt(0)}
                  {tab.badge && (
                    <span className="ml-1 px-1 py-0.5 text-xs bg-primary/20 rounded">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCollapseToggle}
              className="h-7 w-7 p-0"
              title="Expand panel"
            >
              {getCollapseIcon()}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${getPositionStyles()} ${className}`}
      style={getSizeStyles()}
    >
      {/* Resize Handle */}
      {showResizeHandle && !isCollapsed && (
        <div
          className={getResizeHandleStyles()}
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Panel Content */}
      <div className="h-full flex flex-col overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Header with Tabs and Controls */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/95 backdrop-blur">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Optional Title */}
              {title && (
                <span className="text-sm font-medium text-foreground flex-shrink-0">
                  {title}
                </span>
              )}

              {/* Tab Triggers */}
              <TabsList className="h-8 bg-muted/50">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="text-xs h-7 gap-1.5 data-[state=active]:bg-background"
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.badge && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 rounded">
                        {tab.badge}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Current Tab Header Content */}
              {currentTab?.headerContent && (
                <div className="text-xs text-muted-foreground flex-shrink-0">
                  {currentTab.headerContent}
                </div>
              )}
            </div>

            {/* Right Side: Header Actions + Collapse */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Panel-Level Header Actions */}
              {headerActions && (
                <div className="flex items-center gap-2">{headerActions}</div>
              )}

              {/* Current Tab Header Actions */}
              {currentTab?.headerActions && (
                <div className="flex items-center gap-2">
                  {currentTab.headerActions}
                </div>
              )}

              {/* Collapse Button */}
              {collapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCollapseToggle}
                  className="h-7 w-7 p-0"
                  title={isCollapsed ? "Expand panel" : "Collapse panel"}
                >
                  {getCollapseIcon()}
                </Button>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {tabs.map((tab) => (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="h-full m-0 data-[state=inactive]:hidden"
              >
                <div className="h-full overflow-auto">{tab.content}</div>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
