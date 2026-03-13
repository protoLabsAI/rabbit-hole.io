import { tool } from "@langchain/core/tools";

import { entityResearchPlaygroundGraph } from "./graph";
import {
  EntityResearchPlaygroundSchema,
  type EntityResearchPlaygroundInput,
  type EntityResearchPlaygroundOutput,
} from "./schemas";
import type { EntityResearchPlaygroundState } from "./state";

/**
 * Entity Research Playground Workflow Tool
 *
 * Interactive workflow tool for entity extraction with real-time graph updates.
 * Optimized for playground use with:
 * - Field selection (defaults to 'basic' depth - required fields only)
 * - Real-time graph state broadcasting
 * - Quality metrics and validation
 * - Wikipedia data fetching
 * - LangExtract integration
 *
 * This tool can be called by agents or directly via API routes.
 *
 * @example
 * ```typescript
 * const result = await entityResearchPlaygroundTool.invoke({
 *   entityName: "Tesla Inc.",
 *   entityType: "Organization",
 *   selectedFields: ["founded_date", "industry"],
 *   researchDepth: "detailed",
 *   skipReview: true
 * });
 * ```
 */
export const entityResearchPlaygroundTool = tool(
  async (args): Promise<EntityResearchPlaygroundOutput> => {
    const {
      entityName,
      entityType,
      selectedFields = [],
      researchDepth = "basic",
      skipReview = false,
    } = args as EntityResearchPlaygroundInput;

    console.log(
      `🎮 Starting entity research playground workflow for: ${entityName}`
    );
    console.log(
      `📋 Type: ${entityType}, Depth: ${researchDepth}, Fields: ${selectedFields.length || "auto"}`
    );

    // Prepare initial state
    const initialState: Partial<EntityResearchPlaygroundState> = {
      config: {
        entityName,
        entityType,
        selectedFields,
        researchDepth,
        skipReview,
      },
      wikipediaData: {
        content: "",
        sourceUrl: "",
        retrievedAt: "",
        contentLength: 0,
        fetchSuccess: false,
      },
      extraction: {
        extractionMethod: "langextract",
        fieldsExtracted: [],
        propertiesCount: 0,
      },
      report: {
        success: false,
        confidence: 0,
        completeness: 0,
        reliability: 0,
        warnings: [],
        errors: [],
        dataGaps: [],
        summary: "",
      },
      metadata: {
        startTime: Date.now(),
        endTime: 0,
        processingDuration: 0,
        currentNode: "start",
        nodesExecuted: [],
        retryCount: 0,
      },
    };

    try {
      console.log(`🚀 Invoking entity research playground graph...`);

      // Execute workflow
      const result = await entityResearchPlaygroundGraph.invoke(initialState);

      // Check for errors
      if (result.report?.errors && result.report.errors.length > 0) {
        console.error(`❌ Workflow errors:`, result.report.errors);
      }

      // Check for success
      if (!result.report?.success) {
        console.warn(`⚠️ Workflow completed but was not successful`);
      }

      console.log(
        `✅ Entity research playground workflow completed for: ${entityName}`
      );
      console.log(
        `📊 Extracted: ${result.extraction?.propertiesCount || 0} properties, ` +
          `Confidence: ${(result.report.confidence * 100).toFixed(0)}%, ` +
          `Completeness: ${(result.report.completeness * 100).toFixed(0)}%`
      );

      // Return structured output
      const output: EntityResearchPlaygroundOutput = {
        success: result.report.success,
        entity: result.extraction?.entity,
        entityName,
        entityType,
        metrics: {
          confidence: result.report.confidence,
          completeness: result.report.completeness,
          reliability: result.report.reliability,
          fieldsExtracted: result.extraction?.fieldsExtracted.length || 0,
          fieldsRequested: selectedFields.length,
          processingTime: result.metadata.processingDuration,
        },
        warnings: result.report.warnings || [],
        errors: result.report.errors || [],
        dataGaps: result.report.dataGaps || [],
      };

      return output;
    } catch (error) {
      console.error(
        `❌ Entity research playground workflow failed for ${entityName}:`,
        error
      );

      // Return error response
      return {
        success: false,
        entityName,
        entityType,
        metrics: {
          confidence: 0,
          completeness: 0,
          reliability: 0,
          fieldsExtracted: 0,
          fieldsRequested: selectedFields.length,
          processingTime: Date.now() - initialState.metadata!.startTime,
        },
        warnings: [],
        errors: [`Workflow execution failed: ${error}`],
        dataGaps: [],
      };
    }
  },
  {
    name: "entityResearchPlayground",
    description:
      "Interactive entity research tool with real-time graph updates. Extracts structured entity data from Wikipedia using LangExtract. Supports 77+ entity types across 12 domains with field-level control and quality metrics. Returns entity with confidence, completeness, and reliability scores.",
    schema: EntityResearchPlaygroundSchema,
  }
);

// Re-export types and schemas for convenience
export {
  EntityResearchPlaygroundSchema,
  FieldSelectionSchema,
  EntityResearchPlaygroundOutputSchema,
  type EntityResearchPlaygroundInput,
  type EntityResearchPlaygroundOutput,
  type FieldSelectionInput,
} from "./schemas";
export type {
  EntityResearchPlaygroundState,
  GraphNodeData,
  GraphUpdateEvent,
} from "./state";
export { isGraphNodeData } from "./state";
