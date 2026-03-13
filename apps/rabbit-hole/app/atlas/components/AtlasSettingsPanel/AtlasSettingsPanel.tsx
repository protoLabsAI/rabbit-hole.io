/**
 * Atlas Settings Panel - Main Component
 *
 * Performance-optimized responsive settings panel with lazy loading
 */

"use client";

import React, { memo, useMemo, useCallback } from "react";

import {
  Card,
  CardContent,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@proto/ui/atoms";
import type { ViewMode } from "@proto/utils/atlas";

import { cn } from "@/lib/utils";

import { LazySettingsSection } from "./LazySettingsComponents";
import {
  OptimizedViewModeSettings,
  StaticSettingsSection,
  useOptimizedSettingsState,
} from "./OptimizedSettingsComponents";
import { usePerformanceMonitor } from "./PerformanceMonitor";
import { PreferencesSettings } from "./PreferencesSettings";
import { SettingsHeader } from "./SettingsHeader";
import { useAtlasPreferences } from "./useAtlasPreferences";
import { useAtlasSettings } from "./useAtlasSettings";

interface AtlasSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  showPreferences?: boolean;

  // Current state values
  viewMode: ViewMode;
  centerEntity: string | null;
  communityId: number | null;
  timeWindow: { from: string; to: string };
  egoSettings: { hops: number; nodeLimit: number; centerEntity?: string };
  layoutType: "breadthfirst" | "force" | "atlas";
  showLabels: boolean;
  highlightConnections: boolean;
  showTimeline: boolean;
  edgeCount: number;

  // State setters
  onViewModeChange: (mode: ViewMode) => void;
  onCenterEntityChange: (entityId: string | null, entityLabel?: string) => void;
  onCommunityIdChange: (id: number | null) => void;
  onTimeWindowChange: (window: { from: string; to: string }) => void;
  onEgoSettingsChange: (settings: {
    hops: number;
    nodeLimit: number;
    centerEntity?: string;
  }) => void;
  onLayoutTypeChange: (type: "breadthfirst" | "force" | "atlas") => void;
  onShowLabelsChange: (show: boolean) => void;
  onHighlightConnectionsChange: (highlight: boolean) => void;
  onShowTimelineChange: (show: boolean) => void;

  // Entity data for dropdowns
  existingEntities: Array<{ id: string; label: string; entityType: string }>;
}

