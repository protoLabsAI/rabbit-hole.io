/**
 * Research Agent Tools
 * Shared tools for research agent supervisor/subagent pattern
 */

export { wikipediaSearchTool } from "./wikipedia-search";
export {
  submitSearchResultsTool,
  SearchOutputSchema,
  type SearchOutput,
} from "./submit-search-results";
export {
  submitEntityBundleTool,
  EntityBundleSchema,
  type EntityBundle,
} from "./submit-entity-bundle";
