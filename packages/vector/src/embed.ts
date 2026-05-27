/**
 * Embedding helper — OpenAI-compatible /v1/embeddings endpoint.
 *
 * Routes through the protoLabs LLM gateway (LiteLLM) by default, model
 * `qwen3-embedding` (1024 dims). The old Ollama endpoint on ava was retired
 * with the ava-evict; embeddings now go through the gateway so quota +
 * observability land in Langfuse.
 *
 * Config (all optional — sensible gateway defaults):
 *   EMBED_BASE_URL  (or OPENAI_BASE_URL) — default http://gateway:4000/v1
 *   EMBED_API_KEY   (or OPENAI_API_KEY)  — gateway bearer token
 *   EMBED_MODEL                          — default qwen3-embedding
 */

const BASE_URL =
  process.env.EMBED_BASE_URL ||
  process.env.OPENAI_BASE_URL ||
  "http://gateway:4000/v1";
const API_KEY = process.env.EMBED_API_KEY || process.env.OPENAI_API_KEY || "";
const EMBED_MODEL = process.env.EMBED_MODEL || "qwen3-embedding";

interface OpenAIEmbedResponse {
  object: "list";
  data: Array<{ object: "embedding"; embedding: number[]; index: number }>;
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  // The gateway requires bearer auth; a bare Ollama server ignores it.
  if (API_KEY) headers["Authorization"] = `Bearer ${API_KEY}`;

  const res = await fetch(`${BASE_URL}/embeddings`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Embedding request failed: ${res.status} ${res.statusText} — ${body}`
    );
  }

  const data = (await res.json()) as OpenAIEmbedResponse;
  // Sort by index to guarantee order matches input
  return data.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

export async function embedOne(text: string): Promise<number[]> {
  const [vec] = await embed([text]);
  return vec;
}
