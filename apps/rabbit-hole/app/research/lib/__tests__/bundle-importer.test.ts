import type Graph from "graphology";
import { describe, it, expect, beforeEach } from "vitest";

import { newGraph } from "@/graph-visualizer/model/graph";
import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "@/graph-visualizer/model/graph";

import { importBundle } from "../bundle-importer";

describe("importBundle", () => {
  let graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>;

  beforeEach(() => {
    graph = newGraph();
  });

  it("should import entities and relationships", async () => {
    const bundle = {
      entities: [
        {
          uid: "person:test",
          type: "Person",
          name: "Test Person",
          properties: {},
          tags: [],
          aliases: [],
        },
        {
          uid: "org:test",
          type: "Organization",
          name: "Test Org",
          properties: {},
          tags: [],
          aliases: [],
        },
      ],
      relationships: [
        {
          uid: "rel:test",
          type: "HOLDS_ROLE",
          source: "person:test",
          target: "org:test",
          properties: {},
        },
      ],
    };

    const result = await importBundle(graph, bundle);

    expect(result.entitiesAdded).toBe(2);
    expect(result.relationshipsAdded).toBe(1);
    expect(graph.order).toBe(2); // 2 nodes
    expect(graph.size).toBe(1); // 1 edge
  });

  it("should skip existing entities in merge mode", async () => {
    // Pre-add entity
    graph.addNode("person:test", {
      uid: "person:test",
      name: "Existing",
      type: "Person",
      color: "#000",
      icon: "👤",
      size: 10,
    });

    const bundle = {
      entities: [
        {
          uid: "person:test",
          type: "Person",
          name: "New Name",
          properties: {},
          tags: [],
          aliases: [],
        },
      ],
      relationships: [],
    };

    const result = await importBundle(graph, bundle, {
      mode: "merge", // Default
    });

    expect(result.entitiesSkipped).toBe(1);
    expect(graph.getNodeAttribute("person:test", "name")).toBe("Existing");
  });

  it("should replace entire graph in replace mode", async () => {
    // Pre-add entities
    graph.addNode("person:old", {
      uid: "person:old",
      name: "Old",
      type: "Person",
      color: "#000",
      icon: "👤",
      size: 10,
    });
    graph.addNode("org:old", {
      uid: "org:old",
      name: "Old Org",
      type: "Organization",
      color: "#000",
      icon: "🏢",
      size: 10,
    });

    const bundle = {
      entities: [
        {
          uid: "person:new",
          type: "Person",
          name: "New Person",
          properties: {},
          tags: [],
          aliases: [],
        },
      ],
      relationships: [],
    };

    const result = await importBundle(graph, bundle, {
      mode: "replace",
    });

    expect(graph.order).toBe(1); // Only new entity
    expect(graph.hasNode("person:old")).toBe(false);
    expect(graph.hasNode("org:old")).toBe(false);
    expect(graph.hasNode("person:new")).toBe(true);
  });

  it("should update existing entities in overwrite mode", async () => {
    // Pre-add entity
    graph.addNode("person:test", {
      uid: "person:test",
      name: "Old Name",
      type: "Person",
      tags: ["old"],
      color: "#000",
      icon: "👤",
      size: 10,
    });

    const bundle = {
      entities: [
        {
          uid: "person:test",
          type: "Person",
          name: "New Name",
          properties: {},
          tags: ["new"],
          aliases: [],
        },
      ],
      relationships: [],
    };

    const result = await importBundle(graph, bundle, {
      mode: "overwrite",
    });

    expect(result.entitiesAdded).toBe(1);
    expect(graph.getNodeAttribute("person:test", "name")).toBe("New Name");
    expect(graph.getNodeAttribute("person:test", "tags")).toContain("new");
  });

  it("should handle missing relationship endpoints", async () => {
    const bundle = {
      entities: [
        {
          uid: "person:test",
          type: "Person",
          name: "Test",
          properties: {},
          tags: [],
          aliases: [],
        },
      ],
      relationships: [
        {
          uid: "rel:invalid",
          type: "OWNS",
          source: "person:test",
          target: "org:missing", // Missing!
          properties: {},
        },
      ],
    };

    // Validation should fail during import
    await expect(importBundle(graph, bundle)).rejects.toThrow(
      "Bundle validation failed"
    );
  });

  it("should handle batch processing for large datasets", async () => {
    const entities = Array.from({ length: 100 }, (_, i) => ({
      uid: `person:test${i}`,
      type: "Person",
      name: `Test Person ${i}`,
      properties: {},
      tags: [],
      aliases: [],
    }));

    const bundle = {
      entities,
      relationships: [],
    };

    const progressUpdates: number[] = [];
    const result = await importBundle(graph, bundle, {
      batchSize: 25,
      onProgress: (loaded, total) => {
        progressUpdates.push(loaded);
      },
    });

    expect(result.entitiesAdded).toBe(100);
    expect(graph.order).toBe(100);
    expect(progressUpdates.length).toBeGreaterThan(0);
  });

  it("should import content items as nodes", async () => {
    const bundle = {
      entities: [
        {
          uid: "person:author",
          type: "Person",
          name: "Test Author",
          properties: {},
          tags: [],
          aliases: [],
        },
      ],
      content: [
        {
          uid: "content:test_article",
          content_type: "article",
          platform_uid: "platform:test",
          author_uid: "person:author",
          published_at: "2024-01-15T12:00:00Z",
          text_excerpt: "This is a test article",
          url: "https://test.com/article",
        },
      ],
      relationships: [
        {
          uid: "rel:author_wrote_article",
          type: "SPEECH_ACT",
          source: "person:author",
          target: "content:test_article",
          properties: {},
        },
      ],
    };

    const result = await importBundle(graph, bundle);

    expect(result.entitiesAdded).toBe(1);
    expect(result.contentAdded).toBe(1);
    expect(result.relationshipsAdded).toBe(1);
    expect(graph.order).toBe(2); // 1 entity + 1 content node
    expect(graph.size).toBe(1); // 1 relationship
    expect(graph.hasNode("content:test_article")).toBe(true);
    expect(graph.getNodeAttribute("content:test_article", "type")).toBe(
      "Content"
    );
  });

  it("should handle relationships targeting content nodes", async () => {
    const bundle = {
      entities: [
        {
          uid: "person:speaker",
          type: "Person",
          name: "Speaker",
          properties: {},
          tags: [],
          aliases: [],
        },
      ],
      content: [
        {
          uid: "content:speech",
          content_type: "speech",
          published_at: "2024-01-01T00:00:00Z",
          text_excerpt: "Important speech content",
        },
      ],
      relationships: [
        {
          uid: "rel:speaker_gave_speech",
          type: "SPEECH_ACT",
          source: "person:speaker",
          target: "content:speech",
          properties: {},
        },
      ],
    };

    const result = await importBundle(graph, bundle);

    expect(result.errors).toHaveLength(0);
    expect(result.relationshipsAdded).toBe(1);
    expect(graph.hasEdge("person:speaker", "content:speech")).toBe(true);
  });

  it("should import evidence items as nodes", async () => {
    const bundle = {
      entities: [
        {
          uid: "person:researcher",
          type: "Person",
          name: "Researcher",
          properties: {},
          tags: [],
          aliases: [],
        },
      ],
      evidence: [
        {
          uid: "evidence:court_document",
          kind: "court",
          title: "Court Document",
          publisher: "Federal Court",
          date: "2024-01-15",
          url: "https://example.com/doc",
          reliability: 0.95,
        },
      ],
      relationships: [
        {
          uid: "rel:researcher_cites_evidence",
          type: "EVIDENCES",
          source: "person:researcher",
          target: "evidence:court_document",
          properties: {},
        },
      ],
    };

    const result = await importBundle(graph, bundle);

    expect(result.entitiesAdded).toBe(1);
    expect(result.evidenceAdded).toBe(1);
    expect(result.relationshipsAdded).toBe(1);
    expect(graph.hasNode("evidence:court_document")).toBe(true);
    expect(graph.getNodeAttribute("evidence:court_document", "type")).toBe(
      "Evidence"
    );
  });

  it("should import file items as nodes", async () => {
    const bundle = {
      entities: [
        {
          uid: "person:uploader",
          type: "Person",
          name: "Uploader",
          properties: {},
          tags: [],
          aliases: [],
        },
      ],
      files: [
        {
          uid: "file:document_pdf",
          content_hash: "sha256-" + "a".repeat(64),
          mime: "application/pdf",
          bytes: 1024,
          bucket: "test-bucket",
          key: "documents/test.pdf",
          aliases: ["Test Document"],
        },
      ],
      relationships: [
        {
          uid: "rel:uploader_attached_file",
          type: "ATTACHED_TO",
          source: "person:uploader",
          target: "file:document_pdf",
          properties: {},
        },
      ],
    };

    const result = await importBundle(graph, bundle);

    expect(result.entitiesAdded).toBe(1);
    expect(result.filesAdded).toBe(1);
    expect(result.relationshipsAdded).toBe(1);
    expect(graph.hasNode("file:document_pdf")).toBe(true);
    expect(graph.getNodeAttribute("file:document_pdf", "type")).toBe("File");
    expect(graph.getNodeAttribute("file:document_pdf", "name")).toBe(
      "Test Document"
    );
  });

  it("should import all node types in one bundle", async () => {
    const bundle = {
      entities: [
        {
          uid: "person:complete_test",
          type: "Person",
          name: "Complete Test",
          properties: {},
          tags: [],
          aliases: [],
        },
      ],
      content: [
        {
          uid: "content:article",
          content_type: "article",
          published_at: "2024-01-01T00:00:00Z",
          text_excerpt: "Article content",
        },
      ],
      evidence: [
        {
          uid: "evidence:source",
          kind: "research",
          title: "Research Paper",
          publisher: "University",
          date: "2024-01-01",
          url: "https://example.com",
        },
      ],
      files: [
        {
          uid: "file:attachment",
          content_hash: "sha256-" + "b".repeat(64),
          mime: "image/png",
          bucket: "test",
          key: "images/test.png",
        },
      ],
      relationships: [],
    };

    const result = await importBundle(graph, bundle);

    expect(result.entitiesAdded).toBe(1);
    expect(result.contentAdded).toBe(1);
    expect(result.evidenceAdded).toBe(1);
    expect(result.filesAdded).toBe(1);
    expect(graph.order).toBe(4); // All 4 node types
  });
});
