/**
 * String Similarity Tests
 */

import { describe, expect, it } from "vitest";

import {
  areSimilarStrings,
  calculateStringSimilarity,
  levenshteinDistance,
} from "../index";

describe("levenshteinDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshteinDistance("Bernie Sanders", "Bernie Sanders")).toBe(0);
    expect(levenshteinDistance("test", "test")).toBe(0);
  });

  it("calculates distance for single character difference", () => {
    expect(levenshteinDistance("Bernie Sanders", "Bernard Sanders")).toBe(3);
    expect(levenshteinDistance("cat", "bat")).toBe(1);
  });

  it("handles completely different strings", () => {
    expect(levenshteinDistance("Bernie Sanders", "Joe Biden")).toBe(10);
    expect(levenshteinDistance("abc", "xyz")).toBe(3);
  });

  it("handles empty strings", () => {
    expect(levenshteinDistance("", "")).toBe(0);
    expect(levenshteinDistance("test", "")).toBe(4);
    expect(levenshteinDistance("", "test")).toBe(4);
  });

  it("handles insertions and deletions", () => {
    expect(levenshteinDistance("Sen. Sanders", "Sanders")).toBe(5);
    expect(levenshteinDistance("IBM", "International Business Machines")).toBe(
      28
    );
  });
});

describe("calculateStringSimilarity", () => {
  it("returns 1.0 for identical strings", () => {
    expect(calculateStringSimilarity("Bernie Sanders", "Bernie Sanders")).toBe(
      1.0
    );
    expect(calculateStringSimilarity("test", "test")).toBe(1.0);
  });

  it("returns high similarity for name variants", () => {
    const similarity = calculateStringSimilarity(
      "Bernie Sanders",
      "Bernard Sanders"
    );
    expect(similarity).toBeGreaterThan(0.75);
    expect(similarity).toBeLessThan(1.0);
  });

  it("returns low similarity for different names", () => {
    const similarity = calculateStringSimilarity("Bernie Sanders", "Joe Biden");
    expect(similarity).toBeLessThan(0.5);
  });

  it("returns 0.0 for empty strings", () => {
    expect(calculateStringSimilarity("", "")).toBe(0.0);
    expect(calculateStringSimilarity("test", "")).toBe(0.0);
    expect(calculateStringSimilarity("", "test")).toBe(0.0);
  });

  it("calculates expected similarity scores (robust ranges)", () => {
    // Bernie vs Bernard: longer=15, edits=3 → 12/15 = 0.80
    expect(
      calculateStringSimilarity("Bernie Sanders", "Bernard Sanders")
    ).toBeCloseTo(0.8, 2);
    // Bernie Sanders vs Sen. Sanders should be below the 0.75 threshold
    expect(
      calculateStringSimilarity("Bernie Sanders", "Sen. Sanders")
    ).toBeLessThan(0.75);
  });

  it("handles case-insensitive comparison", () => {
    // Similarity calculation uses actual strings, but in practice
    // we compare lowercased versions
    const sim1 = calculateStringSimilarity(
      "Bernie Sanders".toLowerCase(),
      "BERNIE SANDERS".toLowerCase()
    );
    expect(sim1).toBe(1.0);
  });
});

describe("areSimilarStrings", () => {
  it("returns true for high similarity (>= 0.75)", () => {
    expect(areSimilarStrings("Bernie Sanders", "Bernard Sanders")).toBe(true);
    expect(areSimilarStrings("Donald Trump", "Donald J. Trump")).toBe(true);
  });

  it("returns false for low similarity (< 0.75)", () => {
    expect(areSimilarStrings("Bernie Sanders", "Sen. Sanders")).toBe(false);
    expect(areSimilarStrings("Bernie Sanders", "Joe Biden")).toBe(false);
    expect(areSimilarStrings("IBM", "International Business Machines")).toBe(
      false
    );
  });

  it("returns true for exact matches", () => {
    expect(areSimilarStrings("Bernie Sanders", "Bernie Sanders")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(areSimilarStrings("Bernie Sanders", "BERNIE SANDERS")).toBe(true);
    expect(areSimilarStrings("Bernie Sanders", "bernie sanders")).toBe(true);
  });

  it("respects custom threshold", () => {
    // Sen. Sanders has 0.643 similarity, which is < 0.75 but >= 0.6
    expect(areSimilarStrings("Bernie Sanders", "Sen. Sanders", 0.75)).toBe(
      false
    );
    expect(areSimilarStrings("Bernie Sanders", "Sen. Sanders", 0.6)).toBe(true);
  });

  it("handles edge cases", () => {
    expect(areSimilarStrings("", "")).toBe(false); // Empty strings
    expect(areSimilarStrings("a", "a")).toBe(true); // Single char
  });
});
