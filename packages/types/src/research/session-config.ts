/**
 * Research Session Configuration
 *
 * Controls depth, breadth, and search provider selection for a research session.
 */

export type ResearchDepth = "basic" | "detailed" | "comprehensive";

export interface ResearchSessionConfig {
  /** Controls iteration strategy: basic=1 pass, detailed=gap-fill, comprehensive=recursive tree */
  depth: ResearchDepth;
  /** Maximum number of entities to discover (default: 50) */
  maxEntities: number;
  /** Maximum recursion depth for comprehensive mode (default: 3) */
  maxDepth: number;
  /** Which search providers to use (default: all) */
  searchProviders: string[];
}

export const DEFAULT_RESEARCH_SESSION_CONFIG: ResearchSessionConfig = {
  depth: "detailed",
  maxEntities: 50,
  maxDepth: 3,
  searchProviders: ["tavily", "duckduckgo", "wikipedia"],
};
