import { describe, test, expect } from "vitest";

import {
  createTimeWindow,
  calculateOptimalPageSize,
  getOptimalGranularity,
  validateTimeWindow,
  formatDuration,
  getSuggestedPageSize,
  getTimePresets,
} from "../time-navigation-helpers";

describe("createTimeWindow", () => {
  const testDate = new Date("2024-01-15T12:00:00Z");

  test("creates correct day window", () => {
    const window = createTimeWindow(testDate, "day");
    expect(window.from).toBe("2024-01-15");
    expect(window.to).toBe("2024-01-15"); // Same-day inclusive range
  });

  test("creates correct week window", () => {
    const window = createTimeWindow(testDate, "week");
    expect(window.from).toBe("2024-01-14"); // Sunday
    expect(window.to).toBe("2024-01-20"); // Saturday
  });

  test("creates correct month window", () => {
    const window = createTimeWindow(testDate, "month");
    expect(window.from).toBe("2024-01-01");
    expect(window.to).toBe("2024-01-31");
  });
});

describe("calculateOptimalPageSize", () => {
  test("returns appropriate size for different durations", () => {
    // Single day
    const dayWindow = { from: "2024-01-01", to: "2024-01-01" };
    expect(calculateOptimalPageSize(dayWindow)).toBe(500);

    // Week
    const weekWindow = { from: "2024-01-01", to: "2024-01-07" };
    expect(calculateOptimalPageSize(weekWindow)).toBe(1000);

    // Month
    const monthWindow = { from: "2024-01-01", to: "2024-01-31" };
    expect(calculateOptimalPageSize(monthWindow)).toBe(2000);

    // Year
    const yearWindow = { from: "2024-01-01", to: "2024-12-31" };
    expect(calculateOptimalPageSize(yearWindow)).toBe(5000);
  });

  test("returns integers for all scenarios", () => {
    const window = { from: "2024-01-01", to: "2024-06-15" };
    const pageSize = calculateOptimalPageSize(window);
    expect(Number.isInteger(pageSize)).toBe(true);
    expect(pageSize).toBeGreaterThan(0);
  });
});

describe("getOptimalGranularity", () => {
  test("returns appropriate granularity for different durations", () => {
    // 1 day - hourly
    const dayWindow = { from: "2024-01-01", to: "2024-01-01" };
    expect(getOptimalGranularity(dayWindow)).toBe("hour");

    // 30 days - daily
    const monthWindow = { from: "2024-01-01", to: "2024-01-31" };
    expect(getOptimalGranularity(monthWindow)).toBe("day");

    // 6 months - weekly
    const halfYearWindow = { from: "2024-01-01", to: "2024-06-30" };
    expect(getOptimalGranularity(halfYearWindow)).toBe("week");

    // 2 years - monthly
    const twoYearWindow = { from: "2023-01-01", to: "2024-12-31" };
    expect(getOptimalGranularity(twoYearWindow)).toBe("month");
  });
});

describe("validateTimeWindow", () => {
  test("validates correct time windows", () => {
    const validWindow = { from: "2024-01-01", to: "2024-01-31" };
    const result = validateTimeWindow(validWindow);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("rejects invalid date formats", () => {
    const invalidWindow = { from: "2024/01/01", to: "2024-01-31" };
    const result = validateTimeWindow(invalidWindow);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Invalid 'from' date format. Expected YYYY-MM-DD"
    );
  });

  test("rejects logical inconsistencies", () => {
    const reversedWindow = { from: "2024-01-31", to: "2024-01-01" };
    const result = validateTimeWindow(reversedWindow);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "'from' date must be before or equal to 'to' date"
    );
  });

  test("allows same-day ranges", () => {
    const sameDayWindow = { from: "2024-01-15", to: "2024-01-15" };
    const result = validateTimeWindow(sameDayWindow);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("rejects overly large windows", () => {
    const hugeWindow = { from: "2020-01-01", to: "2024-12-31" }; // 5 years
    const result = validateTimeWindow(hugeWindow);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Time window too large. Maximum 2 years supported"
    );
  });
});

describe("formatDuration", () => {
  test("formats different durations correctly", () => {
    // Same-day inclusive range
    expect(formatDuration({ from: "2024-01-01", to: "2024-01-01" })).toBe(
      "1 day"
    );
    expect(formatDuration({ from: "2024-01-01", to: "2024-01-02" })).toBe(
      "1 day"
    );
    expect(formatDuration({ from: "2024-01-01", to: "2024-01-08" })).toBe(
      "1 week"
    );
    expect(formatDuration({ from: "2024-01-01", to: "2024-02-01" })).toBe(
      "1 month"
    );
  });
});

describe("getSuggestedPageSize", () => {
  test("returns integer page sizes with reasoning", () => {
    const window = { from: "2024-01-01", to: "2024-01-31" };
    const result = getSuggestedPageSize(window);

    expect(Number.isInteger(result.pageSize)).toBe(true);
    expect(result.pageSize).toBeGreaterThan(0);
    expect(result.reasoning).toContain("Month view");
  });

  test("adjusts for large entity counts", () => {
    const window = { from: "2024-01-01", to: "2024-01-31" };
    const result = getSuggestedPageSize(window, 15000);

    expect(result.reasoning).toContain("reduced for large entity count");
    expect(result.pageSize).toBeGreaterThanOrEqual(1000);
  });
});

describe("getTimePresets", () => {
  test("returns valid time presets", () => {
    const presets = getTimePresets();

    expect(presets.length).toBeGreaterThan(5);
    expect(presets[0].label).toBe("Today");

    presets.forEach((preset) => {
      expect(preset.timeWindow.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(preset.timeWindow.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(preset.label).toBeTruthy();
      expect(preset.description).toBeTruthy();
    });
  });

  test("preset time windows are valid", () => {
    const presets = getTimePresets();

    presets.forEach((preset) => {
      const validation = validateTimeWindow(preset.timeWindow);
      expect(validation.isValid).toBe(true);
    });
  });
});
