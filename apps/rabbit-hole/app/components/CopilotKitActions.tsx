"use client";

import { useUser } from "@clerk/nextjs";
import { useCopilotAction } from "@copilotkit/react-core";

/**
 * CopilotKit Actions for Rabbit Hole Atlas
 * Defines AI actions available throughout the application
 * Only available to authenticated users
 */
export function CopilotKitActions() {
  const { isSignedIn } = useUser();

  // Only register actions for authenticated users
  const actionAvailability = isSignedIn ? "enabled" : "disabled";

  // Research Entity Action
  useCopilotAction({
    name: "research_entity",
    description:
      "Research any entity (person, organization, platform, movement, event) using AI",
    parameters: [
      {
        name: "entityName",
        type: "string",
        description: "Name of the entity to research",
        required: true,
      },
      {
        name: "entityType",
        type: "string",
        description:
          "Type of entity: Person, Organization, Platform, Movement, or Event",
        required: false,
      },
      {
        name: "researchDepth",
        type: "string",
        description: "Research depth: basic, detailed, or comprehensive",
        required: false,
      },
    ],
    handler: async ({ entityName, entityType, researchDepth }) => {
      try {
        console.log(
          `🤖 AI Research triggered: ${entityName} (${entityType || "auto-detect"})`
        );

        // Call the universal entity research API
        const response = await fetch("/api/research/entity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetEntityName: entityName,
            entityType: entityType || undefined, // Let AI auto-detect if not specified
            researchDepth: researchDepth || "detailed",
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Optionally auto-ingest the research results
          const ingestResponse = await fetch("/api/ingest-bundle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entities: result.entities,
              relationships: result.relationships,
              evidence: result.evidence,
            }),
          });

          if (ingestResponse.ok) {
            return `Successfully researched and added ${entityName} to the knowledge graph. Confidence: ${Math.round((result.metadata?.confidenceScore || 0) * 100)}%. Found ${result.entities?.length || 0} entities and ${result.relationships?.length || 0} relationships.`;
          } else {
            return `Researched ${entityName} successfully but failed to add to knowledge graph. You can review the results and add manually.`;
          }
        } else {
          return `Failed to research ${entityName}: ${result.error || "Unknown error"}`;
        }
      } catch (error) {
        console.error("Research action failed:", error);
        return `Error researching ${entityName}: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });

  // Timeline Analysis Action
  useCopilotAction({
    name: "analyze_entity_timeline",
    description:
      "Analyze the timeline and relationships of an entity in the knowledge graph",
    available: actionAvailability,
    parameters: [
      {
        name: "entityUid",
        type: "string",
        description: "Entity UID (e.g., person:donald_trump, org:tesla)",
        required: true,
      },
    ],
    handler: async ({ entityUid }) => {
      try {
        console.log(`🤖 Timeline analysis triggered: ${entityUid}`);

        const response = await fetch(`/api/entity-timeline/${entityUid}`);
        const result = await response.json();

        if (result.success) {
          const { timeline, summary } = result.data;

          return `Timeline analysis for ${entityUid}:
            
            📊 Summary:
            - Total events: ${summary.totalEvents}
            - Date range: ${summary.dateRange.earliest} to ${summary.dateRange.latest}
            - Event types: ${Object.keys(summary.eventCategories).join(", ")}
            - Placeholder events: ${summary.placeholderEvents} (need research)
            
            🔍 Recent events:
            ${timeline
              .slice(0, 3)
              .map(
                (event: any) =>
                  `- ${event.timestamp}: ${event.title} (${event.category})`
              )
              .join("\n")}
            
            ⚠️ Research gaps: ${summary.intrinsicPlaceholders} missing intrinsic dates, ${summary.temporalPlaceholders} missing relationship dates`;
        } else {
          return `Failed to analyze timeline for ${entityUid}: ${result.error}`;
        }
      } catch (error) {
        console.error("Timeline analysis failed:", error);
        return `Error analyzing timeline: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });

  // Network Exploration Action
  useCopilotAction({
    name: "explore_entity_network",
    description: "Explore the network connections around a specific entity",
    available: actionAvailability,
    parameters: [
      {
        name: "entityUid",
        type: "string",
        description: "Entity UID to center the network exploration on",
        required: true,
      },
      {
        name: "nodeLimit",
        type: "number",
        description:
          "Maximum number of connected entities to show (default: 50)",
        required: false,
      },
      {
        name: "hops",
        type: "number",
        description: "Number of relationship hops to explore (1-2, default: 1)",
        required: false,
      },
    ],
    handler: async ({ entityUid, nodeLimit, hops }) => {
      try {
        console.log(`🤖 Network exploration triggered: ${entityUid}`);

        const params = new URLSearchParams();
        if (nodeLimit) params.set("nodeLimit", nodeLimit.toString());
        if (hops) params.set("hops", hops.toString());

        const response = await fetch(
          `/api/graph-tiles/ego/${entityUid}?${params}`
        );
        const result = await response.json();

        if (result.success) {
          const { center, nodes, edges, meta } = result.data;

          return `Network exploration for ${center.display?.title || entityUid}:
            
            📊 Network Stats:
            - Connected entities: ${nodes.length}
            - Relationships: ${edges.length}
            - Community: ${center.communityId || "Unknown"}
            - Network bounded: ${meta.bounded ? "Yes" : "No"}
            
            🔗 Connected Entity Types:
            ${Object.entries(
              nodes.reduce((acc: Record<string, number>, node: any) => {
                acc[node.entityType] = (acc[node.entityType] || 0) + 1;
                return acc;
              }, {})
            )
              .map(([type, count]) => `- ${type}: ${count}`)
              .join("\n")}
            
            🎯 Relationship Types:
            ${Object.entries(
              edges.reduce((acc: Record<string, number>, edge: any) => {
                acc[edge.type] = (acc[edge.type] || 0) + 1;
                return acc;
              }, {})
            )
              .map(([type, count]) => `- ${type}: ${count}`)
              .join("\n")}`;
        } else {
          return `Failed to explore network for ${entityUid}: ${result.error}`;
        }
      } catch (error) {
        console.error("Network exploration failed:", error);
        return `Error exploring network: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });

  // This component doesn't render anything visible
  return null;
}

export default CopilotKitActions;
