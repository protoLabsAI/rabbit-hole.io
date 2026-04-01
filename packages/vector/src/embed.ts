/**
 * Ollama embedding helper
 *
 * Calls qwen3-embedding:0.6b (1024 dims) for all embedding needs —
 * both KG entity indexing and research session memory.
 */

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || "http://localhost:11434";
const EMBED_MODEL = process.env.EMBED_MODEL || "qwen3-embedding:0.6b";

interface OllamaEmbedResponse {
  embeddings: number[][];
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const res = await fetch(`${OLLAMA_ENDPOINT}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Ollama embed failed: ${res.status} ${res.statusText} — ${body}`
    );
  }

  const data = (await res.json()) as OllamaEmbedResponse;
  return data.embeddings;
}

export async function embedOne(text: string): Promise<number[]> {
  const [vec] = await embed([text]);
  return vec;
}
