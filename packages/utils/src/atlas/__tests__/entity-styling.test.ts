import { describe, test, expect, beforeAll } from "vitest";

import { EntitySchemaRegistry } from "@protolabsai/types";

import {
  getEntityImage,
  getEntityColor,
  getSentimentColor,
} from "../entity-styling";

// Ensure domain registry is initialized before tests
beforeAll(() => {
  // This triggers domain registration via EntitySchemaRegistry singleton
  EntitySchemaRegistry.getInstance();
});

describe.skip("getEntityImage", () => {
  test("returns correct emoji for social domain entity types", () => {
    expect(getEntityImage("person")).toBe("👤");
    expect(getEntityImage("platform")).toBe("💻");
    expect(getEntityImage("movement")).toBe("🌊");
    expect(getEntityImage("event")).toBe("📅");
    expect(getEntityImage("organization")).toBe("🏢");
  });

  test("returns correct emoji for core domain entity types", () => {
    expect(getEntityImage("Evidence")).toBe("📄");
    expect(getEntityImage("Content")).toBe("📝");
    expect(getEntityImage("File")).toBe("📎");

    // Test case insensitivity
    expect(getEntityImage("evidence")).toBe("📄");
    expect(getEntityImage("content")).toBe("📝");
    expect(getEntityImage("file")).toBe("📎");
  });

  test("returns correct emoji for extended entity types", () => {
    expect(getEntityImage("country")).toBe("🏴");
    expect(getEntityImage("place")).toBe("📍");
    expect(getEntityImage("religion")).toBe("⛪");
    expect(getEntityImage("policy")).toBe("📋");
    expect(getEntityImage("metric")).toBe("📊");
    expect(getEntityImage("account")).toBe("👥");
  });

  test("handles case variations consistently", () => {
    expect(getEntityImage("Person")).toBe("👤");
    expect(getEntityImage("PERSON")).toBe("👤");
    expect(getEntityImage("pErSoN")).toBe("👤");
  });

  test("normalizes whitespace in entity types", () => {
    expect(getEntityImage("legal case")).toBe("⚖️");
    expect(getEntityImage("legal  case")).toBe("⚖️");
    expect(getEntityImage("legalcase")).toBe("⚖️");
  });

  test("returns default emoji for unknown entity types", () => {
    expect(getEntityImage("unknown-type")).toBe("⚪");
    expect(getEntityImage("")).toBe("⚪");
    expect(getEntityImage("invalid")).toBe("⚪");
  });

  test("handles media type variations", () => {
    expect(getEntityImage("media")).toBe("📺");
    expect(getEntityImage("statement")).toBe("💬");
  });
});

describe.skip("getEntityColor", () => {
  test("returns correct colors for social domain entity types", () => {
    expect(getEntityColor("person")).toBe("#3B82F6"); // Blue
    expect(getEntityColor("platform")).toBe("#10B981"); // Green
    expect(getEntityColor("movement")).toBe("#F59E0B"); // Amber
    expect(getEntityColor("event")).toBe("#EF4444"); // Red
    expect(getEntityColor("organization")).toBe("#059669"); // Emerald
  });

  test("returns correct colors for core domain entity types", () => {
    expect(getEntityColor("Evidence")).toBe("#94A3B8"); // Slate
    expect(getEntityColor("Content")).toBe("#94A3B8"); // Slate
    expect(getEntityColor("File")).toBe("#94A3B8"); // Slate

    // Test case insensitivity
    expect(getEntityColor("evidence")).toBe("#94A3B8");
    expect(getEntityColor("content")).toBe("#94A3B8");
    expect(getEntityColor("file")).toBe("#94A3B8");
  });

  test("returns correct colors for extended entity types", () => {
    expect(getEntityColor("country")).toBe("#14B8A6"); // Teal (geographic domain)
    expect(getEntityColor("place")).toBe("#14B8A6"); // Teal (geographic domain)
    expect(getEntityColor("religion")).toBe("#EC4899"); // Pink
    expect(getEntityColor("policy")).toBe("#DC2626"); // Red
    expect(getEntityColor("metric")).toBe("#6366F1"); // Indigo
    expect(getEntityColor("account")).toBe("#3B82F6"); // Blue
  });

  test("handles case variations consistently", () => {
    expect(getEntityColor("Person")).toBe("#3B82F6");
    expect(getEntityColor("PERSON")).toBe("#3B82F6");
    expect(getEntityColor("pErSoN")).toBe("#3B82F6");
  });

  test("normalizes whitespace in entity types", () => {
    expect(getEntityColor("legal case")).toBe("#DC2626");
    expect(getEntityColor("legal  case")).toBe("#DC2626");
    expect(getEntityColor("legalcase")).toBe("#DC2626");
  });

  test("returns default color for unknown entity types", () => {
    const defaultColor = "#6B7280"; // Gray
    expect(getEntityColor("unknown-type")).toBe(defaultColor);
    expect(getEntityColor("")).toBe(defaultColor);
    expect(getEntityColor("invalid")).toBe(defaultColor);
  });

  test("color values are valid hex codes", () => {
    const validHexPattern = /^#[0-9A-F]{6}$/i;
    const entityTypes = [
      "person",
      "platform",
      "movement",
      "event",
      "organization",
      "unknown",
    ];

    entityTypes.forEach((type) => {
      const color = getEntityColor(type);
      expect(color).toMatch(validHexPattern);
    });
  });
});

describe("getSentimentColor", () => {
  test("returns correct colors for sentiment types", () => {
    expect(getSentimentColor("hostile")).toBe("#DC2626"); // Red
    expect(getSentimentColor("supportive")).toBe("#059669"); // Green
    expect(getSentimentColor("neutral")).toBe("#6B7280"); // Gray
    expect(getSentimentColor("ambiguous")).toBe("#F59E0B"); // Amber
  });

  test("handles case variations", () => {
    expect(getSentimentColor("HOSTILE")).toBe("#DC2626");
    expect(getSentimentColor("Supportive")).toBe("#059669");
    expect(getSentimentColor("NEUTRAL")).toBe("#6B7280");
  });

  test("returns neutral color for unknown sentiments", () => {
    const neutralColor = "#6B7280";
    expect(getSentimentColor("unknown")).toBe(neutralColor);
    expect(getSentimentColor("")).toBe(neutralColor);
    expect(getSentimentColor("invalid")).toBe(neutralColor);
  });

  test("sentiment colors are distinct from each other", () => {
    const hostile = getSentimentColor("hostile");
    const supportive = getSentimentColor("supportive");
    const neutral = getSentimentColor("neutral");
    const ambiguous = getSentimentColor("ambiguous");

    const colors = [hostile, supportive, neutral, ambiguous];
    const uniqueColors = new Set(colors);

    expect(uniqueColors.size).toBe(4); // All colors should be different
  });

  test("sentiment colors are valid hex codes", () => {
    const validHexPattern = /^#[0-9A-F]{6}$/i;
    const sentiments = ["hostile", "supportive", "neutral", "ambiguous"];

    sentiments.forEach((sentiment) => {
      const color = getSentimentColor(sentiment);
      expect(color).toMatch(validHexPattern);
    });
  });
});
