/**
 * Evidence Workflow Integration Tests
 *
 * Tests complete investigation workflows from evidence addition to visualization.
 * Demonstrates the full system integration with mocked external dependencies.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { TestDataService } from "../../services/TestDataService";
import type { EvidenceGraphData } from "../../types/evidence-graph.types";
import { transformDataToReactFlow } from "../../utils/data-transformer";
import { validateEvidenceGraph } from "../../utils/validation";
import { setupTestEnvironment } from "../setup";

describe.skip("Evidence Workflow Integration", () => {
  let testService: TestDataService;

  beforeEach(() => {
    setupTestEnvironment();
    testService = new TestDataService();
  });

  describe("Complete Investigation Workflow", () => {
    it("should support end-to-end investigation creation", () => {
      // 1. Start investigation session
      const config = testService.startTestSession("integration-test");
      expect(testService.isTestModeActive()).toBe(true);

      // 2. Create evidence sources
      const evidence1 = testService.generateTestEvidence(
        "Government Investigation Report",
        "Department of Justice"
      );
      const evidence2 = testService.generateTestEvidence(
        "Investigative News Article",
        "Washington Post"
      );

      // 3. Create entities
      const person = testService.generateTestNode("Key Figure", "person", [
        evidence1.id,
      ]);
      const platform = testService.generateTestNode(
        "Social Platform",
        "platform",
        [evidence2.id]
      );
      const event = testService.generateTestNode(
        "Investigation Event",
        "event",
        [evidence1.id, evidence2.id]
      );

      // 4. Create relationships
      const relationship1 = testService.generateTestEdge(
        person.id,
        platform.id,
        "controls platform",
        [evidence2.id]
      );
      const relationship2 = testService.generateTestEdge(
        event.id,
        person.id,
        "investigates",
        [evidence1.id]
      );

      // 5. Assemble complete graph
      const graphData: EvidenceGraphData = {
        meta: {
          version: "1.0.0",
          generated_at: new Date().toISOString(),
          description: "Integration test investigation",
        },
        evidence: [evidence1, evidence2],
        nodes: [person, platform, event],
        edges: [relationship1, relationship2],
      };

      // 6. Validate investigation integrity
      const validation = validateEvidenceGraph(graphData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // 7. Transform for visualization
      const reactFlowData = transformDataToReactFlow(graphData, person.id);
      expect(reactFlowData.nodes).toHaveLength(3);
      expect(reactFlowData.edges).toHaveLength(2);

      // 8. Verify test data isolation
      graphData.nodes.forEach((node) => {
        expect(testService.isTestData(node)).toBe(true);
        expect(node.tags).toContain("TEST_DATA");
        expect(node.label).toMatch(/^\[TEST\]/);
      });

      graphData.edges.forEach((edge) => {
        expect(testService.isTestData(edge)).toBe(true);
        expect(edge.tags).toContain("TEST_DATA");
        expect(edge.label).toMatch(/^\[TEST\]/);
      });

      graphData.evidence.forEach((evidence) => {
        expect(testService.isTestData(evidence)).toBe(true);
        expect(evidence.tags).toContain("TEST_DATA");
        expect(evidence.title).toMatch(/^\[TEST\]/);
      });
    });

    it("should maintain data integrity across transformations", () => {
      const config = testService.startTestSession("integrity-test");

      // Create complex investigation
      const evidence = testService.generateTestEvidence("Complex Evidence");
      const nodes = [
        testService.generateTestNode("Person A", "person", [evidence.id]),
        testService.generateTestNode("Person B", "person", [evidence.id]),
        testService.generateTestNode("Platform X", "platform", [evidence.id]),
      ];
      const edges = [
        testService.generateTestEdge(nodes[0].id, nodes[1].id, "connects to", [
          evidence.id,
        ]),
        testService.generateTestEdge(nodes[1].id, nodes[2].id, "controls", [
          evidence.id,
        ]),
      ];

      const graphData: EvidenceGraphData = {
        meta: {
          version: "1.0.0",
          generated_at: new Date().toISOString(),
          description: "Test",
        },
        evidence: [evidence],
        nodes,
        edges,
      };

      // Validate original data
      const validation = validateEvidenceGraph(graphData);
      expect(validation.isValid).toBe(true);

      // Transform for UI
      const reactFlowData = transformDataToReactFlow(graphData);

      // Verify no data loss in transformation
      expect(reactFlowData.nodes).toHaveLength(nodes.length);
      expect(reactFlowData.edges).toHaveLength(edges.length);

      // Verify all original IDs preserved
      const originalNodeIds = new Set(nodes.map((n) => n.id));
      const transformedNodeIds = new Set(reactFlowData.nodes.map((n) => n.id));
      expect(transformedNodeIds).toEqual(originalNodeIds);

      const originalEdgeIds = new Set(edges.map((e) => e.id));
      const transformedEdgeIds = new Set(reactFlowData.edges.map((e) => e.id));
      expect(transformedEdgeIds).toEqual(originalEdgeIds);
    });
  });

  describe("Data Quality Assurance", () => {
    it("should enforce evidence requirements", () => {
      testService.startTestSession("quality-test");

      // Create node without evidence sources (should be caught in validation)
      const nodeWithoutEvidence = testService.generateTestNode(
        "Unsupported Node",
        "person",
        []
      );

      const graphData: EvidenceGraphData = {
        meta: {
          version: "1.0.0",
          generated_at: new Date().toISOString(),
          description: "Test",
        },
        evidence: [],
        nodes: [nodeWithoutEvidence],
        edges: [],
      };

      const validation = validateEvidenceGraph(graphData);
      expect(validation.isValid).toBe(false);
      expect(
        validation.errors.some((e) =>
          e.includes("at least one source is required")
        )
      ).toBe(true);
    });

    it("should detect orphaned references", () => {
      testService.startTestSession("orphan-test");

      // Create edge referencing non-existent nodes
      const orphanEdge = testService.generateTestEdge(
        "n_nonexistent_source",
        "n_nonexistent_target",
        "orphaned relationship",
        ["ev_test_evidence"]
      );

      const evidence = testService.generateTestEvidence("Test Evidence");

      const graphData: EvidenceGraphData = {
        meta: {
          version: "1.0.0",
          generated_at: new Date().toISOString(),
          description: "Test",
        },
        evidence: [evidence],
        nodes: [],
        edges: [orphanEdge],
      };

      const validation = validateEvidenceGraph(graphData);
      expect(validation.isValid).toBe(false);
      expect(
        validation.errors.some((e) => e.includes("references non-existent"))
      ).toBe(true);
    });

    it("should maintain test data isolation", () => {
      const session1 = testService.startTestSession("session-1");
      const node1 = testService.generateTestNode("Node 1", "person");

      const newService = new TestDataService();
      const session2 = newService.startTestSession("session-2");
      const node2 = newService.generateTestNode("Node 2", "person");

      // Verify different sessions create different metadata
      expect(node1.testData!.testSessionId).toBe(session1.sessionId);
      expect(node2.testData!.testSessionId).toBe(session2.sessionId);
      expect(node1.testData!.testSessionId).not.toBe(
        node2.testData!.testSessionId
      );

      // Verify session-specific tags
      expect(node1.tags).toContain(`TEST_SESSION_${session1.sessionId}`);
      expect(node2.tags).toContain(`TEST_SESSION_${session2.sessionId}`);
      expect(node1.tags).not.toContain(`TEST_SESSION_${session2.sessionId}`);
    });
  });

  describe("Performance Under Load", () => {
    it("should handle large investigation creation efficiently", () => {
      testService.startTestSession("performance-test");

      const startTime = Date.now();

      // Create a large investigation
      const evidenceItems = Array.from({ length: 50 }, (_, i) =>
        testService.generateTestEvidence(`Evidence ${i}`, `Publisher ${i}`)
      );

      const nodes = Array.from({ length: 100 }, (_, i) =>
        testService.generateTestNode(
          `Entity ${i}`,
          ["person", "platform", "event", "movement", "media"][i % 5] as any,
          [evidenceItems[i % evidenceItems.length].id]
        )
      );

      const edges = Array.from({ length: 80 }, (_, i) =>
        testService.generateTestEdge(
          nodes[i].id,
          nodes[(i + 1) % nodes.length].id,
          `relationship ${i}`,
          [evidenceItems[i % evidenceItems.length].id]
        )
      );

      const graphData: EvidenceGraphData = {
        meta: {
          version: "1.0.0",
          generated_at: new Date().toISOString(),
          description: "Large test",
        },
        evidence: evidenceItems,
        nodes,
        edges,
      };

      // Validate large dataset
      const validation = validateEvidenceGraph(graphData);
      expect(validation.isValid).toBe(true);

      // Transform for UI
      const reactFlowData = transformDataToReactFlow(graphData);
      expect(reactFlowData.nodes).toHaveLength(100);
      expect(reactFlowData.edges).toHaveLength(80);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
    });
  });

  describe("Error Recovery", () => {
    it("should handle malformed data gracefully", () => {
      testService.startTestSession("error-test");

      // Create node with invalid entity type (should be caught in validation)
      const invalidNode = {
        ...testService.generateTestNode("Invalid Node", "person"),
        entityType: "invalid_type" as any,
      };

      const graphData: EvidenceGraphData = {
        meta: {
          version: "1.0.0",
          generated_at: new Date().toISOString(),
          description: "Error test",
        },
        evidence: [],
        nodes: [invalidNode],
        edges: [],
      };

      const validation = validateEvidenceGraph(graphData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it("should validate cross-references between test items", () => {
      testService.startTestSession("cross-ref-test");

      const evidence = testService.generateTestEvidence("Cross Ref Evidence");
      const node1 = testService.generateTestNode("Node 1", "person", [
        evidence.id,
      ]);
      const node2 = testService.generateTestNode("Node 2", "platform", [
        evidence.id,
      ]);
      const edge = testService.generateTestEdge(
        node1.id,
        node2.id,
        "valid relationship",
        [evidence.id]
      );

      const graphData: EvidenceGraphData = {
        meta: {
          version: "1.0.0",
          generated_at: new Date().toISOString(),
          description: "Cross ref test",
        },
        evidence: [evidence],
        nodes: [node1, node2],
        edges: [edge],
      };

      const validation = validateEvidenceGraph(graphData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});
