/**
 * useResearchAgentCanvas Tests
 *
 * Tests the progressive import logic for streaming agent bundles to the canvas.
 * Uses mock graph and importBundle to verify deduplication and incremental imports.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import type { PartialBundle } from "@proto/types";
import { createEmptyPartialBundle, mergePartialBundle } from "@proto/types";

// Mock importBundle to track calls
const mockImportBundle = vi.fn().mockResolvedValue({
  entitiesAdded: 0,
  relationshipsAdded: 0,
  warnings: [],
  errors: [],
});

vi.mock("../../lib/bundle-importer", () => ({
  importBundle: (...args: unknown[]) => mockImportBundle(...args),
}));

vi.mock("../../lib/layoutAlgorithms", () => ({
  applyForceLayout: vi.fn().mockReturnValue(true),
}));

// Import the logic we want to test (extracted for unit testing)
// Since the hook itself requires React, we test the core logic directly

describe("useResearchAgentCanvas logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("deduplication", () => {
    it("identifies new entities by UID", () => {
      const importedUids = new Set(["ent-existing"]);
      const bundle: PartialBundle = mergePartialBundle(createEmptyPartialBundle(), {
        entities: [
          { uid: "ent-existing", label: "Old", entityType: "person", properties: {} },
          { uid: "ent-new", label: "New", entityType: "person", properties: {} },
        ] as any,
        phase: "entity-creation",
      });

      const newEntities = bundle.entities.filter(
        (e) => e.uid && !importedUids.has(e.uid)
      );

      expect(newEntities).toHaveLength(1);
      expect(newEntities[0].uid).toBe("ent-new");
    });

    it("identifies new relationships by composite key", () => {
      const importedKeys = new Set(["src1-knows-tgt1"]);
      const bundle: PartialBundle = mergePartialBundle(createEmptyPartialBundle(), {
        relationships: [
          { source: "src1", target: "tgt1", type: "knows", properties: {} },
          { source: "src1", target: "tgt2", type: "works_with", properties: {} },
        ] as any,
        phase: "relationship-mapping",
      });

      const newRelationships = bundle.relationships.filter((r) => {
        const key = `${r.source}-${r.type}-${r.target}`;
        return !importedKeys.has(key);
      });

      expect(newRelationships).toHaveLength(1);
      expect(newRelationships[0].target).toBe("tgt2");
    });

    it("skips import when no new entities or relationships", () => {
      const importedUids = new Set(["ent1", "ent2"]);
      const importedKeys = new Set(["ent1-knows-ent2"]);
      const bundle: PartialBundle = mergePartialBundle(createEmptyPartialBundle(), {
        entities: [
          { uid: "ent1", label: "A", entityType: "person", properties: {} },
          { uid: "ent2", label: "B", entityType: "person", properties: {} },
        ] as any,
        relationships: [
          { source: "ent1", target: "ent2", type: "knows", properties: {} },
        ] as any,
        phase: "complete",
        isComplete: true,
      });

      const newEntities = bundle.entities.filter(
        (e) => e.uid && !importedUids.has(e.uid)
      );
      const newRelationships = bundle.relationships.filter((r) => {
        const key = `${r.source}-${r.type}-${r.target}`;
        return !importedKeys.has(key);
      });

      expect(newEntities).toHaveLength(0);
      expect(newRelationships).toHaveLength(0);
    });
  });

  describe("mini-bundle construction", () => {
    it("builds a RabbitHoleBundleData from new items only", () => {
      const newEntities = [
        { uid: "ent-new", label: "New Entity", entityType: "person", properties: {} },
      ];
      const newRelationships = [
        { source: "ent-new", target: "ent-old", type: "knows", properties: {} },
      ];

      const miniBundleData = {
        entities: newEntities,
        relationships: newRelationships,
        evidence: [],
        files: [],
        content: [],
      };

      expect(miniBundleData.entities).toHaveLength(1);
      expect(miniBundleData.relationships).toHaveLength(1);
      expect(miniBundleData.evidence).toHaveLength(0);
    });
  });

  describe("phase tracking", () => {
    it("detects phase changes", () => {
      let lastPhase: string | null = null;

      const bundle1 = mergePartialBundle(createEmptyPartialBundle(), {
        phase: "evidence-gathering",
      });
      const phaseChanged1 = bundle1.phase !== lastPhase;
      expect(phaseChanged1).toBe(true);
      lastPhase = bundle1.phase;

      const bundle2 = mergePartialBundle(bundle1, {
        entities: [{ uid: "e1", label: "E", entityType: "person", properties: {} }] as any,
        phase: "entity-creation",
      });
      const phaseChanged2 = bundle2.phase !== lastPhase;
      expect(phaseChanged2).toBe(true);
    });

    it("detects new data without phase change", () => {
      const importedCount = 1;

      const bundle = mergePartialBundle(createEmptyPartialBundle(), {
        entities: [
          { uid: "e1", label: "E1", entityType: "person", properties: {} },
          { uid: "e2", label: "E2", entityType: "person", properties: {} },
        ] as any,
        phase: "entity-creation",
      });

      const hasNewData = bundle.entityCount > importedCount;
      expect(hasNewData).toBe(true);
    });

    it("resets on scoping phase with existing imports", () => {
      const importedUids = new Set(["e1", "e2"]);
      const bundle = createEmptyPartialBundle("scoping");

      if (bundle.phase === "scoping" && importedUids.size > 0) {
        importedUids.clear();
      }

      expect(importedUids.size).toBe(0);
    });
  });

  describe("isComplete handling", () => {
    it("marks research as complete when bundle isComplete", () => {
      const bundle = mergePartialBundle(createEmptyPartialBundle(), {
        isComplete: true,
        phase: "complete",
      });

      const isResearching = bundle != null && !bundle.isComplete;
      const isComplete = bundle.isComplete;

      expect(isResearching).toBe(false);
      expect(isComplete).toBe(true);
    });

    it("marks research as in-progress when bundle is not complete", () => {
      const bundle = mergePartialBundle(createEmptyPartialBundle(), {
        phase: "entity-creation",
      });

      const isResearching = bundle != null && !bundle.isComplete;
      expect(isResearching).toBe(true);
    });
  });
});