export const AtlasSettingsPanel = memo(function AtlasSettingsPanel({
  isOpen,
  onClose,
  position = "bottom-right",
  showPreferences = false,
  viewMode,
  centerEntity,
  communityId,
  timeWindow,
  egoSettings,
  layoutType,
  showLabels,
  highlightConnections,
  showTimeline,
  edgeCount,
  onViewModeChange,
  onCenterEntityChange,
  onCommunityIdChange,
  onTimeWindowChange,
  onEgoSettingsChange,
  onLayoutTypeChange,
  onShowLabelsChange,
  onHighlightConnectionsChange,
  onShowTimelineChange,
  existingEntities,
}: AtlasSettingsPanelProps) {
  // Performance monitoring
  const { measureRender } = usePerformanceMonitor();
  const { renderCount } = useOptimizedSettingsState();

  // User preferences management
  const {
    preferences,
    isLoading: preferencesLoading,
    updatePreferences,
    resetPreferences,
  } = useAtlasPreferences();

  // Settings state management hook with memoized handlers
  const { handlers } = useAtlasSettings({
    viewMode,
    egoSettings: {
      ...egoSettings,
      sentiments: null, // Add required field
    },
    timeWindow,
    communityId,
    layoutType,
    showLabels,
    highlightConnections,
    showTimeline,
    onViewModeChange,
    onEgoSettingsChange: (settings) => onEgoSettingsChange(settings),
    onTimeWindowChange,
    onCommunityIdChange,
    onLayoutTypeChange,
    onShowLabelsChange,
    onHighlightConnectionsChange,
    onShowTimelineChange,
  });

  // Memoized position classes to prevent unnecessary recalculations
  const positionClasses = useMemo(() => {
    switch (position) {
      case "top-left":
        return "top-20 left-4";
      case "top-right":
        return "top-20 right-4";
      case "bottom-left":
        return "bottom-20 left-4";
      case "bottom-right":
      default:
        return "bottom-20 right-4";
    }
  }, [position]);

  // Memoized props for lazy components to prevent unnecessary re-renders
  const lazyComponentProps = useMemo(() => {
    return {
      ego:
        viewMode === "ego"
          ? {
              egoSettings: {
                ...egoSettings,
                sentiments: null,
              },
              onEgoSettingsChange: handlers.handleEgoSettingsChange,
              existingEntities,
              onCenterEntitySelect: onCenterEntityChange,
            }
          : undefined,
      community:
        viewMode === "community"
          ? {
              communityId,
              onCommunityIdChange: handlers.handleCommunityIdChange,
            }
          : undefined,
      timeslice:
        viewMode === "timeslice"
          ? {
              timeWindow,
              onTimeWindowChange: handlers.handleTimeWindowChange,
            }
          : undefined,
    };
  }, [
    viewMode,
    egoSettings,
    communityId,
    timeWindow,
    handlers.handleEgoSettingsChange,
    handlers.handleCommunityIdChange,
    handlers.handleTimeWindowChange,
    existingEntities,
    onCenterEntityChange,
  ]);

  // Memoized static settings props
  const staticSettingsProps = useMemo(
    () => ({
      layoutType,
      onLayoutTypeChange: handlers.handleLayoutTypeChange,
      viewOptions: {
        showLabels,
        highlightConnections,
        showTimeline,
      },
      onViewOptionsChange: handlers.handleViewOptionsChange,
      viewMode,
      showLabels,
      edgeCount,
    }),
    [
      layoutType,
      showLabels,
      highlightConnections,
      showTimeline,
      viewMode,
      edgeCount,
      handlers.handleLayoutTypeChange,
      handlers.handleViewOptionsChange,
    ]
  );

  // Performance monitoring for renders
  React.useEffect(() => {
    measureRender("AtlasSettingsPanel", {
      isOpen,
      viewMode,
      renderCount,
    });
  });

  // Memoized settings content to prevent unnecessary re-renders
  const SettingsContent = useCallback(
    () => (
      <div className="space-y-4">
        {/* Preferences Settings - only show when requested */}
        {showPreferences && (
          <PreferencesSettings
            preferences={preferences}
            onPreferencesChange={updatePreferences}
            onResetPreferences={resetPreferences}
          />
        )}

        {!showPreferences && (
          <>
            {/* View Mode Selection - always visible */}
            <OptimizedViewModeSettings
              value={viewMode}
              onValueChange={handlers.handleViewModeChange}
            />

            {/* Lazy-loaded view-mode-specific settings */}
            <LazySettingsSection
              viewMode={viewMode}
              egoNetworkProps={lazyComponentProps.ego}
              communityProps={lazyComponentProps.community}
              timeSliceProps={lazyComponentProps.timeslice}
            />

            {/* Static settings that rarely change */}
            <StaticSettingsSection {...staticSettingsProps} />
          </>
        )}
      </div>
    ),
    [
      showPreferences,
      preferences,
      updatePreferences,
      resetPreferences,
      viewMode,
      handlers.handleViewModeChange,
      lazyComponentProps,
      staticSettingsProps,
    ]
  );

  return (
    <>
      {/* Mobile: Sheet/Drawer */}
      <div className="sm:hidden">
        <Sheet open={isOpen} onOpenChange={onClose}>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Graph Settings</SheetTitle>
            </SheetHeader>
            <div className="mt-4 overflow-y-auto">
              <SettingsContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Floating Panel */}
      <div className="hidden sm:block">
        {isOpen && (
          <>
            {/* Click outside to close backdrop */}
            <div
              className="fixed inset-0 z-15 bg-transparent"
              onClick={onClose}
            />

            {/* Settings Panel */}
            <div className={cn("absolute z-20", positionClasses)}>
              <Card className="bg-background/95 border-border shadow-xl w-72">
                <CardContent className="p-5">
                  <SettingsHeader onClose={onClose} />
                  <SettingsContent />
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  );
});
