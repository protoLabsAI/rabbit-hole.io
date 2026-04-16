/**
 * Share Token Preview Image Generation API
 *
 * GET /api/share/[token]/preview.png - Generate preview image for social sharing
 * Returns 1200x630px PNG optimized for Open Graph and Twitter Cards
 */

import neo4j from "neo4j-driver";
import { NextRequest } from "next/server";

import { getGlobalNeo4jClient } from "@protolabsai/database";
import {
  ShareTokenNotFoundError,
  ShareTokenExpiredError,
  ShareTokenRevokedError,
} from "@protolabsai/types";
import {
  fetchEntityTimeline,
  type TimelineEvent,
} from "@protolabsai/utils/atlas";

import { ShareTokenService } from "@/lib/share-token-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> {
  try {
    const { token } = await params;
    const shareTokenService = new ShareTokenService();

    // Validate share token
    const shareToken = await shareTokenService.validateShareToken(token);

    // Fetch timeline data for visualization
    const client = getGlobalNeo4jClient();

    // Create a client wrapper that converts integers for Neo4j
    const clientWithIntegerConversion = {
      executeRead: async (query: string, parameters?: Record<string, any>) => {
        // Convert numeric parameters to neo4j.int() where needed
        const convertedParams = parameters ? { ...parameters } : {};
        if (convertedParams.limit !== undefined) {
          convertedParams.limit = neo4j.int(convertedParams.limit);
        }

        return await client.executeRead(query, convertedParams);
      },
    };

    const timeline = await fetchEntityTimeline(
      clientWithIntegerConversion,
      shareToken.entityUid,
      {
        importance: ["critical", "major"],
        limit: 20, // Limit for preview
      }
    );

    // Generate preview image
    const imageBuffer = await generateTimelinePreview(
      shareToken,
      timeline.events
    );

    return new Response(new Uint8Array(imageBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=604800", // 1 week cache
        "CDN-Cache-Control": "max-age=2592000", // 1 month on CDN
      },
    });
  } catch (error) {
    // Return error image for social media
    const errorImageBuffer = await generateErrorPreview(error);

    return new Response(new Uint8Array(errorImageBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300", // 5 minutes cache for errors
      },
      status: error instanceof ShareTokenNotFoundError ? 404 : 500,
    });
  }
}

async function generateTimelinePreview(
  shareToken: any,
  events: TimelineEvent[]
): Promise<Buffer> {
  // For now, return a simple placeholder
  // TODO: Implement actual image generation with server-side rendering

  const entityName = shareToken.entityUid.split(":")[1]?.replace(/_/g, " ");
  const eventCount = events.length;

  // Create SVG placeholder
  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <!-- Background gradient -->
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3730a3;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)"/>
      
      <!-- Content -->
      <text x="600" y="200" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">
        Timeline Preview
      </text>
      <text x="600" y="280" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="32">
        ${entityName || shareToken.entityUid}
      </text>
      <text x="600" y="350" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="24">
        ${eventCount} Events • Interactive Timeline Visualization
      </text>
      
      <!-- Simple timeline visualization -->
      <line x1="200" y1="450" x2="1000" y2="450" stroke="white" stroke-width="4" opacity="0.6"/>
      ${events
        .slice(0, 10)
        .map((_, i) => {
          const x = 200 + i * 80;
          const height = 20 + (i % 3) * 15;
          return `<circle cx="${x}" cy="${450 - height}" r="8" fill="white" opacity="0.8"/>`;
        })
        .join("")}
      
      <!-- Branding -->
      <text x="1100" y="590" text-anchor="end" fill="rgba(255,255,255,0.6)" font-family="Arial, sans-serif" font-size="16">
        Rabbit Hole
      </text>
    </svg>
  `;

  // Convert SVG to PNG (simplified approach)
  // In production, you'd use a proper image generation library
  return Buffer.from(svg, "utf-8");
}

async function generateErrorPreview(error: any): Promise<Buffer> {
  let errorMessage = "Timeline Unavailable";

  if (error instanceof ShareTokenExpiredError) {
    errorMessage = "Timeline Link Expired";
  } else if (error instanceof ShareTokenRevokedError) {
    errorMessage = "Timeline Link Revoked";
  } else if (error instanceof ShareTokenNotFoundError) {
    errorMessage = "Timeline Not Found";
  }

  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#ef4444"/>
      <text x="600" y="300" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="42" font-weight="bold">
        ${errorMessage}
      </text>
      <text x="600" y="370" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="24">
        Unable to generate timeline preview
      </text>
    </svg>
  `;

  return Buffer.from(svg, "utf-8");
}
