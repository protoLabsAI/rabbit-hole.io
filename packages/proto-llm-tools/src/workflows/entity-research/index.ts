import { tool } from "@langchain/core/tools";

import type { EntityResearchInput, EntityResearchOutput } from "@proto/types";

import { entityResearchGraph } from "./graph";
import { EntityResearchSchema } from "./schemas";
import { EntityResearchState } from "./state";

/**
 * Universal Entity Research Workflow Tool
 *
 * This tool wraps the entity research LangGraph workflow and can research
 * any type of entity (Person, Organization, Platform, Movement, Event).
 *
 * It automatically detects entity type, selects appropriate research tools,
 * and generates Rabbit Hole compatible output bundles.
 */
export const entityResearchTool = tool(
  async (args): Promise<EntityResearchOutput> => {
    const input = args as any;
    const {
      targetEntityName,
      entityType, // Optional - will be auto-detected if not provided
      researchDepth = "detailed",
      focusAreas = ["biographical", "business", "relationships"],
      rawData = [],
      existingEntities = [],
      existingRelationships = [],
      dataSourceConfig = { userProvided: { enabled: true } },
    } = input as EntityResearchInput;

    console.log(
      `🔬 Starting entity research workflow for: ${targetEntityName}`
    );
    console.log(
      `📋 Entity type: ${entityType || "auto-detect"}, Depth: ${researchDepth}`
    );
    console.log(
      `📊 Raw data sources: ${rawData.length}, Focus areas: ${focusAreas.join(
        ", "
      )}`
    );

    // Handle automatic Wikipedia research if no rawData provided
    if (rawData.length === 0) {
      console.log(
        `📚 No raw data provided for ${targetEntityName} - workflow will auto-fetch from Wikipedia`
      );
    }

    // Prepare initial workflow state using new grouped structure
    const initialState: Partial<EntityResearchState> = {
      input: {
        targetEntityName,
        entityType,
        researchDepth,
        focusAreas,
        inputData: rawData,
        existingEntities,
        existingRelationships,
        dataSourceConfig,
      },
      processing: {
        entityTypeConfidence: 0,
        researchMethod: "ai_extraction" as const,
      },
      output: {
        generatedEntities: [],
        generatedRelationships: [],
        generatedEvidence: [],
        confidenceScore: 0,
        completenessScore: 0,
        reliabilityScore: 0,
        dataGaps: [],
        warnings: [],
        errors: [],
      },
      metadata: {
        processingStartTime: Date.now(),
        processingEndTime: 0,
        sourcesProcessed: rawData.length,
        modelUsed: "gpt-4",
      },
    };

    try {
      console.log(`🚀 Invoking entity research workflow graph...`);

      // Execute the workflow graph
      const result = await entityResearchGraph.invoke(initialState);

      // Check for errors in the workflow execution
      if (result.output?.errors && result.output.errors.length > 0) {
        console.error(
          `❌ Workflow execution had errors:`,
          result.output.errors
        );
        throw new Error(`Workflow errors: ${result.output.errors.join("; ")}`);
      }

      // Ensure we have a research output
      if (!result.output?.researchOutput) {
        throw new Error("Workflow completed but produced no research output");
      }

      console.log(
        `✅ Entity research workflow completed successfully for: ${targetEntityName}`
      );
      console.log(
        `📊 Generated: ${result.output.researchOutput.entities.length} entities, ${result.output.researchOutput.relationships.length} relationships`
      );

      return result.output.researchOutput;
    } catch (error) {
      console.error(
        `❌ Entity research workflow failed for ${targetEntityName}:`,
        error
      );

      // Return structured error response
      return {
        success: false,
        targetEntityName,
        detectedEntityType: entityType || "Organization",
        entities: [],
        relationships: [],
        evidence: [],
        metadata: {
          researchMethod: "fallback_parsing",
          confidenceScore: 0,
          sourcesConsulted: rawData.map((d) => d.source),
          processingTime:
            Date.now() -
            (initialState.metadata?.processingStartTime || Date.now()),
          entityTypeDetectionConfidence: 0,
          propertiesExtracted: [],
          relationshipsDiscovered: 0,
          dataGaps: ["Workflow execution failed"],
          warnings: [`Workflow execution error: ${error}`],
        },
      };
    }
  },
  {
    name: "entityResearchWorkflow",
    description:
      "Universal entity research tool that can research any entity type (Person, Organization, Platform, Movement, Event) using AI-powered extraction and generates Rabbit Hole compatible bundles",
    schema: EntityResearchSchema,
  }
);
