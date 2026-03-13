/**
 * Analytics Share Page - Server-Side Rendered
 *
 * Server-side rendered page for publicly accessible analytics shares
 * with multi-entity chart visualization and dynamic meta tags.
 */

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import {
  ShareTokenExpiredError,
  ShareTokenRevokedError,
  ShareTokenNotFoundError,
  type SharePageData,
} from "@proto/types";

import {
  ShareAnalyticsVisualization,
  ShareAnalyticsHeader,
  SharePageFooter,
  ExpiredTokenError,
  RevokedTokenError,
} from "@/components/share";
import { fetchAnalyticsShareData } from "@/lib/analytics-share-fetcher";
import { ShareTokenService } from "@/lib/share-token-service";

// ==================== Types ====================

interface ShareAnalyticsPageProps {
  params: Promise<{
    token: string;
  }>;
}

interface ChartConfiguration {
  type: "timeline" | "bar" | "line" | "pie" | "scatter" | "network" | "heatmap";
  dataSource:
    | "timeline"
    | "speechActs"
    | "relationships"
    | "biographical"
    | "activity"
    | "metrics";
  aggregation: "none" | "daily" | "weekly" | "monthly" | "yearly";
  viewMode: "comparison" | "merged" | "side-by-side" | "overlay";
}

interface AnalyticsFilters {
  categories?: string[];
  importance?: string[];
  eventTypes?: string[];
  tags?: string[];
  sentiments?: string[];
  metrics?: string[];
}

interface TimeWindow {
  from: string;
  to: string;
}

// ==================== Helper Functions ====================

function formatEntityName(entityUid: string): string {
  const parts = entityUid.split(":");
  if (parts.length >= 2) {
    return parts[1]
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return entityUid;
}

function getChartTypeLabel(chartType: string): string {
  const labels = {
    timeline: "Timeline",
    bar: "Bar Chart",
    line: "Line Chart",
    pie: "Pie Chart",
    scatter: "Scatter Plot",
    network: "Network Graph",
    heatmap: "Heatmap",
  };
  return labels[chartType as keyof typeof labels] || chartType;
}

function getDataSourceLabel(dataSource: string): string {
  const labels = {
    timeline: "Timeline Events",
    speechActs: "Speech Analysis",
    relationships: "Relationships",
    biographical: "Biography",
    activity: "Activity Patterns",
    metrics: "Entity Metrics",
  };
  return labels[dataSource as keyof typeof labels] || dataSource;
}

// ==================== Metadata Generation ====================

export async function generateMetadata({
  params,
}: ShareAnalyticsPageProps): Promise<Metadata> {
  try {
    const { token } = await params;
    const shareTokenService = new ShareTokenService();
    const shareToken = await shareTokenService.validateShareToken(token);

    // Redirect if not an analytics share
    if (shareToken.shareType !== "analytics") {
      return {
        title: "Redirecting...",
        description: "Redirecting to appropriate share page",
      };
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://rabbit-hole.io";
    const shareUrl = `${baseUrl}/share/${token}/analytics`;
    const previewUrl = `${baseUrl}/api/share/${token}/preview.png`;

    // Extract analytics configuration
    const entities = shareToken.parameters.entities || [shareToken.entityUid];
    const chartConfig = shareToken.parameters.chartConfig as ChartConfiguration;

    const entityNames = entities.slice(0, 3).map(formatEntityName);
    const entitySummary =
      entities.length > 3
        ? `${entityNames.join(", ")} and ${entities.length - 3} others`
        : entityNames.join(", ");

    const title =
      shareToken.title ||
      `${entities.length > 1 ? "Multi-Entity" : ""} ${getChartTypeLabel(chartConfig?.type || "timeline")} Analysis`;

    const description =
      shareToken.description ||
      `Interactive ${getChartTypeLabel(chartConfig?.type || "timeline").toLowerCase()} analysis of ${entitySummary} using ${getDataSourceLabel(chartConfig?.dataSource || "timeline").toLowerCase()} data. Explore patterns, relationships, and insights.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: shareUrl,
        type: "website",
        siteName: "Rabbit Hole Analytics",
        images: [
          {
            url: previewUrl,
            width: 1200,
            height: 630,
            alt: `${title} - Analytics Visualization`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [previewUrl],
      },
    };
  } catch {
    return {
      title: "Analytics Share",
      description: "Multi-entity analytics visualization",
    };
  }
}

// ==================== Page Component ====================

export default async function ShareAnalyticsPage({
  params,
}: ShareAnalyticsPageProps) {
  try {
    const { token } = await params;
    const shareTokenService = new ShareTokenService();

    // Validate token and get share data
    const shareToken = await shareTokenService.validateShareToken(token);

    // Redirect if not an analytics share
    if (shareToken.shareType !== "analytics") {
      redirect(`/share/${token}`);
    }

    // Increment view count (fire and forget)
    shareTokenService.incrementViewCount(token).catch(console.error);

    // Extract analytics configuration
    const entities = shareToken.parameters.entities || [shareToken.entityUid];
    const chartConfig = shareToken.parameters.chartConfig as ChartConfiguration;
    const filtersParam =
      (shareToken.parameters.filters as AnalyticsFilters) || {};
    const filters = {
      categories: filtersParam.categories || [],
      importance: filtersParam.importance || [],
      eventTypes: filtersParam.eventTypes || [],
      tags: filtersParam.tags || [],
      sentiments: filtersParam.sentiments || [],
      metrics: filtersParam.metrics || [],
    };
    const timeWindow = (shareToken.parameters.timeWindow as TimeWindow) || {
      from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 1 year ago
      to: new Date().toISOString().split("T")[0],
    };

    const shareData: SharePageData = {
      token: shareToken.token,
      entityUid: shareToken.entityUid,
      shareType: shareToken.shareType,
      parameters: shareToken.parameters,
      title: shareToken.title,
      description: shareToken.description,
      isExpired: false,
      isRevoked: false,
      viewCount: shareToken.viewCount,
    };

    // Fetch analytics data
    const analyticsData = await fetchAnalyticsShareData(
      entities,
      chartConfig,
      timeWindow,
      filters
    );

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <ShareAnalyticsHeader
              shareData={shareData}
              entities={entities}
              chartConfig={chartConfig}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ShareAnalyticsVisualization
            shareData={shareData}
            chartData={analyticsData}
            chartConfig={chartConfig}
            filters={filters}
            timeWindow={timeWindow}
            className="shadow-sm"
          />
        </div>

        {/* Footer */}
        <SharePageFooter />
      </div>
    );
  } catch (error) {
    if (error instanceof ShareTokenExpiredError) {
      return <ExpiredTokenError />;
    }
    if (error instanceof ShareTokenRevokedError) {
      return <RevokedTokenError />;
    }
    if (error instanceof ShareTokenNotFoundError) {
      notFound();
    }

    // Re-throw unexpected errors for error boundary
    throw error;
  }
}
