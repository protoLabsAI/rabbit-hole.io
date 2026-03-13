"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { Icon } from "@proto/icon-system";

export default function TimelineRedirectClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Build analytics URL with timeline configuration
    const analyticsParams = new URLSearchParams();

    // Copy existing timeline parameters
    for (const [key, value] of searchParams.entries()) {
      if (key === "entities") {
        analyticsParams.set("entities", value);
      } else if (key === "timeWindow") {
        analyticsParams.set("timeWindow", value);
      } else if (key === "filters" || key === "timelineFilters") {
        analyticsParams.set("filters", value);
      } else if (key === "viewMode") {
        // Map legacy viewMode to chart config
        const chartConfig = {
          type: "timeline",
          dataSource: "timeline",
          aggregation: "none",
          viewMode: value,
        };
        analyticsParams.set("chartConfig", JSON.stringify(chartConfig));
      }
    }

    // Set default timeline configuration if no config exists
    if (!analyticsParams.has("chartConfig")) {
      const defaultConfig = {
        type: "timeline",
        dataSource: "timeline",
        aggregation: "none",
        viewMode: "comparison",
      };
      analyticsParams.set("chartConfig", JSON.stringify(defaultConfig));
    }

    // Redirect to analytics page
    const analyticsUrl = `/analytics?${analyticsParams.toString()}`;
    router.replace(analyticsUrl);
  }, [router, searchParams]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <Icon
          name="clock"
          size={32}
          className="text-blue-500 mx-auto mb-4 animate-spin"
        />
        <h1 className="text-xl font-semibold text-gray-700 mb-2">
          Redirecting to Analytics
        </h1>
        <p className="text-gray-500">
          Timeline functionality has moved to our new analytics platform
        </p>
      </div>
    </div>
  );
}
