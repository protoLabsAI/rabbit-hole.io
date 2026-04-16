import crypto from "crypto";

import { tool } from "@langchain/core/tools";
import * as z from "zod";

import {
  EVENT_TYPES,
  SIGNIFICANCE_LEVELS,
  MEDIA_COVERAGE_LEVELS,
} from "@protolabsai/types";
import {
  generateEventUID,
  isValidDate,
  isDateInRange,
} from "@protolabsai/utils";

import { langextractConfig } from "../../../config/langextract-config";
import { enqueueLangExtract } from "../../../utils/enqueueLangExtract";
import { getEnrichmentExample } from "../../../utils/getEnrichmentExample";

/**
 * Discovered Event Schema
 */
const DiscoveredEventSchema = z.object({
  uid: z.string().describe("Unique identifier (event:normalized_name)"),
  type: z.literal("Event").describe("Entity type"),
  name: z.string().describe("Event name/title"),
  eventType: z
    .enum(EVENT_TYPES)
    .optional()
    .describe("Type of event (rally, meeting, incident, etc.)"),
  date: z.string().optional().describe("Event date (YYYY-MM-DD)"),
  endDate: z
    .string()
    .optional()
    .describe("Event end date if multi-day (YYYY-MM-DD)"),
  significance: z
    .enum(SIGNIFICANCE_LEVELS)
    .optional()
    .describe("Importance level"),
  description: z.string().optional().describe("Event description/summary"),
  location: z
    .string()
    .optional()
    .describe("Event location (geography or venue)"),
  participants: z
    .array(z.string())
    .optional()
    .describe("UIDs of people/orgs who participated"),
  organizers: z
    .array(z.string())
    .optional()
    .describe("UIDs of event organizers"),
  outcome: z.string().optional().describe("Result/consequence of event"),
  media_coverage: z
    .enum(MEDIA_COVERAGE_LEVELS)
    .optional()
    .describe("Media attention level"),
  casualties: z.number().optional().describe("Casualty count if applicable"),
  economic_impact: z.number().optional().describe("Economic impact in USD"),
  confidence: z.number().min(0).max(1).describe("Confidence score (0-1)"),
  sourceText: z
    .string()
    .optional()
    .describe("Source text span where event was mentioned"),
  startChar: z
    .number()
    .optional()
    .describe("Start character position in source"),
  endChar: z.number().optional().describe("End character position in source"),
});

/**
 * Tool Input Schema for Event Discovery
 */
const DiscoverEventsInputSchema = z.object({
  content: z.string().describe("Text content to extract events from"),
  primaryEntityUid: z
    .string()
    .optional()
    .describe("UID of entity events relate to (e.g., 'person:donald_trump')"),
  primaryEntityName: z
    .string()
    .optional()
    .describe("Human name for better contextual matching"),
  eventTypes: z
    .array(z.enum(EVENT_TYPES))
    .optional()
    .describe(
      "Filter by eventType enum: rally, meeting, incident, election, conference, protest, etc."
    ),
  dateRange: z
    .object({
      from: z.string().describe("Start date (YYYY-MM-DD)"),
      to: z.string().describe("End date (YYYY-MM-DD)"),
    })
    .optional()
    .describe("Filter events within date range"),
  significance: z
    .array(z.enum(SIGNIFICANCE_LEVELS))
    .optional()
    .describe(
      "Filter by significance: minor, moderate, major, historic, catastrophic"
    ),
  maxEvents: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe("Maximum events to return"),
  modelId: z
    .string()
    .optional()
    .describe("LLM model ID (defaults to langextractConfig.defaults.modelId)"),
  temperature: z
    .number()
    .min(0)
    .max(2)
    .optional()
    .describe("Model temperature for extraction"),
  includeSourceGrounding: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include source text spans where events were mentioned"),
  confidenceThreshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.7)
    .describe("Minimum confidence score (0-1)"),
});

/**
 * Tool Output Schema
 */
const DiscoverEventsOutputSchema = z.object({
  success: z.boolean(),
  events: z.array(DiscoveredEventSchema),
  metadata: z.object({
    totalFound: z.number(),
    returned: z.number(),
    eventTypes: z.array(z.string()),
    modelUsed: z.string(),
    contentLength: z.number(),
    processingTime: z.number(),
  }),
});

/**
 * Get event examples from domain config
 *
 * Retrieves Event enrichment example from social domain config.
 * This provides domain-consistent examples rather than hardcoded ones.
 */
function getEventExamples(): Array<{
  input_text: string;
  expected_output: any;
}> {
  // Get Event enrichment example from social domain config
  const example = getEnrichmentExample("Event", "social");
  return [example];
}

/**
 * Build extraction prompt
 */
