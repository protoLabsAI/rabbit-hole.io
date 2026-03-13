/**
 * Transcription Provider Health Check
 *
 * Returns provider availability and configuration without making billable API calls.
 */

import { NextRequest, NextResponse } from "next/server";

// CORS allowed origins (restricted for security)
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  process.env.NEXT_PUBLIC_STORYBOOK_ORIGIN || "http://localhost:6006",
].filter(Boolean);

/**
 * Get CORS headers with validated origin
 */
function getCorsHeaders(requestOrigin: string | null): HeadersInit {
  const allowedOrigin =
    requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
      ? requestOrigin
      : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
  };
}

interface HealthResponse {
  provider: string;
  available: boolean;
  configured: boolean;
  baseUrl: string;
  features: {
    streaming: boolean;
    diarization: boolean;
    timestamps: boolean;
  };
  maxFileSizeMB: number;
}

interface ErrorResponse {
  success: false;
  error: string;
}

/**
 * GET /api/transcribe/health?provider=groq
 *
 * Check if a specific provider is available and configured
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<HealthResponse | ErrorResponse>> {
  const corsHeaders = getCorsHeaders(request.headers.get("origin"));

  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider") || "groq";

    // Groq configuration
    if (provider === "groq") {
      const apiKey = process.env.GROQ_API_KEY;
      const configured = !!apiKey;

      return NextResponse.json(
        {
          provider: "groq",
          available: configured,
          configured,
          baseUrl: "https://api.groq.com/openai/v1",
          features: {
            streaming: false,
            diarization: false,
            timestamps: true,
          },
          maxFileSizeMB: 25,
        },
        { headers: corsHeaders }
      );
    }

    // OpenAI configuration (stub)
    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      const configured = !!apiKey;

      return NextResponse.json(
        {
          provider: "openai",
          available: configured,
          configured,
          baseUrl: "https://api.openai.com/v1",
          features: {
            streaming: true,
            diarization: true,
            timestamps: true,
          },
          maxFileSizeMB: 25,
        },
        { headers: corsHeaders }
      );
    }

    // Local configuration
    if (provider === "local") {
      const baseUrl =
        process.env.TRANSCRIPTION_BASE_URL || "http://localhost:8020/v1";
      const configured = !!process.env.TRANSCRIPTION_BASE_URL;

      // Perform lightweight health check
      let available = false;
      try {
        const healthUrl = `${baseUrl.replace(/\/v1$/, "")}/health`;
        const healthResponse = await fetch(healthUrl, {
          method: "GET",
          signal: AbortSignal.timeout(2000),
        });
        available = healthResponse.ok;
      } catch (error) {
        // Service unavailable or unreachable
        available = false;
      }

      return NextResponse.json(
        {
          provider: "local",
          available,
          configured,
          baseUrl,
          features: {
            streaming: false,
            diarization: true,
            timestamps: true,
          },
          maxFileSizeMB: 100,
        },
        { headers: corsHeaders }
      );
    }

    // Unknown provider
    return NextResponse.json(
      {
        success: false,
        error: `Unknown provider: ${provider}. Supported: groq, openai, local`,
      },
      { status: 400, headers: corsHeaders }
    );
  } catch (error) {
    console.error("❌ Health check error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Health check failed",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * OPTIONS /api/transcribe/health
 * Handle CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request.headers.get("origin"));
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
