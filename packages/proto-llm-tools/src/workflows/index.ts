/**
 * Proto LLM Workflows
 *
 * Collection of LangGraph workflow tools that can be invoked
 * independently or used by other agents.
 */

// Universal Entity Research Workflow (supports all entity types)
export { entityResearchTool } from "./entity-research";

// Entity Research Playground Workflow (Interactive with real-time graph updates)
export { entityResearchPlaygroundTool } from "./entity-research-playground";
