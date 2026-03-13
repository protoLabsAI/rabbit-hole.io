/**
 * Lazy-loaded Settings Components
 *
 * Performance-optimized versions of settings components with lazy loading
 */

import React, { Suspense, memo, useMemo, useCallback } from "react";

import type { ViewMode } from "@proto/utils/atlas";

import { withPerformanceMonitoring } from "./PerformanceMonitor";

// Simple skeleton component for loading states
const Skeleton = ({ className = "" }: { className?: string }) => (
  <div
    className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`}
  />
);

// Lazy imports for settings components
const EgoNetworkSettings = React.lazy(() =>
  import("./EgoNetworkSettings").then((module) => ({
    default: module.EgoNetworkSettings,
  }))
);

const CommunitySettings = React.lazy(() =>
  import("./CommunitySettings").then((module) => ({
    default: module.CommunitySettings,
  }))
);

const TimeSliceSettings = React.lazy(() =>
  import("./TimeSliceSettings").then((module) => ({
    default: module.TimeSliceSettings,
  }))
);

// Performance-optimized versions with React.memo
const OptimizedEgoNetworkSettings = withPerformanceMonitoring(
  memo(EgoNetworkSettings),
  "EgoNetworkSettings"
);

const OptimizedCommunitySettings = withPerformanceMonitoring(
  memo(CommunitySettings),
  "CommunitySettings"
);

const OptimizedTimeSliceSettings = withPerformanceMonitoring(
  memo(TimeSliceSettings),
  "TimeSliceSettings"
);

// Loading skeleton components
const SettingsLoadingSkeleton = () => (
  <div className="space-y-3 p-4">
    <Skeleton className="h-4 w-32" />
    <div className="space-y-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
    <div className="flex space-x-2">
      <Skeleton className="h-8 flex-1" />
      <Skeleton className="h-8 flex-1" />
    </div>
  </div>
);

// Props interfaces (re-exported from main components)
interface EgoNetworkSettingsProps {
  egoSettings: any;
  onEgoSettingsChange: (settings: any) => void;
  existingEntities: Array<{ id: string; label: string; entityType: string }>;
  onCenterEntitySelect: (entityId: string | null, entityLabel?: string) => void;
  className?: string;
}

interface CommunitySettingsProps {
  communityId: number | null;
  onCommunityIdChange: (id: number | null) => void;
  className?: string;
}

interface TimeSliceSettingsProps {
  timeWindow: { from: string; to: string };
  onTimeWindowChange: (window: Partial<{ from: string; to: string }>) => void;
  className?: string;
}

// Lazy wrapper components with suspense boundaries
export const LazyEgoNetworkSettings = memo(
  ({ onEgoSettingsChange, ...props }: EgoNetworkSettingsProps) => {
    // Memoize callback to prevent unnecessary re-renders
    const memoizedOnChange = useCallback(
      (settings: any) => onEgoSettingsChange(settings),
      [onEgoSettingsChange]
    );

    return (
      <Suspense fallback={<SettingsLoadingSkeleton />}>
        <OptimizedEgoNetworkSettings
          {...props}
          onEgoSettingsChange={memoizedOnChange}
        />
      </Suspense>
    );
  }
);

export const LazyCommunitySettings = memo(
  ({ onCommunityIdChange, ...props }: CommunitySettingsProps) => {
    const memoizedOnChange = useCallback(
      (id: number | null) => onCommunityIdChange(id),
      [onCommunityIdChange]
    );

    return (
      <Suspense fallback={<SettingsLoadingSkeleton />}>
        <OptimizedCommunitySettings
          {...props}
          onCommunityIdChange={memoizedOnChange}
        />
      </Suspense>
    );
  }
);

export const LazyTimeSliceSettings = memo(
  ({ onTimeWindowChange, ...props }: TimeSliceSettingsProps) => {
    const memoizedOnChange = useCallback(
      (window: Partial<{ from: string; to: string }>) =>
        onTimeWindowChange(window),
      [onTimeWindowChange]
    );

    return (
      <Suspense fallback={<SettingsLoadingSkeleton />}>
        <OptimizedTimeSliceSettings
          {...props}
          onTimeWindowChange={memoizedOnChange}
        />
      </Suspense>
    );
  }
);

// View mode component selector with memoization
interface LazySettingsSectionProps {
  viewMode: ViewMode;
  egoNetworkProps?: EgoNetworkSettingsProps;
  communityProps?: CommunitySettingsProps;
  timeSliceProps?: TimeSliceSettingsProps;
}

export const LazySettingsSection = memo(
  ({
    viewMode,
    egoNetworkProps,
    communityProps,
    timeSliceProps,
  }: LazySettingsSectionProps) => {
    // Only render the component for the active view mode
    const activeComponent = useMemo(() => {
      switch (viewMode) {
        case "ego":
          return egoNetworkProps ? (
            <LazyEgoNetworkSettings {...egoNetworkProps} />
          ) : null;
        case "community":
          return communityProps ? (
            <LazyCommunitySettings {...communityProps} />
          ) : null;
        case "timeslice":
          return timeSliceProps ? (
            <LazyTimeSliceSettings {...timeSliceProps} />
          ) : null;
        default:
          return null;
      }
    }, [viewMode, egoNetworkProps, communityProps, timeSliceProps]);

    return <>{activeComponent}</>;
  }
);

// Display names for debugging
LazyEgoNetworkSettings.displayName = "LazyEgoNetworkSettings";
LazyCommunitySettings.displayName = "LazyCommunitySettings";
LazyTimeSliceSettings.displayName = "LazyTimeSliceSettings";
LazySettingsSection.displayName = "LazySettingsSection";
