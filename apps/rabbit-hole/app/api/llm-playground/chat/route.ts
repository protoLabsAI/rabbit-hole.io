import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getModel } from "@proto/llm-providers/server";
import { getLangfuse } from "@proto/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Zod validation schemas for request body
const Role = z.union([
  z.literal("user"),
  z.literal("assistant"),
  z.literal("system"),
]);

const MessageSchema = z.strictObject({
  role: Role,
  content: z.string().min(1).max(8000),
});

const RequestSchema = z.strictObject({
  messages: z.array(MessageSchema).min(1).max(50),
  config: z.strictObject({
    provider: z.union([
      z.literal("openai"),
      z.literal("anthropic"),
      z.literal("google"),
      z.literal("groq"),
      z.literal("ollama"),
      z.literal("fake"),
    ]),
    category: z.union([
      z.literal("fast"),
      z.literal("smart"),
      z.literal("reasoning"),
      z.literal("vision"),
      z.literal("coding"),
    ]),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().min(1).max(8192).default(1024),
    topP: z.number().min(0).max(1).optional(),
    frequencyPenalty: z.number().min(-2).max(2).optional(),
    presencePenalty: z.number().min(-2).max(2).optional(),
  }),
  apiKeys: z
    .strictObject({
      openai: z.string().min(1).optional(),
      anthropic: z.string().min(1).optional(),
      google: z.string().min(1).optional(),
      groq: z.string().min(1).optional(),
      ollama: z.string().url().optional(),
    })
    .optional(),
  useHosted: z.boolean().optional(),
});

type Message = z.infer<typeof MessageSchema>;
type RequestBody = z.infer<typeof RequestSchema>;

