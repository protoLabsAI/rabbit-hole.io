/**
 * Atlas Settings Panel - Settings State Hook
 *
 * Centralized hook for managing all settings panel state with form validation
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback } from "react";
import { useForm } from "react-hook-form";

import {
  atlasSettingsSchema,
  type AtlasSettings,
  type EgoSettings,
  type TimeWindow,
  type ViewOptions,
} from "./AtlasSettingsSchemas";

interface UseAtlasSettingsProps {
  // Current values from nuqs/URL state
  viewMode: "full-atlas" | "ego" | "community" | "timeslice";
  egoSettings: EgoSettings;
  timeWindow: TimeWindow;
  communityId: number | null;
  layoutType: "breadthfirst" | "force" | "atlas";
  showLabels: boolean;
  highlightConnections: boolean;
  showTimeline: boolean;

  // Setters from nuqs/URL state
  onViewModeChange: (
    mode: "full-atlas" | "ego" | "community" | "timeslice"
  ) => void;
  onEgoSettingsChange: (settings: EgoSettings) => void;
  onTimeWindowChange: (window: TimeWindow) => void;
  onCommunityIdChange: (id: number | null) => void;
  onLayoutTypeChange: (type: "breadthfirst" | "force" | "atlas") => void;
  onShowLabelsChange: (show: boolean) => void;
  onHighlightConnectionsChange: (highlight: boolean) => void;
  onShowTimelineChange: (show: boolean) => void;
}

export function useAtlasSettings(props: UseAtlasSettingsProps) {
  // Form setup with Zod validation
  const form = useForm<AtlasSettings>({
    // Type cast required: Zod 4.x has breaking type changes that are incompatible with @hookform/resolvers@^3.10.0
    // Runtime behavior is correct, but TypeScript types don't align. Official support pending.
    // See: https://github.com/react-hook-form/resolvers/issues/705
    resolver: zodResolver(atlasSettingsSchema as any),
    defaultValues: {
      viewMode: props.viewMode,
      egoSettings: props.egoSettings,
      timeWindow: props.timeWindow,
      communitySettings: {
        communityId: props.communityId,
      },
      layoutSettings: {
        layoutType: props.layoutType,
      },
      viewOptions: {
        showLabels: props.showLabels,
        highlightConnections: props.highlightConnections,
        showTimeline: props.showTimeline,
      },
    },
  });

  // Note: We don't sync form values back from props to avoid infinite loops.
  // The form is controlled by user interactions which directly call the prop handlers.

  // Handlers for individual setting changes
  const handleViewModeChange = useCallback(
    (value: string) => {
      const mode = value as "full-atlas" | "ego" | "community" | "timeslice";
      form.setValue("viewMode", mode);
      props.onViewModeChange(mode);
    },
    [form, props]
  );

  const handleEgoSettingsChange = useCallback(
    (settings: Partial<EgoSettings>) => {
      const newSettings = { ...props.egoSettings, ...settings };
      form.setValue("egoSettings", newSettings);
      props.onEgoSettingsChange(newSettings);
    },
    [form, props]
  );

  const handleTimeWindowChange = useCallback(
    (window: Partial<TimeWindow>) => {
      const newWindow = { ...props.timeWindow, ...window };
      form.setValue("timeWindow", newWindow);
      props.onTimeWindowChange(newWindow);
    },
    [form, props]
  );

  const handleCommunityIdChange = useCallback(
    (id: number | null) => {
      form.setValue("communitySettings.communityId", id);
      props.onCommunityIdChange(id);
    },
    [form, props]
  );

  const handleLayoutTypeChange = useCallback(
    (type: "breadthfirst" | "force" | "atlas") => {
      form.setValue("layoutSettings.layoutType", type);
      props.onLayoutTypeChange(type);
    },
    [form, props]
  );

  const handleViewOptionsChange = useCallback(
    (options: Partial<ViewOptions>) => {
      const newOptions = {
        showLabels: props.showLabels,
        highlightConnections: props.highlightConnections,
        showTimeline: props.showTimeline,
        ...options,
      };

      form.setValue("viewOptions", newOptions);

      // Call individual handlers
      if (options.showLabels !== undefined) {
        props.onShowLabelsChange(options.showLabels);
      }
      if (options.highlightConnections !== undefined) {
        props.onHighlightConnectionsChange(options.highlightConnections);
      }
      if (options.showTimeline !== undefined) {
        props.onShowTimelineChange(options.showTimeline);
      }
    },
    [form, props]
  );

  return {
    form,
    handlers: {
      handleViewModeChange,
      handleEgoSettingsChange,
      handleTimeWindowChange,
      handleCommunityIdChange,
      handleLayoutTypeChange,
      handleViewOptionsChange,
    },
  };
}
