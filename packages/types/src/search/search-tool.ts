/**
 * Search Tool Interface & Search Result Types
 *
 * Defines the shared contract that all search provider implementations must
 * satisfy (web search, academic search, news search, etc.) and the common
 * shape of results returned by every provider.
 */

/**
 * The category of source a SearchResult originates from.
 */
export type SearchSourceType =
  | "web"
  | "news"
  | "academic"
  | "social"
  | "database"
  | "other";

/**
 * SearchResult — a single item returned by a SearchTool implementation.
 */
export interface SearchResult {
  /** The canonical URL of the source document or page. */
  url: string;

  /** The title of the source document or page. */
  title: string;

  /**
   * The textual content or snippet extracted from the source.
   * May be a full-text excerpt or a short summary depending on the provider.
   */
  content: string;

  /**
   * Relevance score in [0, 1] as returned or computed by the search provider.
   * Higher values indicate greater relevance to the query.
   */
  score: number;

  /**
   * ISO-8601 date string indicating when the source was published,
   * if available from the provider.
   */
  publishedAt?: string;

  /** The category of source this result originates from. */
  sourceType: SearchSourceType;
}

/**
 * Options passed to SearchTool.search() to refine a query.
 */
export interface SearchOptions {
  /** Maximum number of results to return. Defaults to provider-specific limit. */
  maxResults?: number;

  /**
   * Only return results published on or after this ISO-8601 date string.
   */
  publishedAfter?: string;

  /**
   * Only return results published on or before this ISO-8601 date string.
   */
  publishedBefore?: string;

  /**
   * Restrict results to a specific source type category.
   */
  sourceType?: SearchSourceType;

  /**
   * Arbitrary provider-specific options passed through to the underlying
   * search API. Use for parameters not covered by the shared options above.
   */
  providerOptions?: Record<string, unknown>;
}

/**
 * SearchTool — the shared interface that all search provider implementations
 * must satisfy. Implementations wrap external search APIs (e.g. Tavily, Brave,
 * Serper, PubMed) behind this common contract.
 */
export interface SearchTool {
  /**
   * Execute a search query and return an array of matching results.
   *
   * @param query   - The natural-language or keyword search query.
   * @param options - Optional parameters to refine the search.
   * @returns       A promise resolving to an ordered array of SearchResult objects.
   */
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}
