/**
 * Deep Agent - Type Definitions
 */

import type { Entity, EntityType } from "@protolabsai/types";

export interface SubAgent {
  name: string;
  description: string;
  prompt: string;
  tools?: string[];
}

export type TodoStatus = "pending" | "in_progress" | "completed" | "failed";

export interface Todo {
  content: string;
  status: TodoStatus;
}

export interface FieldAnalysis {
  fieldName: string;
  fieldValue: unknown;
  shouldCreateEntity: boolean;
  suggestedEntityType: EntityType;
  suggestedRelationType: string;
  confidence: number;
}

export interface DeduplicationResult {
  found: boolean;
  entity?: Entity;
  matchType?: "exact" | "alias" | "fuzzy";
}

export type ResearchDepth = "basic" | "detailed" | "comprehensive";

export interface SearxngInfobox {
  infobox: string;
  content: string;
  attributes: Array<{ label: string; value: string }>;
  urls: Array<{ url: string; title: string }>;
  relatedTopics: Array<{ name: string }>;
}