function buildExtractionPrompt(
  primaryEntityName: string | undefined,
  eventTypes?: string[],
  dateRange?: { from: string; to: string }
): string {
  const entityContext = primaryEntityName
    ? `that involve or relate to ${primaryEntityName}`
    : "mentioned in this text";

  let prompt = `Extract all events ${entityContext}.

Events should include:
- Political/social events (rallies, protests, conferences, elections, meetings, incidents)
- Legal proceedings and investigations
- Business events (acquisitions, mergers, IPOs, bankruptcies)
- Significant announcements or crises
- Milestones and celebrations

For each event, capture:
- Event name/title
- Event type (from provided list)
- Date(s) if mentioned (YYYY-MM-DD format)
- Location if mentioned
- Participants/organizers
- Significance level (minor, moderate, major, historic, catastrophic)
- Description/outcome
- Media coverage level (none, minimal, moderate, extensive, global)`;

  if (eventTypes && eventTypes.length > 0) {
    prompt += `\n\nFilter by eventTypes: ${eventTypes.join(", ")}`;
  } else {
    prompt += `\n\nInclude all event types.`;
  }

  if (dateRange) {
    prompt += `\n\nDate range: ${dateRange.from} to ${dateRange.to}`;
  }

  return prompt;
}

/**
 * Event Discovery Tool
 *
 * Discovers events in text content associated with a primary entity.
 * Uses LangExtract for intelligent event extraction with filtering.
 *
 * @core tool
 */
