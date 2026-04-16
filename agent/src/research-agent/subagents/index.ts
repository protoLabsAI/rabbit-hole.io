/**
 * Deep Agent Subagents
 */

import {
  buildEvidenceGathererGraph,
  buildEntityExtractorGraph,
  buildFieldAnalyzerGraph,
  buildEntityCreatorGraph,
  buildRelationshipMapperGraph,
  buildBundleAssemblerGraph,
} from "@protolabsai/deepagent/subagents";

export {
  buildEvidenceGathererGraph,
  buildEntityExtractorGraph,
  buildFieldAnalyzerGraph,
  buildEntityCreatorGraph,
  buildRelationshipMapperGraph,
  buildBundleAssemblerGraph,
};

export const deepAgentSubgraphBuilders = [
  buildEvidenceGathererGraph,
  buildEntityExtractorGraph,
  buildFieldAnalyzerGraph,
  buildEntityCreatorGraph,
  buildRelationshipMapperGraph,
  buildBundleAssemblerGraph,
];
