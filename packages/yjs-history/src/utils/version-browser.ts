/**
 * Version browser utilities
 * Helper functions for browsing and managing version history
 */

import type { VersionMetadata } from "../types";

/**
 * Group versions by date
 */
export interface VersionGroup {
  date: string;
  label: string;
  versions: VersionMetadata[];
}

/**
 * Group versions by date (today, yesterday, this week, etc.)
 */
export function groupVersionsByDate(
  versions: VersionMetadata[]
): VersionGroup[] {
  const now = Date.now();
  const todayDate = new Date(now);
  todayDate.setHours(0, 0, 0, 0);
  const today = todayDate.getTime();

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  yesterdayDate.setHours(0, 0, 0, 0);
  const yesterday = yesterdayDate.getTime();

  const thisWeek = today - 7 * 24 * 60 * 60 * 1000;
  const thisMonth = today - 30 * 24 * 60 * 60 * 1000;

  const groups: Map<string, VersionMetadata[]> = new Map([
    ["today", []],
    ["yesterday", []],
    ["thisWeek", []],
    ["thisMonth", []],
    ["older", []],
  ]);

  versions.forEach((version) => {
    const versionDate = new Date(version.timestamp);
    versionDate.setHours(0, 0, 0, 0);
    const versionTimestamp = versionDate.getTime();

    if (versionTimestamp === today) {
      groups.get("today")!.push(version);
    } else if (versionTimestamp === yesterday) {
      groups.get("yesterday")!.push(version);
    } else if (versionTimestamp >= thisWeek) {
      groups.get("thisWeek")!.push(version);
    } else if (versionTimestamp >= thisMonth) {
      groups.get("thisMonth")!.push(version);
    } else {
      groups.get("older")!.push(version);
    }
  });

  const result: VersionGroup[] = [];

  if (groups.get("today")!.length > 0) {
    result.push({
      date: "today",
      label: "Today",
      versions: groups.get("today")!,
    });
  }

  if (groups.get("yesterday")!.length > 0) {
    result.push({
      date: "yesterday",
      label: "Yesterday",
      versions: groups.get("yesterday")!,
    });
  }

  if (groups.get("thisWeek")!.length > 0) {
    result.push({
      date: "thisWeek",
      label: "This Week",
      versions: groups.get("thisWeek")!,
    });
  }

  if (groups.get("thisMonth")!.length > 0) {
    result.push({
      date: "thisMonth",
      label: "This Month",
      versions: groups.get("thisMonth")!,
    });
  }

  if (groups.get("older")!.length > 0) {
    result.push({
      date: "older",
      label: "Older",
      versions: groups.get("older")!,
    });
  }

  return result;
}

/**
 * Filter versions by tag
 */
export function filterVersionsByTag(
  versions: VersionMetadata[],
  tag: string
): VersionMetadata[] {
  return versions.filter((v) => v.tags?.includes(tag));
}

/**
 * Filter versions by user
 */
export function filterVersionsByUser(
  versions: VersionMetadata[],
  userId: string
): VersionMetadata[] {
  return versions.filter((v) => v.userId === userId);
}

/**
 * Search versions by name or description
 */
export function searchVersions(
  versions: VersionMetadata[],
  query: string
): VersionMetadata[] {
  const lowerQuery = query.toLowerCase();
  return versions.filter(
    (v) =>
      v.name.toLowerCase().includes(lowerQuery) ||
      v.description?.toLowerCase()?.includes(lowerQuery)
  );
}

/**
 * Format version timestamp as relative time
 */
export function formatVersionTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "just now";
  } else if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  } else if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  } else {
    return new Date(timestamp).toLocaleDateString();
  }
}

/**
 * Get all unique tags from versions
 */
export function getUniqueTags(versions: VersionMetadata[]): string[] {
  const tagsSet = new Set<string>();
  versions.forEach((v) => {
    v.tags?.forEach((tag) => tagsSet.add(tag));
  });
  return Array.from(tagsSet).sort();
}

/**
 * Build version tree (for branching visualization)
 */
export interface VersionNode {
  version: VersionMetadata;
  children: VersionNode[];
}

export function buildVersionTree(versions: VersionMetadata[]): VersionNode[] {
  const nodeMap = new Map<string, VersionNode>();
  const roots: VersionNode[] = [];

  // Create nodes
  versions.forEach((version) => {
    nodeMap.set(version.id, { version, children: [] });
  });

  // Build tree
  versions.forEach((version) => {
    const node = nodeMap.get(version.id)!;
    if (version.parentId) {
      const parent = nodeMap.get(version.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
}
