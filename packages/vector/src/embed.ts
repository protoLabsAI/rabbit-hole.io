/**
 * Embedding helper — OpenAI-compatible /v1/embeddings endpoint
 *
 * Works with Ollama (http://protolabs:11434) and any OpenAI-compatible
 * embedding server. Uses qwen3-embedding:0.6b (1024 dims) by default.
 */

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || "http://localhost:11434";
const EMBED_MODEL = process.env.EMBED_MODEL || "qwen3-embedding:0.6b";

interface OpenAIEmbedResponse {
  object: "list";
  data: Array<{ object: "embedding"; embedding: number[]; index: number }>;
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const res = await fetch(`${OLLAMA_ENDPOINT}/v1/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
