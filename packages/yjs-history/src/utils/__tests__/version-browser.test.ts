import { describe, it, expect } from "vitest";

import type { VersionMetadata } from "../../types";
import {
  groupVersionsByDate,
  filterVersionsByTag,
  filterVersionsByUser,
  searchVersions,
  formatVersionTime,
  getUniqueTags,
  buildVersionTree,
} from "../version-browser";

describe("version-browser utilities", () => {
  const createVersion = (
    id: string,
    name: string,
    timestamp: number,
    userId = "user-1",
    tags?: string[]
  ): VersionMetadata => ({
    id,
    name,
    timestamp,
    userId,
    tags,
  });

  describe("groupVersionsByDate", () => {
    it("groups versions by today", () => {
      const now = Date.now();
      const versions = [
        createVersion("v1", "Today 1", now),
        createVersion("v2", "Today 2", now - 1000),
      ];

      const groups = groupVersionsByDate(versions);
      const todayGroup = groups.find((g) => g.date === "today");

      expect(todayGroup).toBeDefined();
      expect(todayGroup?.versions).toHaveLength(2);
    });

    it("groups versions by yesterday", () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      const versions = [createVersion("v1", "Yesterday", yesterday)];

      const groups = groupVersionsByDate(versions);
      const yesterdayGroup = groups.find((g) => g.date === "yesterday");

      expect(yesterdayGroup).toBeDefined();
      expect(yesterdayGroup?.versions).toHaveLength(1);
    });

    it("groups versions by this week", () => {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      const versions = [createVersion("v1", "This Week", threeDaysAgo)];

      const groups = groupVersionsByDate(versions);
      const weekGroup = groups.find((g) => g.date === "thisWeek");

      expect(weekGroup).toBeDefined();
      expect(weekGroup?.versions).toHaveLength(1);
    });

    it("groups versions by this month", () => {
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const versions = [createVersion("v1", "This Month", twoWeeksAgo)];

      const groups = groupVersionsByDate(versions);
      const monthGroup = groups.find((g) => g.date === "thisMonth");

      expect(monthGroup).toBeDefined();
      expect(monthGroup?.versions).toHaveLength(1);
    });

    it("groups old versions as older", () => {
      const twoMonthsAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
      const versions = [createVersion("v1", "Old", twoMonthsAgo)];

      const groups = groupVersionsByDate(versions);
      const olderGroup = groups.find((g) => g.date === "older");

      expect(olderGroup).toBeDefined();
      expect(olderGroup?.versions).toHaveLength(1);
    });

    it("returns empty array for no versions", () => {
      const groups = groupVersionsByDate([]);
      expect(groups).toEqual([]);
    });
  });

  describe("filterVersionsByTag", () => {
    const versions = [
      createVersion("v1", "Auto", Date.now(), "user-1", ["auto"]),
      createVersion("v2", "Manual", Date.now(), "user-1", ["manual"]),
      createVersion("v3", "Release", Date.now(), "user-1", [
        "release",
        "milestone",
      ]),
    ];

    it("filters versions by single tag", () => {
      const autoVersions = filterVersionsByTag(versions, "auto");
      expect(autoVersions).toHaveLength(1);
      expect(autoVersions[0].name).toBe("Auto");
    });

    it("filters versions with multiple tags", () => {
      const releaseVersions = filterVersionsByTag(versions, "release");
      expect(releaseVersions).toHaveLength(1);
      expect(releaseVersions[0].name).toBe("Release");
    });

    it("returns empty for non-matching tag", () => {
      const filtered = filterVersionsByTag(versions, "non-existent");
      expect(filtered).toHaveLength(0);
    });

    it("handles versions without tags", () => {
      const noTagVersions = [createVersion("v1", "No Tags", Date.now())];
      const filtered = filterVersionsByTag(noTagVersions, "any-tag");
      expect(filtered).toHaveLength(0);
    });
  });

  describe("filterVersionsByUser", () => {
    const versions = [
      createVersion("v1", "User 1 Version", Date.now(), "user-1"),
      createVersion("v2", "User 2 Version", Date.now(), "user-2"),
      createVersion("v3", "Another User 1", Date.now(), "user-1"),
    ];

    it("filters versions by user ID", () => {
      const user1Versions = filterVersionsByUser(versions, "user-1");
      expect(user1Versions).toHaveLength(2);
    });

    it("returns empty for non-matching user", () => {
      const filtered = filterVersionsByUser(versions, "non-existent");
      expect(filtered).toHaveLength(0);
    });
  });

  describe("searchVersions", () => {
    const versions = [
      createVersion("v1", "Milestone Release", Date.now()),
      createVersion("v2", "Feature Update", Date.now()),
      createVersion("v3", "Bug Fix", Date.now()),
    ];

    versions[0].description = "Major milestone achieved";
    versions[1].description = "New feature added";
    versions[2].description = "Fixed critical bug";

    it("searches by name (case insensitive)", () => {
      const results = searchVersions(versions, "milestone");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Milestone Release");
    });

    it("searches by description", () => {
      const results = searchVersions(versions, "critical");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Bug Fix");
    });

    it("returns empty for no matches", () => {
      const results = searchVersions(versions, "non-existent");
      expect(results).toHaveLength(0);
    });

    it("handles versions without description", () => {
      const noDescVersions = [createVersion("v1", "Test", Date.now())];
      const results = searchVersions(noDescVersions, "test");
      expect(results).toHaveLength(1);
    });
  });

  describe("formatVersionTime", () => {
    it("formats time as 'just now' for recent timestamps", () => {
      const now = Date.now();
      expect(formatVersionTime(now)).toBe("just now");
    });

    it("formats time in minutes ago", () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      expect(formatVersionTime(fiveMinutesAgo)).toBe("5 minutes ago");
    });

    it("formats time in hours ago", () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      expect(formatVersionTime(twoHoursAgo)).toBe("2 hours ago");
    });

    it("formats time in days ago", () => {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      expect(formatVersionTime(threeDaysAgo)).toBe("3 days ago");
    });

    it("formats as date string for old timestamps", () => {
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const formatted = formatVersionTime(twoWeeksAgo);
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it("handles singular forms correctly", () => {
      const oneMinuteAgo = Date.now() - 61 * 1000;
      expect(formatVersionTime(oneMinuteAgo)).toBe("1 minute ago");

      const oneHourAgo = Date.now() - 61 * 60 * 1000;
      expect(formatVersionTime(oneHourAgo)).toBe("1 hour ago");

      const oneDayAgo = Date.now() - 25 * 60 * 60 * 1000;
      expect(formatVersionTime(oneDayAgo)).toBe("1 day ago");
    });
  });

  describe("getUniqueTags", () => {
    const versions = [
      createVersion("v1", "V1", Date.now(), "user-1", ["auto", "milestone"]),
      createVersion("v2", "V2", Date.now(), "user-1", ["manual"]),
      createVersion("v3", "V3", Date.now(), "user-1", ["auto", "release"]),
      createVersion("v4", "V4", Date.now(), "user-1"),
    ];

    it("returns all unique tags", () => {
      const tags = getUniqueTags(versions);
      expect(tags).toContain("auto");
      expect(tags).toContain("manual");
      expect(tags).toContain("milestone");
      expect(tags).toContain("release");
    });

    it("does not include duplicates", () => {
      const tags = getUniqueTags(versions);
      const autoCount = tags.filter((t) => t === "auto").length;
      expect(autoCount).toBe(1);
    });

    it("returns sorted tags", () => {
      const tags = getUniqueTags(versions);
      const sorted = [...tags].sort();
      expect(tags).toEqual(sorted);
    });

    it("returns empty array for no tags", () => {
      const noTagVersions = [createVersion("v1", "No Tags", Date.now())];
      const tags = getUniqueTags(noTagVersions);
      expect(tags).toEqual([]);
    });
  });

  describe("buildVersionTree", () => {
    it("builds tree with root nodes", () => {
      const versions = [
        createVersion("v1", "Root 1", Date.now()),
        createVersion("v2", "Root 2", Date.now()),
      ];

      const tree = buildVersionTree(versions);
      expect(tree).toHaveLength(2);
    });

    it("builds tree with parent-child relationships", () => {
      const versions = [
        createVersion("v1", "Root", Date.now()),
        { ...createVersion("v2", "Child 1", Date.now()), parentId: "v1" },
        { ...createVersion("v3", "Child 2", Date.now()), parentId: "v1" },
      ];

      const tree = buildVersionTree(versions);
      expect(tree).toHaveLength(1);
      expect(tree[0].children).toHaveLength(2);
    });

    it("handles nested parent-child relationships", () => {
      const versions = [
        createVersion("v1", "Root", Date.now()),
        { ...createVersion("v2", "Child", Date.now()), parentId: "v1" },
        { ...createVersion("v3", "Grandchild", Date.now()), parentId: "v2" },
      ];

      const tree = buildVersionTree(versions);
      expect(tree).toHaveLength(1);
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].children).toHaveLength(1);
    });

    it("handles orphaned children (missing parent)", () => {
      const versions = [
        {
          ...createVersion("v1", "Orphan", Date.now()),
          parentId: "non-existent",
        },
      ];

      const tree = buildVersionTree(versions);
      expect(tree).toHaveLength(1);
    });
  });
});
