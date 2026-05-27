/**
 * Token-ish text chunker for corpus ingestion.
 *
 * Splits on paragraph/sentence boundaries into ~maxChars windows with a
 * small overlap so a fact spanning a boundary still lands whole in at least
 * one chunk. Character-based (not true tokens) to stay dependency-free — at
 * ~4 chars/token, the 2000-char default ≈ 500 tokens, comfortable for
 * qwen3-embedding.
 */

export interface ChunkOptions {
  /** Target max characters per chunk. Default 2000 (~500 tokens). */
  maxChars?: number;
  /** Characters of overlap carried into the next chunk. Default 200. */
  overlap?: number;
}

export function chunkText(text: string, opts: ChunkOptions = {}): string[] {
  const maxChars = opts.maxChars ?? 2000;
  const overlap = opts.overlap ?? 200;

  const clean = text.replace(/\r\n/g, "\n").trim();
  if (clean.length === 0) return [];
  if (clean.length <= maxChars) return [clean];

  // Prefer to break on paragraph, then sentence, then hard cut.
  const paragraphs = clean.split(/\n{2,}/);
  const chunks: string[] = [];
  let buf = "";

  const flush = () => {
    const trimmed = buf.trim();
    if (trimmed) chunks.push(trimmed);
    // Carry the tail as overlap into the next buffer.
    buf =
      overlap > 0 && trimmed.length > overlap ? trimmed.slice(-overlap) : "";
  };

  for (const para of paragraphs) {
    if (para.length > maxChars) {
      // Paragraph itself too big — split by sentence.
      const sentences = para.split(/(?<=[.!?])\s+/);
      for (const s of sentences) {
        if (buf.length + s.length + 1 > maxChars) flush();
        // A single monster sentence still exceeds maxChars — hard-cut it.
        if (s.length > maxChars) {
          for (let i = 0; i < s.length; i += maxChars - overlap) {
            chunks.push(s.slice(i, i + maxChars));
          }
          buf = "";
        } else {
          buf += (buf ? " " : "") + s;
        }
      }
    } else {
      if (buf.length + para.length + 2 > maxChars) flush();
      buf += (buf ? "\n\n" : "") + para;
    }
  }
  const tail = buf.trim();
  if (tail) chunks.push(tail);

  return chunks;
}
