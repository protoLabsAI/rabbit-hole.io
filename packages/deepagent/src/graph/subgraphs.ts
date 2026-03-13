/**
 * Subgraph Builders
 */

import type { StructuredTool } from "@langchain/core/tools";

import {
  EVIDENCE_GATHERER_PROMPT,
  ENTITY_EXTRACTOR_PROMPT,
  FIELD_ANALYZER_PROMPT,
  ENTITY_CREATOR_PROMPT,
  RELATIONSHIP_MAPPER_PROMPT,
  BUNDLE_ASSEMBLER_PROMPT,
} from "../prompts";
import { getSubmitOutputTool } from "../utils/submit-output-tools";

import { buildSubagentGraph } from "./build-subagent";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Model = any;

export function buildEvidenceGathererGraph(
  model: Model,
  tools: Record<string, StructuredTool>
) {
  return buildSubagentGraph({
    name: "evidence-gatherer",
    prompt: EVIDENCE_GATHERER_PROMPT,
    tools: [
      tools["wikipedia_fetch"],
      tools["tavily_search"],
      tools["duckduckgo_search"],
      getSubmitOutputTool("evidence-gatherer"),
    ].filter(Boolean) as StructuredTool[],
    model,
  });
}

export function buildEntityExtractorGraph(
  model: Model,
  tools: Record<string, StructuredTool>
) {
  return buildSubagentGraph({
    name: "entity-extractor",
    prompt: ENTITY_EXTRACTOR_PROMPT,
    tools: [
      tools["read_file"],
      tools["langextract_wrapper"],
      getSubmitOutputTool("entity-extractor"),
    ].filter(Boolean) as StructuredTool[],
    model,
  });
}

export function buildFieldAnalyzerGraph(
  model: Model,
  tools: Record<string, StructuredTool>
) {
  return buildSubagentGraph({
    name: "field-analyzer",
    prompt: FIELD_ANALYZER_PROMPT,
    tools: [
      tools["read_file"],
      tools["batch_field_mapping_lookup"],
      getSubmitOutputTool("field-analyzer"),
    ].filter(Boolean) as StructuredTool[],
    model,
  });
}

export function buildEntityCreatorGraph(
  model: Model,
  tools: Record<string, StructuredTool>
) {
  return buildSubagentGraph({
    name: "entity-creator",
    prompt: ENTITY_CREATOR_PROMPT,
    tools: [tools["read_file"], getSubmitOutputTool("entity-creator")].filter(
      Boolean
    ) as StructuredTool[],
    model,
  });
}

export function buildRelationshipMapperGraph(
  model: Model,
  tools: Record<string, StructuredTool>
) {
  return buildSubagentGraph({
    name: "relationship-mapper",
    prompt: RELATIONSHIP_MAPPER_PROMPT,
    tools: [
      tools["read_file"],
      getSubmitOutputTool("relationship-mapper"),
    ].filter(Boolean) as StructuredTool[],
    model,
  });
}

export function buildBundleAssemblerGraph(
  model: Model,
  tools: Record<string, StructuredTool>
) {
  return buildSubagentGraph({
    name: "bundle-assembler",
    prompt: BUNDLE_ASSEMBLER_PROMPT,
    tools: [
      tools["read_file"],
      tools["validate_bundle"],
      getSubmitOutputTool("bundle-assembler"),
    ].filter(Boolean) as StructuredTool[],
    model,
  });
}
