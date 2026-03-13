import type { DomainConfig } from "../../domain-system";

import {
  evidenceCardConfig,
  contentCardConfig,
  fileCardConfig,
} from "./card.config";
import { EvidenceSchema, ContentSchema, FileSchema } from "./evidence.schema";

/**
 * Core Domain Configuration
 *
 * Handles Evidence, Content, and File types - foundational system types
 * that support all other domains.
 */
export const coreDomainConfig: DomainConfig = {
  name: "core",
  displayName: "Core",
  description: "Core system types: Evidence, Content, and Files",
  category: "core",

  entities: {
    Evidence: EvidenceSchema,
    Content: ContentSchema,
    File: FileSchema,
  },

  enrichmentExamples: {
    Evidence: {
      input_text:
        "A Washington Post article titled 'Climate Change Effects' was published on January 15, 2023 at https://washingtonpost.com/climate. The article was retrieved on January 16, 2023 and has been archived at https://archive.org/web/climate.",
      expected_output: {
        title: "Climate Change Effects",
        publisher: "Washington Post",
        date: "2023-01-15",
        url: "https://washingtonpost.com/climate",
        kind: "major_media",
        archive: ["https://archive.org/web/climate"],
      },
    },
    Content: {
      input_text:
        "A viral post was published on Twitter on March 10, 2024 at 14:30 UTC. The post discusses AI developments and contains the text: 'Breaking news about artificial intelligence breakthrough.'",
      expected_output: {
        content_type: "post",
        published_at: "2024-03-10T14:30:00Z",
        text_excerpt:
          "Breaking news about artificial intelligence breakthrough.",
      },
    },
    File: {
      input_text:
        "A PDF document with SHA256 hash sha256-abc123def456 was uploaded to the system. The file is 2.5 MB in size with MIME type application/pdf, stored in bucket research-docs with key documents/report-2024.pdf.",
      expected_output: {
        content_hash: "sha256-abc123def456",
        mime: "application/pdf",
        bytes: 2621440,
        bucket: "research-docs",
        key: "documents/report-2024.pdf",
      },
    },
  },

  relationshipExample: {
    input_text:
      "A Washington Post article evidences climate research findings published in 2023. The research findings support the anthropogenic climate change hypothesis. An original data file is attached to the evidence record for verification purposes. The article references the IPCC report and peer-reviewed studies. The climate research content references historical temperature data. The Washington Post article is supported by interviews with leading climate scientists. The IPCC report evidences global temperature trends. The research data file evidences the statistical analysis supporting the hypothesis.",
    expected_output: {
      relationships: [
        {
          source_entity: "Washington Post article",
          target_entity: "climate research findings",
          relationship_type: "EVIDENCES",
          start_date: "2023",
          confidence: 0.94,
        },
        {
          source_entity: "climate research findings",
          target_entity: "anthropogenic climate change hypothesis",
          relationship_type: "SUPPORTS",
          confidence: 0.92,
        },
        {
          source_entity: "data file",
          target_entity: "evidence record",
          relationship_type: "ATTACHED_TO",
          confidence: 0.97,
        },
        {
          source_entity: "Washington Post article",
          target_entity: "IPCC report",
          relationship_type: "REFERENCES",
          confidence: 0.89,
        },
        {
          source_entity: "climate research content",
          target_entity: "historical temperature data",
          relationship_type: "REFERENCES",
          confidence: 0.91,
        },
        {
          source_entity: "Washington Post article",
          target_entity: "climate scientist interviews",
          relationship_type: "SUPPORTS",
          confidence: 0.88,
        },
        {
          source_entity: "IPCC report",
          target_entity: "global temperature trends",
          relationship_type: "EVIDENCES",
          confidence: 0.93,
        },
        {
          source_entity: "research data file",
          target_entity: "statistical analysis",
          relationship_type: "EVIDENCES",
          confidence: 0.95,
        },
        {
          source_entity: "statistical analysis",
          target_entity: "climate hypothesis",
          relationship_type: "SUPPORTS",
          confidence: 0.9,
        },
      ],
    },
  },

  uidPrefixes: {
    Evidence: "evidence",
    Content: "content",
    File: "file",
  },

  validators: {
    evidence: (uid: string) => uid.startsWith("evidence:"),
    content: (uid: string) => uid.startsWith("content:"),
    file: (uid: string) => uid.startsWith("file:"),
  },

  relationships: ["EVIDENCES", "SUPPORTS", "ATTACHED_TO", "REFERENCES"],

  ui: {
    color: "#94A3B8",
    icon: "📋",
    entityIcons: {
      Evidence: "📄",
      Content: "📝",
      File: "📎",
    },
    card: evidenceCardConfig, // Default card config
    entityCards: {
      Evidence: evidenceCardConfig,
      Content: contentCardConfig,
      File: {
        ...fileCardConfig,
        // Note: component will be registered in DomainCardFactory
        component: "FileCard" as any, // Custom component for upload functionality
      },
    },
  },
};
