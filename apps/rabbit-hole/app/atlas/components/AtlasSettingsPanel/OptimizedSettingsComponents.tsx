/**
 * Optimized Settings Components
 *
 * Performance-optimized versions with React.memo and selective re-rendering
 */

import React, { memo, useCallback } from "react";

import { EdgeOptimizationStatus } from "./EdgeOptimizationStatus";
import { LayoutSettings } from "./LayoutSettings";
import { withPerformanceMonitoring } from "./PerformanceMonitor";
import { ViewModeSettings } from "./ViewModeSettings";
import { ViewOptionsSettings } from "./ViewOptionsSettings";

// Memoized components that only re-render when their specific props change
export const OptimizedViewModeSettings = withPerformanceMonitoring(
  memo(ViewModeSettings, (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.onValueChange === nextProps.onValueChange
    );
  }),
  "ViewModeSettings"
);

export const OptimizedLayoutSettings = withPerformanceMonitoring(
  memo(LayoutSettings, (prevProps, nextProps) => {
    return (
      prevProps.layoutType === nextProps.layoutType &&
      prevProps.onLayoutTypeChange === nextProps.onLayoutTypeChange
    );
  }),
  "LayoutSettings"
);

export const OptimizedViewOptionsSettings = withPerformanceMonitoring(
  memo(ViewOptionsSettings, (prevProps, nextProps) => {
    return (
      prevProps.viewOptions.showLabels === nextProps.viewOptions.showLabels &&
      prevProps.viewOptions.highlightConnections ===
        nextProps.viewOptions.highlightConnections &&
      prevProps.viewOptions.showTimeline ===
        nextProps.viewOptions.showTimeline &&
      prevProps.onViewOptionsChange === nextProps.onViewOptionsChange
    );
  }),
  "ViewOptionsSettings"
);

export const OptimizedEdgeOptimizationStatus = withPerformanceMonitoring(
  memo(EdgeOptimizationStatus, (prevProps, nextProps) => {
    return (
      prevProps.viewMode === nextProps.viewMode &&
      prevProps.showLabels === nextProps.showLabels &&
      prevProps.edgeCount === nextProps.edgeCount
    );
  }),
  "EdgeOptimizationStatus"
);

// Compound component for static settings that rarely change
interface StaticSettingsProps {
  layoutType: "breadthfirst" | "force" | "atlas";
  onLayoutTypeChange: (type: "breadthfirst" | "force" | "atlas") => void;
  viewOptions: {
    showLabels: boolean;
    highlightConnections: boolean;
    showTimeline: boolean;
  };
  onViewOptionsChange: (options: any) => void;
  viewMode: string;
  showLabels: boolean;
  edgeCount: number;
}

export const StaticSettingsSection = memo(
  ({
    layoutType,
    onLayoutTypeChange,
    viewOptions,
    onViewOptionsChange,
    viewMode,
    showLabels,
    edgeCount,
  }: StaticSettingsProps) => {
    // Memoize callbacks to prevent child re-renders
    const memoizedLayoutChange = useCallback(
      (type: "breadthfirst" | "force" | "atlas") => onLayoutTypeChange(type),
      [onLayoutTypeChange]
    );

    const memoizedViewOptionsChange = useCallback(
      (options: any) => onViewOptionsChange(options),
      [onViewOptionsChange]
    );

    return (
      <>
        <OptimizedLayoutSettings
          layoutType={layoutType}
          onLayoutTypeChange={memoizedLayoutChange}
        />

        <OptimizedViewOptionsSettings
          viewOptions={viewOptions}
          onViewOptionsChange={memoizedViewOptionsChange}
        />

        <OptimizedEdgeOptimizationStatus
          viewMode={viewMode as any}
          showLabels={showLabels}
          edgeCount={edgeCount}
        />
      </>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for optimal re-rendering
    return (
      prevProps.layoutType === nextProps.layoutType &&
      prevProps.viewOptions.showLabels === nextProps.viewOptions.showLabels &&
      prevProps.viewOptions.highlightConnections ===
        nextProps.viewOptions.highlightConnections &&
      prevProps.viewOptions.showTimeline ===
        nextProps.viewOptions.showTimeline &&
      prevProps.viewMode === nextProps.viewMode &&
      prevProps.showLabels === nextProps.showLabels &&
      prevProps.edgeCount === nextProps.edgeCount &&
      prevProps.onLayoutTypeChange === nextProps.onLayoutTypeChange &&
      prevProps.onViewOptionsChange === nextProps.onViewOptionsChange
    );
  }
);

StaticSettingsSection.displayName = "StaticSettingsSection";

// Hook for optimized settings state management
export function useOptimizedSettingsState() {
  const [renderCount, setRenderCount] = React.useState(0);

  // Track render performance in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      setRenderCount((prev) => {
        const newCount = prev + 1;
        if (newCount > 10) {
          console.warn(
            "⚠️ Atlas Settings Panel has rendered",
            newCount,
            "times. Consider optimizing props or state."
          );
        }
        return newCount;
      });
    }
  }, []); // Added empty dependency array to run only once on mount

  return { renderCount };
}

// Debounced update hook for performance
export function useDebouncedSettingsUpdate<T>(
  value: T,
  onUpdate: (value: T) => void,
  delay = 150
) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (debouncedValue !== value) {
        onUpdate(debouncedValue);
      }
    }, delay);

    return () => clearTimeout(handler);
  }, [debouncedValue, onUpdate, delay, value]);

  const updateValue = useCallback((newValue: T) => {
    setDebouncedValue(newValue);
  }, []);

  return [debouncedValue, updateValue] as const;
}
