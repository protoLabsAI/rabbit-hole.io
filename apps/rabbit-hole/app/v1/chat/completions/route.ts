/**
 * OpenAI-compatible /v1/chat/completions endpoint.
 *
 * Lets clients built for the OpenAI SDK ("just point your `OPENAI_BASE_URL`
 * at our host") use the rabbit-hole search agent. Translates between the
 * OpenAI chat-completions schema and the internal streamText pipeline.
 *
 * Supports:
 *   - non-streaming completions ({ stream: false })
 *   - streaming completions ({ stream: true }, SSE in OpenAI's chunked format)
 *   - model field is accepted but currently routes to the configured "smart"
 *     model in @protolabsai/llm-providers — different providers / sizes may
 *     come later.
 *
 * Auth: API key in `Authorization: Bearer <key>` header. Currently any key
 * is accepted (Phase 2 will wire this up to Postgres-backed user keys).
 */

import { streamText, stepCountIs, type ModelMessage } from "ai";
import { z } from "zod";

import { getAIModel } from "@protolabsai/llm-providers/server";
import { generateSecureId } from "@protolabsai/utils";

import { searchTools, SYSTEM_PROMPT } from "../../../lib/agent";

// ─── Schemas ────────────────────────────────────────────────────────

const RoleSchema = z.enum(["system", "user", "assistant", "tool"]);

const ContentPartSchema = z.union([
  z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("image_url"),
    image_url: z.object({ url: z.string() }),
  }),
]);

const MessageSchema = z.object({
  role: RoleSchema,
  // OpenAI accepts both string and content-parts arrays
  content: z.union([z.string(), z.array(ContentPartSchema)]),
  name: z.string().optional(),
});

const RequestBodySchema = z.object({
  model: z.string(),
  messages: z.array(MessageSchema),
  stream: z.boolean().optional().default(false),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  // Note: tools/tool_choice ignored — we use our own search tools.
});

// ─── Translation: OpenAI → ModelMessage[] ───────────────────────────

function toModelMessages(
  messages: z.infer<typeof MessageSchema>[]
): ModelMessage[] {
  return messages.map((m) => {
    const text =
      typeof m.content === "string"
        ? m.content
        : m.content
            .filter(
              (p): p is { type: "text"; text: string } => p.type === "text"
            )
            .map((p) => p.text)
            .join("\n");

    if (m.role === "tool") {
      // Tool messages aren't expected from OpenAI clients; skip.
      return { role: "system", content: text } as ModelMessage;
    }
    return { role: m.role, content: text } as ModelMessage;
  });
}

// ─── Route handler ──────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        error: { message: "Invalid JSON body", type: "invalid_request_error" },
      },
      { status: 400 }
    );
  }

  const parsed = RequestBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          message: parsed.error.issues.map((i) => i.message).join("; "),
          type: "invalid_request_error",
        },
      },
      { status: 400 }
    );
  }

  const { model: requestedModel, messages, stream, temperature } = parsed.data;
  const completionId = `chatcmpl-${generateSecureId()}`;
  const created = Math.floor(Date.now() / 1000);

  const model = getAIModel("smart");
  const modelMessages = toModelMessages(messages);

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: searchTools,
    stopWhen: stepCountIs(7),
    temperature,
  });

  if (stream) {
    // OpenAI streaming format: SSE with `data: {chunk}\n\n` and `data: [DONE]`.
    const encoder = new TextEncoder();
    const sse = new ReadableStream({
      async start(controller) {
        try {
          for await (const part of result.fullStream) {
            if (part.type === "text-delta") {
              const chunk = {
                id: completionId,
                object: "chat.completion.chunk",
                created,
                model: requestedModel,
                choices: [
                  {
                    index: 0,
                    delta: { role: "assistant", content: part.text },
                    finish_reason: null,
                  },
                ],
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
              );
            }
          }
          // Final chunk with finish_reason.
          const finalChunk = {
            id: completionId,
            object: "chat.completion.chunk",
            created,
            model: requestedModel,
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`)
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          const message = err instanceof Error ? err.message : "stream error";
          const errChunk = { error: { message, type: "server_error" } };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errChunk)}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(sse, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // Non-streaming: collect full text, then return one OpenAI-shaped completion.
  const finalText = await result.text;
  const usage = await result.usage;

  return Response.json({
    id: completionId,
    object: "chat.completion",
    created,
    model: requestedModel,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: finalText },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: usage?.inputTokens ?? 0,
      completion_tokens: usage?.outputTokens ?? 0,
      total_tokens: (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
    },
  });
}
