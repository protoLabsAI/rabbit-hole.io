/**
 * Alice Adventures Validation Test
 *
 * Tests that our Alice in Wonderland test data validates correctly
 * with the new relationship types and fictional status.
 */

import { describe, test, expect } from "vitest";

import aliceData from "../../../test-data/alice-adventures-wonderland.json";
import { validateRabbitHoleBundle } from "../validation-schemas-modular";

describe.skip("Alice Adventures Validation", () => {
  test("should validate Alice test data with new relationship types", () => {
    const result = validateRabbitHoleBundle(aliceData);

    if (!result.isValid) {
      console.log("Validation errors:", result.errors);
    }

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("should contain all expected relationship types", () => {
    const expectedRelationships = [
      "AUTHORED",
      "PUBLISHED",
      "ILLUSTRATED",
      "INSPIRED",
      "APPEARS_IN",
      "SETTING_OF",
    ];

    const relationshipTypes = aliceData.relationships.map((rel) => rel.type);

    expectedRelationships.forEach((expectedType) => {
      expect(relationshipTypes).toContain(expectedType);
    });
  });

  test("should have fictional status for Wonderland location", () => {
    const wonderlandEntity = aliceData.entities.find(
      (e) => e.uid === "location:wonderland"
    );
    expect(wonderlandEntity?.status).toBe("fictional");
  });
});
