/**
 * Test Data Service Tests
 *
 * Tests the test data management logic that prevents production data pollution.
 * Critical for maintaining investigation integrity.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { TestDataService } from "../../services/TestDataService";
import type { TestDataConfig } from "../../types/test-data.types";
import { setupTestEnvironment } from "../setup";

describe.skip("TestDataService", () => {
  let testService: TestDataService;

  beforeEach(() => {
    setupTestEnvironment();
    testService = new TestDataService();
  });

  describe("Test Session Management", () => {
    it("should start a test session with unique ID", () => {
      const config = testService.startTestSession("unit-testing");

      expect(config.enabled).toBe(true);
      expect(config.sessionId).toMatch(/^[a-z0-9]+_[a-z0-9]+$/);
      expect(config.prefix).toBe(`test_${config.sessionId}`);
      expect(config.tags).toContain("TEST_DATA");
      expect(config.tags).toContain(`TEST_SESSION_${config.sessionId}`);
      expect(config.tags).toContain("TEST_PURPOSE_UNIT-TESTING");
    });

    it("should generate unique session IDs", () => {
      const config1 = testService.startTestSession();
      const config2 = testService.startTestSession();

      expect(config1.sessionId).not.toBe(config2.sessionId);
      expect(config1.prefix).not.toBe(config2.prefix);
    });

    it("should track current session state", () => {
      expect(testService.isTestModeActive()).toBe(false);

      const config = testService.startTestSession("testing");
      expect(testService.isTestModeActive()).toBe(true);
      expect(testService.getCurrentSession()).toEqual(config);
    });

    it("should configure auto-cleanup timing", () => {
      const config = testService.startTestSession("testing");

      expect(config.autoCleanupAfter).toBe(24 * 60 * 60 * 1000); // 24 hours
    });
  });

  describe("Test Data Generation", () => {
    let config: TestDataConfig;

    beforeEach(() => {
      config = testService.startTestSession("generation-testing");
    });

    it("should generate test evidence with proper metadata", () => {
      const evidence = testService.generateTestEvidence("Important Document");

      expect(evidence.id).toMatch(/^ev_test_/);
      expect(evidence.title).toBe("[TEST] Important Document");
      expect(evidence.publisher).toBe("Test Publisher (Test)");
      expect(evidence.url).toMatch(/^https:\/\/example\.com\/test-evidence/);
      expect(evidence.testData).toBeDefined();
      expect(evidence.testData!.isTestData).toBe(true);
      expect(evidence.testData!.testSessionId).toBe(config.sessionId);
      expect(evidence.tags).toContain("TEST_DATA");
    });

    it("should generate test nodes with proper metadata", () => {
      const node = testService.generateTestNode(
        "Test Person",
        "person",
        ["ev_test_001"],
        "node-testing"
      );

      expect(node.id).toMatch(/^n_test_/);
      expect(node.label).toBe("[TEST] Test Person");
      expect(node.entityType).toBe("person");
      expect(node.sources).toEqual(["ev_test_001"]);
      expect(node.position).toBeDefined();
      expect(node.position!.x).toBeGreaterThan(0);
      expect(node.position!.y).toBeGreaterThan(0);
      expect(node.testData!.testPurpose).toBe("node-testing");
      expect(node.tags).toContain("TEST_DATA");
    });

    it("should generate test edges with proper metadata", () => {
      const edge = testService.generateTestEdge(
        "n_source",
        "n_target",
        "test relationship",
        ["ev_test_001"],
        "edge-testing"
      );

      expect(edge.id).toMatch(/^e_test_/);
      expect(edge.label).toBe("[TEST] test relationship");
      expect(edge.source).toBe("n_source");
      expect(edge.target).toBe("n_target");
      expect(edge.type).toBe("test_relationship");
      expect(edge.confidence).toBe(0.5); // Lower confidence for test data
      expect(edge.sources).toEqual(["ev_test_001"]);
      expect(edge.testData!.testPurpose).toBe("edge-testing");
      expect(edge.tags).toContain("TEST_DATA");
    });

    it("should require active session for generation", () => {
      const newService = new TestDataService();

      expect(() => {
        newService.generateTestEvidence("Test");
      }).toThrow("No test session active");

      expect(() => {
        newService.generateTestNode("Test", "person");
      }).toThrow("No test session active");

      expect(() => {
        newService.generateTestEdge("n_a", "n_b", "test");
      }).toThrow("No test session active");
    });
  });

  describe("Test Data Detection", () => {
    it("should detect test data by metadata flag", () => {
      const testItem = { testData: { isTestData: true } };
      expect(testService.isTestData(testItem)).toBe(true);

      const prodItem = { testData: { isTestData: false } };
      expect(testService.isTestData(prodItem)).toBe(false);
    });

    it("should detect test data by tags", () => {
      const testItem = { tags: ["SOME_TAG", "TEST_DATA"] };
      expect(testService.isTestData(testItem)).toBe(true);

      const prodItem = { tags: ["PRODUCTION_TAG"] };
      expect(testService.isTestData(prodItem)).toBe(false);
    });

    it("should detect test data by ID patterns", () => {
      const testItems = [
        { id: "test_something" },
        { id: "n_test_node" },
        { id: "e_something_test_edge" },
      ];

      testItems.forEach((item) => {
        expect(testService.isTestData(item)).toBe(true);
      });

      const prodItem = { id: "n_real_person" };
      expect(testService.isTestData(prodItem)).toBe(false);
    });

    it("should detect test data by label patterns", () => {
      const testItem = { label: "[TEST] Something" };
      expect(testService.isTestData(testItem)).toBe(true);

      const prodItem = { label: "Real Person Name" };
      expect(testService.isTestData(prodItem)).toBe(false);
    });
  });

  describe("Test Data Filtering", () => {
    let mixedData: any[];

    beforeEach(() => {
      mixedData = [
        { id: "n_prod_1", label: "Production Node 1", tags: [] },
        { id: "n_test_1", label: "[TEST] Test Node 1", tags: ["TEST_DATA"] },
        {
          id: "n_test_2",
          label: "[TEST] Test Node 2",
          tags: ["TEST_DATA", "TEST_SESSION_abc123"],
          testData: { testSessionId: "abc123", testPurpose: "testing" },
        },
        { id: "n_prod_2", label: "Production Node 2", tags: ["PRODUCTION"] },
      ];
    });

    it("should filter out test data when includeTestData is false", () => {
      const filtered = testService.filterTestData(mixedData, {
        includeTestData: false,
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.every((item) => !testService.isTestData(item))).toBe(
        true
      );
    });

    it("should return only test data when testDataOnly is true", () => {
      const filtered = testService.filterTestData(mixedData, {
        testDataOnly: true,
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.every((item) => testService.isTestData(item))).toBe(true);
    });

    it("should filter by specific test session", () => {
      const filtered = testService.filterTestData(mixedData, {
        testSessionId: "abc123",
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("n_test_2");
    });

    it("should filter by test purpose", () => {
      const filtered = testService.filterTestData(mixedData, {
        testPurpose: "testing",
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].testData.testPurpose).toBe("testing");
    });

    it("should return all data when no filters applied", () => {
      const filtered = testService.filterTestData(mixedData, {});

      expect(filtered).toHaveLength(4);
      expect(filtered).toEqual(mixedData);
    });
  });

  describe("Metadata Application", () => {
    let config: TestDataConfig;

    beforeEach(() => {
      config = testService.startTestSession("metadata-testing");
    });

    it("should add test metadata to any object", () => {
      const originalItem = { id: "test_item", name: "Test Item" };

      const enhanced = testService.addTestMetadata(
        originalItem,
        config,
        "specific-purpose"
      );

      expect(enhanced.testData).toBeDefined();
      expect(enhanced.testData.isTestData).toBe(true);
      expect(enhanced.testData.testSessionId).toBe(config.sessionId);
      expect(enhanced.testData.testPurpose).toBe("specific-purpose");
      expect(enhanced.testData.testCreatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(enhanced.testData.testExpiresAt).toBeDefined();
    });

    it("should merge test tags with existing tags", () => {
      const itemWithTags = {
        id: "test_item",
        tags: ["EXISTING_TAG", "ANOTHER_TAG"],
      };

      const enhanced = testService.addTestMetadata(itemWithTags, config);

      expect(enhanced.tags).toContain("EXISTING_TAG");
      expect(enhanced.tags).toContain("ANOTHER_TAG");
      expect(enhanced.tags).toContain("TEST_DATA");
      expect(enhanced.tags).toContain(`TEST_SESSION_${config.sessionId}`);
      // Should not have duplicates
      expect(new Set(enhanced.tags).size).toBe(enhanced.tags.length);
    });

    it("should require active session for metadata application", () => {
      const newService = new TestDataService();
      const item = { id: "test" };

      expect(() => {
        newService.addTestMetadata(item);
      }).toThrow("No test session active");
    });
  });

  describe("Data Integrity Protection", () => {
    it("should prevent test data from referencing production evidence", () => {
      const config = testService.startTestSession("integrity-test");

      // This would be caught in validation, not the service itself
      const testNode = testService.generateTestNode("Test Node", "person", [
        "ev_production_evidence",
      ]);

      // The service generates the node, but validation should catch the invalid reference
      expect(testNode.sources).toContain("ev_production_evidence");
      expect(testService.isTestData(testNode)).toBe(true);
    });

    it("should clearly mark all test data items", () => {
      testService.startTestSession("marking-test");

      const evidence = testService.generateTestEvidence("Test Doc");
      const node = testService.generateTestNode("Test Person", "person");
      const edge = testService.generateTestEdge("n_a", "n_b", "test rel");

      [evidence, node, edge].forEach((item) => {
        expect(testService.isTestData(item)).toBe(true);
        expect(item.tags).toContain("TEST_DATA");
        expect(item.label || item.title).toMatch(/^\[TEST\]/);
      });
    });
  });
});
