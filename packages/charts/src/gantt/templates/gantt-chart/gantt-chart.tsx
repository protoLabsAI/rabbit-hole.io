"use client";

import type { FC } from "react";

import { GanttMarker, GanttToday } from "../../atoms";
import { cn } from "../../lib/utils";
import { GanttHeader, GanttSidebarItem } from "../../molecules";
import {
  GanttSidebar,
  GanttSidebarGroup,
  GanttTimeline,
  GanttFeatureList,
  GanttFeatureRow,
} from "../../organisms";
import type { GanttFeature, GanttMarkerProps, Range } from "../../types";
import { GanttProvider } from "../gantt-provider";

export type GanttChartGroup = {
  name: string;
  features: GanttFeature[];
};

export type GanttChartProps = {
  features?: GanttFeature[];
  groups?: GanttChartGroup[];
  markers?: GanttMarkerProps[];
  range?: Range;
  zoom?: number;
  readOnly?: boolean;
  showToday?: boolean;
  onFeatureMove?: (id: string, startAt: Date, endAt: Date | null) => void;
  onFeatureClick?: (feature: GanttFeature) => void;
  onAddItem?: (date: Date) => void;
  className?: string;
};

export const GanttChart: FC<GanttChartProps> = ({
  features = [],
  groups = [],
  markers = [],
  range = "monthly",
  zoom = 100,
  readOnly = false,
  showToday = true,
  onFeatureMove,
  onFeatureClick,
  onAddItem,
  className,
}) => {
  const hasGroups = groups.length > 0;
  const displayFeatures = hasGroups ? [] : features;

  return (
    <GanttProvider
      range={range}
      zoom={zoom}
      onAddItem={readOnly ? undefined : onAddItem}
      className={className}
    >
      {/* Sidebar */}
      <GanttSidebar
        className={cn(hasGroups || displayFeatures.length > 0 ? "" : "hidden")}
      >
        {hasGroups
          ? groups.map((group) => (
              <GanttSidebarGroup key={group.name} name={group.name}>
                {group.features.map((feature) => (
                  <GanttSidebarItem
                    key={feature.id}
                    feature={feature}
                    onSelectItem={
                      onFeatureClick ? () => onFeatureClick(feature) : undefined
                    }
                  />
                ))}
              </GanttSidebarGroup>
            ))
          : displayFeatures.map((feature) => (
              <GanttSidebarItem
                key={feature.id}
                feature={feature}
                onSelectItem={
                  onFeatureClick ? () => onFeatureClick(feature) : undefined
                }
              />
            ))}
      </GanttSidebar>

      {/* Timeline */}
      <GanttTimeline>
        <GanttHeader />

        <GanttFeatureList>
          {hasGroups ? (
            groups.map((group) => (
              <GanttFeatureRow
                key={group.name}
                features={group.features}
                onMove={readOnly ? undefined : onFeatureMove}
              />
            ))
          ) : (
            <GanttFeatureRow
              features={displayFeatures}
              onMove={readOnly ? undefined : onFeatureMove}
            />
          )}
        </GanttFeatureList>

        {/* Markers */}
        {markers.map((marker) => (
          <GanttMarker key={marker.id} {...marker} />
        ))}

        {/* Today indicator */}
        {showToday && <GanttToday />}
      </GanttTimeline>
    </GanttProvider>
  );
};
