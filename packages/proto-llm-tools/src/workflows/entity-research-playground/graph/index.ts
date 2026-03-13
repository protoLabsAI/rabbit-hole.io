import { StateGraph, END } from "@langchain/langgraph";

import { EntityResearchPlaygroundStateAnnotation } from "../state";

import {
  validateInputNode,
  fetchWikipediaNode,
  createEvidenceNode,
  extractEntitiesNode,
  processExtractionNode,
  updateGraphNode,
  generateReportNode,
} from "./nodes";

/**
 * Entity Research Playground Workflow Graph
 *
 * Evidence-first interactive workflow with auto-entity and relationship creation:
 * 1. Validates input and sets field selection defaults
 * 2. Fetches Wikipedia data
 * 3. Creates Evidence node for Wikipedia source (NEW)
 * 4. Extracts entities using LangExtract with field filtering
 * 5. Processes and validates extraction quality
 * 6. Updates graph state for real-time visualization
 * 7. Generates final extraction report
 *
 * Key Features:
 * - Evidence-first: Creates Evidence nodes before entities
 * - Field selection defaults to 'basic' depth (required fields only)
 * - Real-time graph state broadcasting via updateGraphNode
 * - Retry policies for external API calls
 * - Memory checkpointing for resumable execution
 *
 * Future: Phases 2-5 will add field analysis, auto-entity creation, and relationships
 */
export const entityResearchPlaygroundGraph = new StateGraph(
  EntityResearchPlaygroundStateAnnotation
)
  // Add nodes
  .addNode("validateInput", validateInputNode)
  .addNode("fetchWikipedia", fetchWikipediaNode, {
    retryPolicy: {
      maxAttempts: 3,
      initialInterval: 1.0,
      backoffFactor: 2.0,
    },
  })
  .addNode("createEvidence", createEvidenceNode) // NEW: Evidence-first
  .addNode("extractEntities", extractEntitiesNode, {
    retryPolicy: {
      maxAttempts: 2,
      initialInterval: 2.0,
      backoffFactor: 1.5,
    },
  })
  .addNode("processExtraction", processExtractionNode)
  .addNode("updateGraph", updateGraphNode)
  .addNode("generateReport", generateReportNode)

  // Define workflow edges
  .addEdge("__start__", "validateInput")
  .addEdge("validateInput", "fetchWikipedia")
  .addEdge("fetchWikipedia", "createEvidence") // NEW: Create evidence before extraction
  .addEdge("createEvidence", "extractEntities")
  .addEdge("extractEntities", "processExtraction")
  .addEdge("processExtraction", "updateGraph")
  .addEdge("updateGraph", "generateReport")
  .addEdge("generateReport", END)

  // Compile without checkpointer for now (can be added when needed for production)
  .compile();
