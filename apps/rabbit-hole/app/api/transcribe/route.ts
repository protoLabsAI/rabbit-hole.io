/**
 * Transcription API Proxy
 *
 * Proxies transcription requests to Groq, OpenAI, or Local server.
 * Handles API authentication server-side to avoid exposing keys to browser.
 *
 * Provider Support:
 * - Groq: ✅ Implemented (FREE tier, English-only)
 * - OpenAI: ✅ Implemented (Full features, paid)
 * - Local: ✅ Implemented (faster-whisper, self-hosted)
 *
 * Future Enhancements:
 * - TODO: Add rate limiting (consider upstash/redis)
 * - TODO: Add request logging for observability
 * - TODO: Add caching for identical files
 * - TODO: Add progress streaming support
 */

import { NextRequest, NextResponse } from "next/server";

// Route configuration - increase timeout for audio processing
export const maxDuration = 300; // 5 minutes for long files + model loading
export const dynamic = "force-dynamic"; // Don't cache transcription requests

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const MAX_FILE_SIZE_MB = 25;
const REQUEST_TIMEOUT_MS = 300000; // 5 minutes

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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
  };
}

interface TranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
  }>;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

interface ErrorResponse {
  success: false;
  error: string;
  provider?: string;
  details?: string;
}

/**
 * POST /api/transcribe
 *
 * Transcribe audio file using configured provider (Groq only for now)
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<TranscriptionResponse | ErrorResponse>> {
  const corsHeaders = getCorsHeaders(request.headers.get("origin"));

  try {
    const formData = await request.formData();

    // Extract parameters
    const file = formData.get("file") as File | null;
    const provider = (formData.get("provider") as string) || "groq";
    const model = formData.get("model") as string | null;
    const language = formData.get("language") as string | null;
    const prompt = formData.get("prompt") as string | null;
    const responseFormat =
      (formData.get("response_format") as string) || "json";
    const temperature = formData.get("temperature")
      ? parseFloat(formData.get("temperature") as string)
      : 0.0;

    // Validate file
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "Audio file is required",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      return NextResponse.json(
        {
          success: false,
          error: `File size (${fileSizeMB.toFixed(2)} MB) exceeds maximum allowed size (${MAX_FILE_SIZE_MB} MB)`,
        },
        { status: 413, headers: corsHeaders }
      );
    }

    // Validate provider
    if (provider !== "groq" && provider !== "openai" && provider !== "local") {
      return NextResponse.json(
        {
          success: false,
          error: `Provider "${provider}" not supported. Available: groq, openai, local`,
          provider,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get API key and base URL based on provider
    let apiKey: string | undefined;
    let baseUrl: string;

    if (provider === "groq") {
      apiKey = process.env.GROQ_API_KEY;
      baseUrl = GROQ_BASE_URL;
    } else if (provider === "openai") {
      apiKey = process.env.OPENAI_API_KEY;
      baseUrl = "https://api.openai.com/v1";
    } else {
      // local provider
      apiKey = undefined; // No auth for local
      baseUrl =
        process.env.TRANSCRIPTION_BASE_URL || "http://localhost:8020/v1";
    }

    if (!apiKey && provider !== "local") {
      console.error(`❌ ${provider.toUpperCase()}_API_KEY not configured`);
      return NextResponse.json(
        {
          success: false,
          error: "Transcription service not configured. Contact administrator.",
          details: `${provider.toUpperCase()}_API_KEY environment variable not set`,
        },
        { status: 503, headers: corsHeaders }
      );
    }

    // Build form data for provider API
    const apiFormData = new FormData();
    apiFormData.append("file", file);

    const defaultModel =
      provider === "groq"
        ? "whisper-large-v3"
        : provider === "openai"
          ? "gpt-4o-mini-transcribe"
          : "Systran/faster-whisper-base";

    // Determine the effective model being used
    const effectiveModel = model || defaultModel;
    apiFormData.append("model", effectiveModel);

    if (language) {
      apiFormData.append("language", language);
    }

    if (prompt) {
      apiFormData.append("prompt", prompt);
    }

    // Map response format for OpenAI gpt-4o models (only support json/text)
    let effectiveFormat = responseFormat;
    if (provider === "openai" && effectiveModel.startsWith("gpt-4o")) {
      if (responseFormat === "verbose_json") {
        effectiveFormat = "json";
        console.log(
          `⚠️  OpenAI model ${effectiveModel} doesn't support verbose_json, using json instead`
        );
      }
    }

    apiFormData.append("response_format", effectiveFormat);
    apiFormData.append("temperature", temperature.toString());

    // Handle timestamp granularities
    const timestampGranularities = formData.getAll("timestamp_granularities[]");
    timestampGranularities.forEach((granularity) => {
      apiFormData.append("timestamp_granularities[]", granularity as string);
    });

    console.log(
      `📝 Transcribing with ${provider}: ${file.name} (${fileSizeMB.toFixed(2)} MB)`
    );

    // Forward to provider API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const headers: HeadersInit = {};
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers,
        body: apiFormData,
        signal: controller.signal,
      }).catch((fetchError) => {
        // Catch and enhance fetch errors
        if (fetchError.cause?.code === "UND_ERR_SOCKET") {
          throw new Error(
            `Connection to ${provider} server failed. ${provider === "local" ? "Server may have crashed during processing. Check logs: docker logs faster-whisper-server" : "Service unavailable."}`
          );
        }
        throw fetchError;
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error?.message ||
          errorData.detail ||
          "Transcription failed";

        console.error(
          `❌ ${provider} API error: ${response.status} ${response.statusText}`,
          errorMessage
        );

        // Handle specific error codes
        if (response.status === 401) {
          return NextResponse.json(
            {
              success: false,
              error: "API authentication failed. Contact administrator.",
              details: `Invalid or expired ${provider} API key`,
              provider,
            },
            { status: 503, headers: corsHeaders }
          );
        }

        if (response.status === 429) {
          return NextResponse.json(
            {
              success: false,
              error: "Rate limit exceeded. Please try again later.",
              details: errorMessage,
              provider,
            },
            { status: 429, headers: corsHeaders }
          );
        }

        // Normalize upstream 5xx errors to 502 Bad Gateway
        if (response.status >= 500 && response.status < 600) {
          return NextResponse.json(
            {
              success: false,
              error: "Transcription service unavailable",
              details: errorMessage,
              provider,
            },
            { status: 502, headers: corsHeaders }
          );
        }

        // Pass through other error codes
        return NextResponse.json(
          {
            success: false,
            error: "Transcription service error",
            details: errorMessage,
            provider,
          },
          { status: response.status, headers: corsHeaders }
        );
      }

      const result: TranscriptionResponse = await response.json();

      console.log(
        `✅ Transcription complete: ${result.text?.length || 0} characters`
      );

      return NextResponse.json(result, { status: 200, headers: corsHeaders });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return NextResponse.json(
          {
            success: false,
            error: "Transcription request timed out",
            details: `Request exceeded ${REQUEST_TIMEOUT_MS / 1000} seconds`,
          },
          { status: 504, headers: corsHeaders }
        );
      }

      throw fetchError;
    }
  } catch (error) {
    console.error("❌ Transcription API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * OPTIONS /api/transcribe
 * Handle CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request.headers.get("origin"));
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * GET /api/transcribe
 *
 * Returns API documentation and supported providers
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const corsHeaders = getCorsHeaders(request.headers.get("origin"));
  return NextResponse.json(
    {
      endpoint: "POST /api/transcribe",
      description: "Transcribe audio files using AI models",
      providers: {
        groq: {
          status: "implemented",
          models: ["whisper-large-v3", "whisper-large-v3-turbo"],
          features: ["transcription", "translation", "timestamps"],
          limitations: ["No diarization"],
          cost: "FREE (10,000 minutes/day)",
        },
        openai: {
          status: "implemented",
          models: [
            "gpt-4o-transcribe",
            "gpt-4o-mini-transcribe",
            "gpt-4o-transcribe-diarize",
            "whisper-1",
          ],
          features: [
            "transcription",
            "translation",
            "timestamps",
            "diarization",
          ],
          cost: "$0.006/minute",
        },
        local: {
          status: "TODO",
          info: "Add local faster-whisper server support",
        },
      },
      parameters: {
        required: ["file"],
        optional: [
          "provider (default: groq)",
          "model",
          "language",
          "prompt",
          "response_format (json|text|verbose_json|srt|vtt)",
          "temperature (0-1)",
          "timestamp_granularities[] (segment|word)",
        ],
      },
      limits: {
        maxFileSizeMB: MAX_FILE_SIZE_MB,
        timeoutSeconds: REQUEST_TIMEOUT_MS / 1000,
      },
      examples: {
        curl: `curl -X POST http://localhost:3000/api/transcribe \\
  -F "file=@audio.mp3" \\
  -F "provider=groq" \\
  -F "response_format=verbose_json"`,
      },
    },
    { headers: corsHeaders }
  );
}
