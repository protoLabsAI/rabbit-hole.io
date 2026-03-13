/**
 * Movement Entity Schema - Social Domain
 *
 * Schema for social and political movement entities.
 * Covers organized groups working toward social or political change.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Movement Entity Schema ====================

export const MovementEntitySchema = EntitySchema.extend({
  type: z.literal("Movement"),
  properties: z
    .object({
      ideology: z.string().optional(), // political/social ideology
      founded: z.string().optional(), // founding date or period
      ended: z.string().optional(), // movement end date
      transformed: z.string().optional(), // transformation date
      peakStart: z.string().optional(), // peak period start
      peakEnd: z.string().optional(), // peak period end
      keyFigures: z.array(z.string()).optional(), // prominent leader UIDs
      geography: z.string().optional(), // geographic scope
      topic: z.string().optional(), // primary focus area
      goals: z.array(z.string()).optional(), // stated objectives
      tactics: z.array(z.string()).optional(), // methods employed
      status: z
        .enum(["active", "dormant", "defunct", "transformed"])
        .optional(),
      size: z
        .enum(["fringe", "small", "moderate", "large", "massive"])
        .optional(),
      influence: z
        .enum(["minimal", "local", "regional", "national", "international"])
        .optional(),
      opposition: z.array(z.string()).optional(), // opposing movement UIDs
      supportingOrganizations: z.array(z.string()).optional(), // supporting org UIDs
      majorEvents: z.array(z.string()).optional(), // significant event UIDs
      successes: z.array(z.string()).optional(), // achieved goals
      challenges: z.array(z.string()).optional(), // major obstacles
    })
    .optional(),
});

// ==================== UID Validation ====================

export const MOVEMENT_UID_PREFIX = "movement";

export const validateMovementUID = (uid: string): boolean => {
  return uid.startsWith("movement:");
};

// ==================== Type Exports ====================

export type MovementEntity = z.infer<typeof MovementEntitySchema>;