export async function POST(request: NextRequest) {
  try {
    // Get user authentication
    const { userId } = { userId: "local-user" };

    // Validate request body with Zod
    const parseResult = RequestSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { messages, config, apiKeys, useHosted = true } = parseResult.data;

    // Request-scoped authentication (never mutate process.env)
    const requestScopedAuth: Record<string, unknown> = {};

    // Validate mode and keys
    if (!useHosted) {
      // BYOK mode - validate and pass request-scoped keys
      if (apiKeys) {
        if (apiKeys.openai) requestScopedAuth.openaiApiKey = apiKeys.openai;
        if (apiKeys.anthropic)
          requestScopedAuth.anthropicApiKey = apiKeys.anthropic;
        if (apiKeys.google) requestScopedAuth.googleApiKey = apiKeys.google;
        if (apiKeys.groq) requestScopedAuth.groqApiKey = apiKeys.groq;

        // SSRF protection: strictly validate OLLAMA URLs
        if (apiKeys.ollama) {
          try {
            const ollamaUrl = new URL(apiKeys.ollama);
            const allowedHosts = new Set([
              "localhost",
              "127.0.0.1",
              "::1",
              "0.0.0.0",
            ]);

            if (
              !/^https?:$/.test(ollamaUrl.protocol) ||
              !allowedHosts.has(ollamaUrl.hostname)
            ) {
              return NextResponse.json(
                {
                  error: "Invalid OLLAMA_BASE_URL",
                  details:
                    "Only local hosts (localhost, 127.0.0.1) are allowed in BYOK mode for security reasons.",
                },
                { status: 400 }
              );
            }
            requestScopedAuth.ollamaBaseUrl = `${ollamaUrl.protocol}//${ollamaUrl.host}`;
          } catch {
            return NextResponse.json(
              {
                error: "Invalid OLLAMA_BASE_URL",
                details: "Malformed URL.",
              },
              { status: 400 }
            );
          }
        }
      }
    } else {
      // Hosted mode - verify server keys exist
      const requiredEnvKeys: Record<string, string> = {
        openai: "OPENAI_API_KEY",
        anthropic: "ANTHROPIC_API_KEY",
        google: "GOOGLE_API_KEY",
        groq: "GROQ_API_KEY",
      };

      const envKey = requiredEnvKeys[config.provider];
      if (
        envKey &&
        !process.env[envKey] &&
        config.provider !== "ollama" &&
        config.provider !== "fake"
      ) {
        return NextResponse.json(
          {
            error: "Provider not configured",
            details: `Server-side ${envKey} not set. Contact administrator or switch to BYOK mode.`,
          },
          { status: 503 }
        );
      }

      // TODO: Track usage for billing
      // await trackUsage({ userId, provider, category });
    }

    const startTime = Date.now();

    // Generate or retrieve session ID for conversation tracking
    // In a real implementation, this would come from the client
    // For now, create a session ID from user + timestamp (for demo)
    const sessionId =
      request.headers.get("x-session-id") ||
      `playground-${userId || "anonymous"}-${Date.now()}`;

    // Create Langfuse trace for observability
    const langfuse = getLangfuse();
    const trace = langfuse?.trace({
      name: "llm-playground-chat",
      sessionId: sessionId,
      userId: userId || undefined,
      tags: ["playground", config.provider, config.category],
      metadata: {
        provider: config.provider,
        category: config.category,
        mode: useHosted ? "hosted" : "byok",
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        messageCount: messages.length,
      },
    });

    const generation = trace?.generation({
      name: "chat-completion",
      model: config.provider,
      modelParameters: {
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        ...(config.topP !== undefined && { topP: config.topP }),
        ...(config.frequencyPenalty !== undefined && {
          frequencyPenalty: config.frequencyPenalty,
        }),
        ...(config.presencePenalty !== undefined && {
          presencePenalty: config.presencePenalty,
        }),
      },
      input: messages,
    });

    // Get model from provider with request-scoped auth
    const model = getModel(
      config.category,
      config.provider === "fake" ? undefined : config.provider,
      {
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        topP: config.topP,
        frequencyPenalty: config.frequencyPenalty,
        presencePenalty: config.presencePenalty,
        // Pass request-scoped authentication (BYOK)
        ...requestScopedAuth,
      }
    );

    // Format messages for LangChain (plain objects with role/content)
    // The underlying ChatModel will convert these to proper BaseMessage types
    const formattedMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Invoke the model
    const response = await model.invoke(formattedMessages);

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Extract token usage if available (safe type narrowing)
    const responseMetadata = response.response_metadata as
      | { tokenUsage?: { totalTokens?: number }; model?: string }
      | undefined;
    const usageMetadata = response.usage_metadata as
      | {
          input_tokens?: number;
          output_tokens?: number;
          total_tokens?: number;
          // Anthropic-specific caching tokens
          cache_read_input_tokens?: number;
          cache_creation_input_tokens?: number;
          // OpenAI o1-specific reasoning tokens
          completion_tokens_details?: {
            reasoning_tokens?: number;
          };
          // OpenAI prompt token details
          prompt_tokens_details?: {
            cached_tokens?: number;
            audio_tokens?: number;
          };
        }
      | undefined;

    // Build usage details object with all available token types
    const usageDetails: Record<string, number> = {};

    if (usageMetadata) {
      // Standard token counts
      if (usageMetadata.input_tokens !== undefined) {
        usageDetails.input = usageMetadata.input_tokens;
      }
      if (usageMetadata.output_tokens !== undefined) {
        usageDetails.output = usageMetadata.output_tokens;
      }

      // Anthropic prompt caching tokens
      if (usageMetadata.cache_read_input_tokens !== undefined) {
        usageDetails.cache_read_input_tokens =
          usageMetadata.cache_read_input_tokens;
      }
      if (usageMetadata.cache_creation_input_tokens !== undefined) {
        usageDetails.cache_creation_input_tokens =
          usageMetadata.cache_creation_input_tokens;
      }

      // OpenAI o1 reasoning tokens (nested in completion_tokens_details)
      if (
        usageMetadata.completion_tokens_details?.reasoning_tokens !== undefined
      ) {
        usageDetails.output_reasoning_tokens =
          usageMetadata.completion_tokens_details.reasoning_tokens;
      }

      // OpenAI prompt token details (nested in prompt_tokens_details)
      if (usageMetadata.prompt_tokens_details?.cached_tokens !== undefined) {
        usageDetails.input_cached_tokens =
          usageMetadata.prompt_tokens_details.cached_tokens;
      }
      if (usageMetadata.prompt_tokens_details?.audio_tokens !== undefined) {
        usageDetails.input_audio_tokens =
          usageMetadata.prompt_tokens_details.audio_tokens;
      }

      // Total tokens (prefer explicit, fallback to input + output)
      if (usageMetadata.total_tokens !== undefined) {
        usageDetails.total = usageMetadata.total_tokens;
      } else if (responseMetadata?.tokenUsage?.totalTokens !== undefined) {
        usageDetails.total = responseMetadata.tokenUsage.totalTokens;
      } else {
        // Fallback: compute from standard input/output only (no detail fields)
        const calculatedTotal =
          (usageDetails.input || 0) + (usageDetails.output || 0);
        if (calculatedTotal > 0) {
          usageDetails.total = calculatedTotal;
        }
      }
    }

    // Calculate simplified totals for response body
    const inputTokens = usageDetails.input || 0;
    const outputTokens = usageDetails.output || 0;
    const totalTokens = usageDetails.total || inputTokens + outputTokens;

    // Get model name
    const modelName = responseMetadata?.model || "unknown";

    // Update Langfuse generation with detailed usage
    if (generation) {
      generation.end({
        output: response.content,
        usage: usageDetails,
        model: modelName,
      });
    }

    // Send response immediately, flush trace in background
    const jsonResponse = NextResponse.json({
      content: response.content,
      tokensUsed: totalTokens,
      inputTokens: inputTokens,
      outputTokens: outputTokens,
      responseTime,
      model: modelName,
      provider: config.provider,
      sessionId: sessionId,
      traceUrl: trace?.id
        ? `${process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com"}/trace/${trace.id}`
        : undefined,
      sessionUrl:
        sessionId && process.env.LANGFUSE_PROJECT_ID
          ? `${process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com"}/project/${process.env.LANGFUSE_PROJECT_ID}/sessions/${encodeURIComponent(sessionId)}`
          : undefined,
    });

    // Flush with 2s timeout - don't block response
    if (langfuse) {
      Promise.race([
        (langfuse as any).flush?.() || Promise.resolve(),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]).catch((error) => {
        console.warn(
          "[Langfuse] Flush timeout/error (trace may be delayed):",
          error instanceof Error ? error.message : "timeout"
        );
      });
    }

    return jsonResponse;
  } catch (error) {
    console.error("LLM Playground API Error:", error);

    return NextResponse.json(
      {
        error: "Failed to get response from LLM",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
