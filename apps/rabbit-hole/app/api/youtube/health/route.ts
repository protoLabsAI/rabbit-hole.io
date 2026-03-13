/**
 * YouTube Processor Health Check API
 * Proxies health checks to Python service
 */

import { NextResponse } from "next/server";

import { youtubeProcessorConfig } from "@proto/llm-tools";

export const dynamic = "force-dynamic";

export async function GET() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(youtubeProcessorConfig.getHealthUrl(), {
      method: "GET",
      signal: controller.signal,
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          available: false,
          error: `Service returned ${response.status}`,
        },
        { status: 503 }
      );
    }

    const data = await response.json();

    return NextResponse.json(
      {
        available: true,
        ...data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.warn("YouTube processor health check failed:", error);

    return NextResponse.json(
      {
        available: false,
        error: error instanceof Error ? error.message : "Service unavailable",
      },
      { status: 503 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
