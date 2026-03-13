/**
 * Translation API Proxy
 *
 * Translates audio to English using OpenAI Whisper.
 * NOTE: Translation is only supported by OpenAI whisper-1 model.
 * Groq and Local providers do not support translation.
 *
 * Future Enhancements:
 * - TODO: Add rate limiting
 * - TODO: Add request logging for observability
 */

import { NextRequest, NextResponse } from "next/server";

const OPENAI_BASE_URL = "https://api.openai.com/v1";
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

interface TranslationResponse {
  text: string;
  duration?: number;
}

interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
}

/**
 * POST /api/transcribe/translate
 *
 * Translate audio to English (OpenAI only)
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<TranslationResponse | ErrorResponse>> {
  const corsHeaders = getCorsHeaders(request.headers.get("origin"));

  try {
    const formData = await request.formData();

    // Extract parameters
    const file = formData.get("file") as File | null;
    const provider = (formData.get("provider") as string) || "groq"; // Groq now supports translation
    const model =
      (formData.get("model") as string) ||
      (provider === "groq" ? "whisper-large-v3" : "whisper-1");
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

    // Get API key based on provider
    const apiKey =
      provider === "groq"
        ? process.env.GROQ_API_KEY
        : process.env.OPENAI_API_KEY;

    const baseUrl =
      provider === "groq"
        ? "https://api.groq.com/openai/v1"
        : "https://api.openai.com/v1";

    if (!apiKey) {
      console.error(
        `❌ ${provider.toUpperCase()}_API_KEY not configured in server environment`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Translation service not configured.",
          details: `${provider.toUpperCase()}_API_KEY environment variable not set`,
        },
        { status: 503, headers: corsHeaders }
      );
    }

    // Build form data for API
    const apiFormData = new FormData();
    apiFormData.append("file", file);
    apiFormData.append("model", model);

    if (prompt) {
      apiFormData.append("prompt", prompt);
    }

    apiFormData.append("response_format", responseFormat);
    apiFormData.append("temperature", temperature.toString());

    console.log(
      `🌍 Translating file: ${file.name} (${fileSizeMB.toFixed(2)} MB) to English with ${provider}`
    );

    // Forward to provider API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}/audio/translations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: apiFormData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || "Translation failed";

        console.error(
          `❌ ${provider} API error: ${response.status} ${response.statusText}`,
          errorMessage
        );

        if (response.status === 401) {
          return NextResponse.json(
            {
              success: false,
              error: "API authentication failed. Contact administrator.",
              details: `Invalid or expired ${provider} API key`,
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
            },
            { status: 429, headers: corsHeaders }
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: "Translation service error",
            details: errorMessage,
          },
          { status: response.status, headers: corsHeaders }
        );
      }

      const result: TranslationResponse = await response.json();

      console.log(
        `✅ Translation complete: ${result.text?.length || 0} characters`
      );

      return NextResponse.json(result, { status: 200, headers: corsHeaders });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return NextResponse.json(
          {
            success: false,
            error: "Translation request timed out",
            details: `Request exceeded ${REQUEST_TIMEOUT_MS / 1000} seconds`,
          },
          { status: 504, headers: corsHeaders }
        );
      }

      throw fetchError;
    }
  } catch (error) {
    console.error("❌ Translation API error:", error);

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
 * OPTIONS /api/transcribe/translate
 * Handle CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request.headers.get("origin"));
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * GET /api/transcribe/translate
 *
 * Returns API documentation
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const corsHeaders = getCorsHeaders(request.headers.get("origin"));
  return NextResponse.json(
    {
      endpoint: "POST /api/transcribe/translate",
      description: "Translate audio to English",
      providers: {
        groq: {
          status: "implemented",
          models: ["whisper-large-v3", "whisper-large-v3-turbo"],
          cost: "FREE",
        },
        openai: {
          status: "supported",
          models: ["whisper-1"],
          cost: "$0.006/min",
        },
      },
      note: "Output is always in English regardless of input language.",
      parameters: {
        required: ["file"],
        optional: [
          "provider (groq|openai, default: groq)",
          "model",
          "prompt",
          "response_format (json|text|verbose_json)",
          "temperature (0-1)",
        ],
      },
      limits: {
        maxFileSizeMB: MAX_FILE_SIZE_MB,
        timeoutSeconds: REQUEST_TIMEOUT_MS / 1000,
      },
    },
    { headers: corsHeaders }
  );
}
