/// <reference lib="dom" />

/**
 * Wikipedia Service Configuration
 *
 * Centralized configuration for Wikipedia API integration.
 * Supports both client-side and server-side usage.
 */

/**
 * Wikipedia API configuration
 */
export const wikipediaConfig = {
  /**
   * Get the Wikipedia API endpoint
   */
  getApiUrl: (language = "en") => `https://${language}.wikipedia.org/w/api.php`,

  /**
   * Default search and fetch parameters
   */
  defaults: {
    language: "en",
    topKResults: 2,
    maxContentLength: 4000,
    maxSummaryLength: 500,
    includeImages: true,
    includeCategories: true,
    reliability: 0.85, // Wikipedia is generally reliable but can have editorial bias
  },

  /**
   * Common query parameters
   */
  searchParams: {
    format: "json",
    origin: "*", // CORS support
    action: "query",
  },
} as const;

/**
 * Supported Wikipedia languages
 */
export const WIKIPEDIA_LANGUAGES = [
  "en", // English
  "es", // Spanish
  "fr", // French
  "de", // German
  "ja", // Japanese
  "zh", // Chinese
  "ru", // Russian
  "pt", // Portuguese
  "it", // Italian
  "ar", // Arabic
] as const;

export type WikipediaLanguage = (typeof WIKIPEDIA_LANGUAGES)[number];

/**
 * Wikipedia search result interface
 */
export interface WikipediaSearchResult {
  pageId: number;
  title: string;
  snippet: string;
  wordCount: number;
  timestamp: string;
}

/**
 * Wikipedia page content interface
 */
export interface WikipediaPage {
  pageId: number;
  title: string;
  content: string;
  summary: string;
  url: string;
  categories: string[];
  imageUrl?: string;
  lastModified: string;
  wordCount: number;
  language: string;
}

/**
 * Wikipedia query response
 */
export interface WikipediaQueryResponse {
  pages: WikipediaPage[];
  searchResults: WikipediaSearchResult[];
  query: string;
  language: string;
  totalResults: number;
}

/**
 * Search Wikipedia for pages matching a query
 *
 * @param query - Search query
 * @param options - Search options
 * @returns Search results
 */
export async function searchWikipedia(
  query: string,
  options: {
    language?: WikipediaLanguage;
    limit?: number;
  } = {}
): Promise<WikipediaSearchResult[]> {
  const {
    language = wikipediaConfig.defaults.language,
    limit = wikipediaConfig.defaults.topKResults,
  } = options;

  const apiUrl = wikipediaConfig.getApiUrl(language);
  const params = new URLSearchParams({
    ...wikipediaConfig.searchParams,
    list: "search",
    srsearch: query,
    srlimit: limit.toString(),
    srprop: "snippet|titlesnippet|wordcount|timestamp",
  });

  try {
    const response = await fetch(`${apiUrl}?${params}`);
    if (!response.ok) {
      throw new Error(`Wikipedia search failed: ${response.status}`);
    }

    const data = await response.json();
    const results = data.query?.search || [];

    return results.map((result: any) => ({
      pageId: result.pageid,
      title: result.title,
      snippet: result.snippet.replace(/<[^>]+>/g, ""), // Remove HTML tags
      wordCount: result.wordcount,
      timestamp: result.timestamp,
    }));
  } catch (error) {
    console.error("Wikipedia search error:", error);
    return [];
  }
}

/**
 * Fetch full content for a Wikipedia page
 *
 * @param pageId - Page ID
 * @param options - Fetch options
 * @returns Page content
 */
export async function fetchWikipediaPage(
  pageId: number,
  options: {
    language?: WikipediaLanguage;
    maxContentLength?: number;
  } = {}
): Promise<WikipediaPage | null> {
  const {
    language = wikipediaConfig.defaults.language,
    maxContentLength = wikipediaConfig.defaults.maxContentLength,
  } = options;

  const apiUrl = wikipediaConfig.getApiUrl(language);

  // Fetch page content
  const contentParams = new URLSearchParams({
    ...wikipediaConfig.searchParams,
    prop: "extracts|info|categories|pageimages",
    pageids: pageId.toString(),
    explaintext: "true",
    exintro: "false", // Get full content
    inprop: "url",
    cllimit: "10",
    piprop: "thumbnail",
    pithumbsize: "500",
  });

  try {
    const response = await fetch(`${apiUrl}?${contentParams}`);
    if (!response.ok) {
      throw new Error(`Wikipedia fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const page = data.query?.pages?.[pageId];

    if (!page || page.missing) {
      return null;
    }

    // Truncate content if needed
    let content = page.extract || "";
    if (content.length > maxContentLength) {
      content = content.substring(0, maxContentLength) + "...";
    }

    // Extract summary (first paragraph)
    const summary =
      content
        .split("\n\n")[0]
        ?.substring(0, wikipediaConfig.defaults.maxSummaryLength) || "";

    // Extract categories
    const categories = (page.categories || []).map((cat: any) =>
      cat.title.replace("Category:", "")
    );

    return {
      pageId: page.pageid,
      title: page.title,
      content,
      summary,
      url: page.fullurl,
      categories,
      imageUrl: page.thumbnail?.source,
      lastModified: page.touched,
      wordCount: page.length || 0,
      language,
    };
  } catch (error) {
    console.error("Wikipedia page fetch error:", error);
    return null;
  }
}

/**
 * Query Wikipedia with search and content fetching
 *
 * @param query - Search query
 * @param options - Query options
 * @returns Complete query response with pages and search results
 */
export async function queryWikipedia(
  query: string,
  options: {
    language?: WikipediaLanguage;
    topKResults?: number;
    maxContentLength?: number;
  } = {}
): Promise<WikipediaQueryResponse> {
  const {
    language = wikipediaConfig.defaults.language,
    topKResults = wikipediaConfig.defaults.topKResults,
    maxContentLength = wikipediaConfig.defaults.maxContentLength,
  } = options;

  // First, search for pages
  const searchResults = await searchWikipedia(query, {
    language,
    limit: topKResults,
  });

  // Then fetch content for each result
  const pages = await Promise.all(
    searchResults.map((result) =>
      fetchWikipediaPage(result.pageId, { language, maxContentLength })
    )
  );

  // Filter out null pages
  const validPages = pages.filter(
    (page): page is WikipediaPage => page !== null
  );

  return {
    pages: validPages,
    searchResults,
    query,
    language,
    totalResults: searchResults.length,
  };
}
