"use client";

/**
 * Utility Panel
 *
 * Canvas-aware bottom panel with tabs.
 * - Universal tabs: Always available (Help, Shortcuts, etc.)
 * - Canvas tabs: Injected per canvas type
 *
 * NOTE: This component is now designed to be used INSIDE a ResizablePanel.
 * The parent ResizablePanel handles sizing/collapsing, this just renders content.
 */

import React, { useState, useCallback, useEffect, useMemo } from "react";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@protolabsai/ui/atoms";
import type { UtilityTab } from "@protolabsai/ui/templates";

interface UtilityPanelProps {
  universalTabs?: UtilityTab[];
  canvasTabs?: UtilityTab[];
  layoutId: string;
}

const EMPTY_TABS: UtilityTab[] = [];

export function UtilityPanel({
  universalTabs = EMPTY_TABS,
  canvasTabs = EMPTY_TABS,
  layoutId,
}: UtilityPanelProps) {
  // Combine universal and canvas-specific tabs (memoized to prevent unnecessary effect re-runs)
  const allTabs = useMemo(
    () => [...canvasTabs, ...universalTabs],
    [canvasTabs, universalTabs]
  );

  // Initialize to empty string to prevent hydration mismatch
  // Effect below will set correct tab after mount
  const [activeTab, setActiveTab] = useState("");

  // Get current active tab
  const currentTab = allTabs.find((tab) => tab.id === activeTab);

  // Restore active tab from localStorage on mount only
  useEffect(() => {
    if (allTabs.length === 0) return;

    try {
      const savedTab = localStorage.getItem(`${layoutId}-tab`);
      if (savedTab) {
        setActiveTab(savedTab);
        return;
      }
    } catch {
      // localStorage unavailable
    }

    setActiveTab(allTabs[0].id);
  }, [layoutId]);

  // Save tab to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(`${layoutId}-tab`, activeTab);
    } catch (e) {
      console.warn("Failed to save active tab:", e);
    }
  }, [activeTab, layoutId]);

  // Handle tab change
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  if (allTabs.length === 0) {
    return null;
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-card border-t border-border">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col overflow-hidden"
      >
        {/* Header with Tabs and Controls */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Tab Triggers */}
            <TabsList className="h-8 bg-muted/50">
              {allTabs.map((tab) => (
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

          {/* Right Side: Header Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Current Tab Header Actions */}
            {currentTab?.headerActions && (
              <div className="flex items-center gap-2">
                {currentTab.headerActions}
              </div>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {allTabs.map((tab) => (
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
  );
}
