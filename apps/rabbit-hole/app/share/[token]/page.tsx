/**
 * Public Share Page - Timeline Visualization
 *
 * Server-side rendered page for publicly accessible timeline shares
 * with dynamic Open Graph meta tags and view count tracking
 */

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
// Removed neo4j-driver import - using centralized utilities

import { getGlobalNeo4jClient } from "@proto/database";
import {
  ShareTokenExpiredError,
  ShareTokenRevokedError,
  ShareTokenNotFoundError,
  type SharePageData,
} from "@proto/types";
import { fetchEntityTimeline, type TimelineEvent } from "@proto/utils/atlas";

import {
  SharePageHeader,
  EventGanttChart,
  SharePageFooter,
  ExpiredTokenError,
  RevokedTokenError,
} from "@/components/share";
import { ShareTokenService } from "@/lib/share-token-service";

interface SharePageProps {
  params: Promise<{
    token: string;
  }>;
}

/**
 * Convert Neo4j date objects to ISO strings for client components
 */
function convertNeo4jDateToISO(dateValue: any): string {
  // If it's already a string, return as-is
  if (typeof dateValue === "string") {
    return dateValue;
  }

  // If it's a Neo4j date object with year/month/day properties
  if (dateValue && typeof dateValue === "object" && dateValue.year) {
    const { year, month, day, hour = 0, minute = 0, second = 0 } = dateValue;
    // Neo4j months are 1-based, JavaScript Date months are 0-based
    const jsDate = new Date(year, month - 1, day, hour, minute, second);
    return jsDate.toISOString();
  }

  // If it's already a Date object
  if (dateValue instanceof Date) {
    return dateValue.toISOString();
  }

  // Fallback: try to parse as date
  try {
    return new Date(dateValue).toISOString();
  } catch {
    // Return current date as fallback
    return new Date().toISOString();
  }
}

async function getTimelineEvents(entityUid: string): Promise<TimelineEvent[]> {
  const client = getGlobalNeo4jClient();

  // Create a client wrapper that converts integers for Neo4j
  const { createNeo4jClientWithIntegerConversion } = await import(
    "@proto/utils"
  );
  const clientWithIntegerConversion =
    createNeo4jClientWithIntegerConversion(client);

  try {
    const timeline = await fetchEntityTimeline(
      clientWithIntegerConversion,
      entityUid,
      {
        importance: ["critical", "major", "minor"],
        limit: 100,
      }
    );

    return timeline.events;
  } catch (error) {
    console.error("Failed to fetch timeline events:", error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  try {
    const { token } = await params;
    const shareTokenService = new ShareTokenService();
    const shareToken = await shareTokenService.validateShareToken(token);

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://rabbit-hole.io";
    const shareUrl = `${baseUrl}/share/${token}`;
    const previewUrl = `${baseUrl}/api/share/${token}/preview.png`;

    // Enhanced dynamic title and description based on entity and parameters
    const entityType = shareToken.entityUid.split(":")[0];
    const entityName = shareToken.entityUid.split(":")[1]?.replace(/_/g, " ");

    const title =
      shareToken.title || `${entityName || shareToken.entityUid} Timeline`;

    let description = shareToken.description;
    if (!description) {
      const timeWindow = shareToken.parameters.timeWindow;
      const timeRange = timeWindow
        ? ` from ${timeWindow.from} to ${timeWindow.to}`
        : "";

      switch (entityType) {
        case "per":
          description = `Interactive timeline of ${entityName}'s activities and relationships${timeRange}. Explore chronological events, connections, and patterns.`;
          break;
        case "org":
          description = `Organizational timeline for ${entityName}${timeRange}. View key events, relationships, and operational history.`;
          break;
        case "mvt":
          description = `Movement timeline tracking ${entityName}'s development and activities${timeRange}. Analyze key events and participant connections.`;
          break;
        case "evt":
          description = `Event timeline for ${entityName}${timeRange}. Explore chronological developments and related activities.`;
          break;
        default:
          description = `Interactive timeline visualization for ${shareToken.entityUid}${timeRange}. Explore events, relationships, and patterns over time.`;
      }
    }

    const socialTitle =
      title.length > 60 ? `${title.substring(0, 57)}...` : title;
    const socialDescription =
      description.length > 155
        ? `${description.substring(0, 152)}...`
        : description;

    return {
      title: `${title} - Timeline Share`,
      description: socialDescription,
      openGraph: {
        title: socialTitle,
        description: socialDescription,
        url: shareUrl,
        images: [
          {
            url: previewUrl,
            width: 1200,
            height: 630,
            alt: `Timeline visualization for ${entityName || shareToken.entityUid}`,
          },
        ],
        type: "website",
        siteName: "Rabbit Hole",
        locale: "en_US",
      },
      twitter: {
        card: "summary_large_image",
        title: socialTitle,
        description: socialDescription,
        images: [previewUrl],
        creator: "@rabbithole_io",
        site: "@rabbithole_io",
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
    };
  } catch (error) {
    // Return minimal metadata for invalid/expired tokens
    return {
      title: "Shared Timeline - Rabbit Hole",
      description: "Timeline visualization sharing",
      robots: {
        index: false,
        follow: false,
      },
    };
  }
}

export default async function SharePage({ params }: SharePageProps) {
  try {
    const { token } = await params;
    const shareTokenService = new ShareTokenService();

    // Validate token and get share data
    const shareToken = await shareTokenService.validateShareToken(token);

    // Redirect analytics shares to the analytics page
    if (shareToken.shareType === "analytics") {
      redirect(`/share/${token}/analytics`);
    }

    // Increment view count (fire and forget)
    shareTokenService.incrementViewCount(token).catch(console.error);

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

    // Fetch timeline events for EventTimelineChart
    const rawTimelineEvents = await getTimelineEvents(shareData.entityUid);

    // Convert Neo4j date objects to ISO strings for client component
    const timelineEvents = rawTimelineEvents.map((event) => ({
      ...event,
      timestamp: convertNeo4jDateToISO(event.timestamp),
      endDate: event.endDate ? convertNeo4jDateToISO(event.endDate) : undefined,
    }));

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <SharePageHeader shareData={shareData} />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Chronological Events Timeline */}
          <EventGanttChart
            events={timelineEvents}
            height={600}
            className="border border-gray-200 rounded-lg"
            readOnly={true}
            groupBy="category"
            range="monthly"
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
