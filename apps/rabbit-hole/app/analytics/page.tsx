/**
 * Analytics Dashboard Page - TEMPORARILY DISABLED
 *
 * TODO: Re-enable when Clerk configuration is stable
 * See: handoffs/2025-10-11_YOUTUBE_ROUTES_DISABLED.md
 */

"use client";

export default function AnalyticsPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-4">
          Analytics Temporarily Disabled
        </h1>
        <p className="text-muted-foreground mb-2">
          Multi-entity analytics feature is under development
        </p>
        <p className="text-sm text-muted-foreground">
          This feature will be re-enabled in a future update
        </p>
      </div>
    </div>
  );
}

/* DISABLED CODE - PRESERVED FOR RE-ENABLING
import React from "react";
import { Icon } from "@proto/icon-system";
import { Badge } from "@proto/ui/atoms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@proto/ui/atoms";
import { AnalyticsFilters } from "./components/AnalyticsFilters";
import { AnalyticsShareButton } from "./components/AnalyticsShareButton";
import { ChartSelector } from "./components/ChartSelector";
import { EntitySelector } from "./components/EntitySelector";
import { MultiEntityChart } from "./components/MultiEntityChart";
import { useAnalyticsPageState } from "./hooks/useAnalyticsPageState";
import { useMultiEntityAnalytics } from "./hooks/useMultiEntityAnalytics";

export default function AnalyticsComparisonPage() {
  const {
    entities,
    chartConfig,
    filters,
    timeWindow,
    setEntities,
    setChartConfig,
    updateFilters,
    resetFilters,
    updateTimeWindow,
    hasEntities,
    isComparable,
    generateShareableUrl,
  } = useAnalyticsPageState();

  const {
    data,
    loading,
    error,
    refetch,
    aggregatedStats,
    hasData,
  } = useMultiEntityAnalytics({
    entities,
    chartConfig,
    filters,
    timeWindow,
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Multi-Entity Analytics</h1>
              <p className="text-muted-foreground mt-1">
                Compare and analyze multiple entities across different chart types
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasEntities && <AnalyticsShareButton url={generateShareableUrl()} />}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1 space-y-6">
            <EntitySelector
              entities={entities}
              onChange={setEntities}
              onClear={() => setEntities([])}
            />

            <ChartSelector
              config={chartConfig}
              onChange={setChartConfig}
            />

            <AnalyticsFilters
              filters={filters}
              timeWindow={timeWindow}
              onFilterChange={updateFilters}
              onTimeWindowChange={updateTimeWindow}
              onReset={resetFilters}
            />
          </aside>

          <div className="lg:col-span-3">
            {!hasEntities ? (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="line-chart" size={24} />
                    Get Started
                  </CardTitle>
                  <CardDescription>
                    Select entities from the sidebar to begin your analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">1</Badge>
                      <span>Choose entities to analyze from the Entity Selector</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">2</Badge>
                      <span>Pick a chart type (timeline, bar, pie, network, etc.)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">3</Badge>
                      <span>Apply filters and time windows to refine your view</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">4</Badge>
                      <span>Share your analysis with a shareable link</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Icon name={chartConfig.icon} size={24} />
                        {chartConfig.label}
                      </CardTitle>
                      <CardDescription>
                        {entities.length} {entities.length === 1 ? "entity" : "entities"} selected
                      </CardDescription>
                    </div>
                    {aggregatedStats && (
                      <div className="flex gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-bold">{aggregatedStats.totalEvents}</div>
                          <div className="text-muted-foreground">Total Events</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold">{aggregatedStats.dateRange.start} - {aggregatedStats.dateRange.end}</div>
                          <div className="text-muted-foreground">Date Range</div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="p-16 text-center">
                      <Icon
                        name="line-chart"
                        size={32}
                        className="text-blue-500 mx-auto mb-4 animate-spin"
                      />
                      <p className="text-gray-600">Loading analytics data...</p>
                    </div>
                  ) : error ? (
                    <div className="p-16 text-center">
                      <Icon
                        name="alert-circle"
                        size={32}
                        className="text-red-500 mx-auto mb-4"
                      />
                      <p className="text-red-600 font-semibold mb-2">Error loading data</p>
                      <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
                      <button
                        onClick={() => refetch()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : !hasData ? (
                    <div className="p-16 text-center">
                      <Icon
                        name="bar-chart-3"
                        size={32}
                        className="text-gray-400 mx-auto mb-4"
                      />
                      <p className="text-gray-600 mb-2">No data available</p>
                      <p className="text-sm text-muted-foreground">
                        Try adjusting your filters or time window
                      </p>
                    </div>
                  ) : (
                    <Suspense fallback={<div>Loading chart...</div>}>
                      <MultiEntityChart
                        data={data}
                        entities={entities}
                        chartConfig={chartConfig}
                        filters={filters}
                        timeWindow={timeWindow}
                      />
                    </Suspense>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
END DISABLED CODE */
