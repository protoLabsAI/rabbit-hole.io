/**
 * Source Grounding Types
 *
 * Links claims extracted during research to their originating sources,
 * providing traceability for entities and relationships in a RabbitHole bundle.
 */

/**
 * SourceGrounding — maps a claim or piece of extracted content back to the
 * source document, URL, or passage from which it was derived.
 */
export interface SourceGrounding {
  /** The claim text or assertion that was grounded (e.g. an entity name, a relationship fact). */
  claimText: string;

  /** The URL of the source document or web page. */
  sourceUrl: string;

  /** A verbatim excerpt from the source that supports the claim. */
  excerpt: string;

  /**
   * Confidence score in [0, 1] indicating how well the excerpt supports the claim.
   * Higher values indicate stronger grounding.
   */
  confidence: number;

  /** Optional human-readable title of the source document or page. */
  sourceTitle?: string;

  /** Optional ISO-8601 date when the source was published. */
  publishedAt?: string;
}
