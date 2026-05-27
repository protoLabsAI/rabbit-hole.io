/**
 * Search Producer — A2A skill: "search"
 *
 * Calls the rabbit-hole web app's OpenAI-compatible chat-completions
 * endpoint to run the search agent end-to-end (web + Wikipedia + LLM
 * synthesis with inline citations) and streams the assistant's
 * response text back to A2A clients.
 *
 * Env:
 *   RABBIT_HOLE_URL       — web app base URL (default http://rabbit-hole:3399)
 *   RABBIT_HOLE_API_KEY   — Bearer token for the API (optional in dev)
 */

import type { ProducerFn } from "../store/task-store.js";

interface OpenAIStreamChunk {
  choices?: Array<{
    delta?: { content?: string };
    finish_reason?: string | null;
  }>;
}

export const searchProducer: ProducerFn = async (ctx, input) => {
  const baseUrl = process.env["RABBIT_HOLE_URL"] ?? "http://rabbit-hole:3399";
  const apiKey = process.env["RABBIT_HOLE_API_KEY"] ?? "";

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`,
      {
        method: "POST",
        signal: ctx.signal,
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: "rabbit-hole",
          messages: [{ role: "user", content: input }],
          stream: true,
        }),
      }
    );
  } catch (err) {
    if (ctx.signal.aborted) return;
    ctx.fail({
      code: -32603,
      message: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    ctx.fail({
      code: -32603,
      message: `chat completions returned ${response.status}: ${body.slice(0, 200)}`,
    });
    return;
  }

  if (!response.body) {
    ctx.fail({ code: -32603, message: "chat completions returned no body" });
    return;
  }

  // Parse SSE stream. Each event is `data: {json}\n\n` with `data: [DONE]` terminator.
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (ctx.signal.aborted) return;
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        const line = event.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") {
          ctx.finish();
          return;
        }
        let chunk: OpenAIStreamChunk;
        try {
          chunk = JSON.parse(payload) as OpenAIStreamChunk;
        } catch {
          continue;
        }
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) ctx.pushText(delta);
      }
    }
  } catch (err) {
    if (ctx.signal.aborted) return;
    ctx.fail({
      code: -32603,
      message: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  ctx.finish();
};