export const discoverEventsTool = tool(
  async (input: z.infer<typeof DiscoverEventsInputSchema>) => {
    const startTime = Date.now();
    const {
      content,
      primaryEntityUid,
      primaryEntityName,
      eventTypes,
      dateRange,
      significance,
      maxEvents = 50,
      modelId = langextractConfig.defaults.modelId,
      temperature,
      includeSourceGrounding = true,
      confidenceThreshold = 0.7,
    } = input;

    // Validate date range if provided
    if (dateRange) {
      if (!isValidDate(dateRange.from) || !isValidDate(dateRange.to)) {
        return {
          success: false,
          events: [],
          metadata: {
            totalFound: 0,
            returned: 0,
            eventTypes: eventTypes || [],
            modelUsed: modelId,
            contentLength: content.length,
            processingTime: Date.now() - startTime,
          },
          error: "Invalid date range format. Use YYYY-MM-DD.",
        };
      }
      if (dateRange.from > dateRange.to) {
        return {
          success: false,
          events: [],
          metadata: {
            totalFound: 0,
            returned: 0,
            eventTypes: eventTypes || [],
            modelUsed: modelId,
            contentLength: content.length,
            processingTime: Date.now() - startTime,
          },
          error: "Invalid date range: 'from' must be <= 'to'.",
        };
      }
    }

    console.log(`🔍 Discovering events in ${content.length} character content`);
    console.log(`   Primary entity: ${primaryEntityUid}`);
    if (eventTypes) console.log(`   Event types filter: ${eventTypes.length}`);
    console.log(`   Max events: ${maxEvents}`);

    try {
      // Build extraction components
      const entityName =
        primaryEntityName ||
        (primaryEntityUid ? primaryEntityUid.split(":")[1] : undefined);
      const extractionPrompt = buildExtractionPrompt(
        entityName,
        eventTypes,
        dateRange
      );
      const examples = getEventExamples();

      // Call langextract
      const result = await enqueueLangExtract({
        textContent: content,
        extractionPrompt,
        modelId,
        temperature,
        includeSourceGrounding,
        useSchemaConstraints: false,
        examples,
      });

      // Process results
      const eventsMap = new Map<string, any>();
      const sourceGroundingMap = new Map<string, any>();

      // Extract events and deduplicate
      const eventEntities = result.data?.event || [];
      if (Array.isArray(eventEntities)) {
        for (const event of eventEntities) {
          const eventName = event.name || event._extraction_text;
          if (!eventName) continue;

          // Generate UID with error handling for malformed dates
          let uid: string;
          try {
            uid = generateEventUID(eventName, event.date);
          } catch (error) {
            console.debug(
              `⚠️ Failed to generate UID for event "${eventName}" with date "${event.date}": ${error instanceof Error ? error.message : String(error)}`
            );
            // Fallback: create a hash-based UID for invalid dates
            const hash = crypto
              .createHash("sha256")
              .update(`${eventName}:invalid-date`)
              .digest("hex")
              .substring(0, 16);
            uid = `event:${eventName
              .toLowerCase()
              .replace(/\s+/g, "_")
              .replace(/[^a-z0-9_]/g, "")}_${hash}`;
            console.debug(`   Fallback UID generated: ${uid}`);
          }

          // Deduplicate - keep highest confidence
          const existing = eventsMap.get(uid);
          const eventConfidence = event.confidence ?? 0.85;

          if (!existing || eventConfidence > existing.confidence) {
            eventsMap.set(uid, {
              uid,
              type: "Event" as const,
              name: eventName,
              eventType: event.eventType,
              date: event.date,
              endDate: event.endDate,
              significance: event.significance,
              description: event.description,
              location: event.location,
              participants: event.participants,
              organizers: event.organizers,
              outcome: event.outcome,
              media_coverage: event.media_coverage,
              casualties: event.casualties,
              economic_impact: event.economic_impact,
              confidence: eventConfidence,
            });
          }
        }
      }

      // Build source grounding map with robust word-boundary matching
      if (result.source_grounding) {
        // Precompute normalized event names and tokenize for efficient matching
        const eventIndex = new Map<
          string,
          { uid: string; name: string; tokens: Set<string> }
        >();

        for (const [uid, event] of eventsMap.entries()) {
          // Normalize and tokenize event name (lowercase, split on word boundaries)
          const normalized = event.name.toLowerCase();
          const tokens = new Set(
            (normalized.match(/\b\w+\b/g) || []) as string[]
          );
          eventIndex.set(uid, { uid, name: event.name, tokens });
        }

        for (const sg of result.source_grounding) {
          const text = sg.text_span || sg.sourceText;
          if (!text) continue;

          // Normalize grounding text
          const normalizedSG = text.toLowerCase();
          const sgTokens = new Set(
            (normalizedSG.match(/\b\w+\b/g) || []) as string[]
          );

          // Find best match: prefer highest token overlap, then longest event name
          let bestMatch: {
            uid: string;
            overlap: number;
            nameLength: number;
          } | null = null;

          for (const [uid, eventData] of eventIndex.entries()) {
            // Calculate token overlap (intersection size)
            let overlap = 0;
            for (const token of eventData.tokens) {
              if (sgTokens.has(token)) {
                overlap++;
              }
            }

            // Only consider matches with meaningful overlap (at least 1 token)
            if (overlap > 0) {
              if (
                !bestMatch ||
                overlap > bestMatch.overlap ||
                (overlap === bestMatch.overlap &&
                  eventData.name.length > bestMatch.nameLength)
              ) {
                bestMatch = {
                  uid,
                  overlap,
                  nameLength: eventData.name.length,
                };
              }
            }
          }

          // Store grounding only if we found a meaningful match
          if (bestMatch) {
            sourceGroundingMap.set(bestMatch.uid, {
              sourceText: text,
              startChar: sg.start_char || sg.startChar,
              endChar: sg.end_char || sg.endChar,
            });
          }
        }
      }

      // Apply filters
      let events = Array.from(eventsMap.values());

      // Filter by confidence threshold
      events = events.filter(
        (event) => event.confidence >= confidenceThreshold
      );

      // Filter by eventTypes
      if (eventTypes && eventTypes.length > 0) {
        const eventTypesSet = new Set(eventTypes);
        events = events.filter(
          (event) => event.eventType && eventTypesSet.has(event.eventType)
        );
      }

      // Filter by date range
      if (dateRange) {
        events = events.filter((event) => {
          if (!event.date) return false;
          return isDateInRange(event.date, dateRange);
        });
      }

      // Filter by significance
      if (significance && significance.length > 0) {
        const significanceSet = new Set(significance);
        events = events.filter(
          (event) =>
            event.significance && significanceSet.has(event.significance)
        );
      }

      console.log(`   Found ${events.length} events (after filters)`);

      // Sort by date (most recent first)
      events.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
      });

      // Apply maxEvents limit
      const totalFound = events.length;
      if (events.length > maxEvents) {
        console.log(
          `   Limiting: ${events.length} found → ${maxEvents} returned`
        );
        events = events.slice(0, maxEvents);
      }

      // Merge source grounding into events
      const eventsWithGrounding = events.map((event) => {
        const grounding = sourceGroundingMap.get(event.uid);
        return {
          ...event,
          ...(grounding || {}),
        };
      });

      const processingTime = Date.now() - startTime;
      console.log(
        `✅ Discovery complete: ${eventsWithGrounding.length} events returned (${processingTime}ms)`
      );

      return {
        success: true,
        events: eventsWithGrounding,
        metadata: {
          totalFound,
          returned: eventsWithGrounding.length,
          eventTypes: eventTypes || EVENT_TYPES.slice(),
          modelUsed: modelId,
          contentLength: content.length,
          processingTime,
        },
      };
    } catch (error) {
      console.error(`❌ Event discovery failed:`, error);

      return {
        success: false,
        events: [],
        metadata: {
          totalFound: 0,
          returned: 0,
          eventTypes: eventTypes || [],
          modelUsed: modelId,
          contentLength: content.length,
          processingTime: Date.now() - startTime,
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
  {
    name: "discover_events",
    description:
      "Discover events in text content associated with a primary entity. Returns structured events with types, dates, significance, participants, and optional source grounding. Supports filtering by event types, date ranges, and significance levels.",
    schema: DiscoverEventsInputSchema,
  }
);

/**
 * Schema exports for API routes
 */
export { DiscoverEventsInputSchema, DiscoverEventsOutputSchema };

/**
 * Type exports for consumers
 */
export type DiscoverEventsInput = z.infer<typeof DiscoverEventsInputSchema>;
export type DiscoverEventsOutput = z.infer<typeof DiscoverEventsOutputSchema>;
export type DiscoveredEvent = z.infer<typeof DiscoveredEventSchema>;
