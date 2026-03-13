/**
 * Route Entity Schema - Transportation Domain
 *
 * Schema for route entities in the transportation domain.
 * Covers transportation routes and service lines.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Route Entity Schema ====================

export const RouteEntitySchema = EntitySchema.extend({
  type: z.literal("Route"),
  properties: z
    .object({
      route_type: z
        .enum([
          "bus",
          "train",
          "subway",
          "ferry",
          "airline",
          "shipping",
          "highway",
          "walking",
          "cycling",
        ])
        .optional(),
      route_number: z.string().optional(),
      established_date: z.string().optional(),
      origin: z.string().optional(), // Station/Airport/Port UID
      destination: z.string().optional(), // Station/Airport/Port UID
      stops: z.array(z.string()).optional(), // Station UIDs
      distance: z.number().min(0).optional(), // kilometers
      duration: z.number().min(0).optional(), // minutes
      frequency: z.string().optional(), // service frequency
      operating_hours: z.string().optional(),
      fare: z.number().min(0).optional(),
      operator: z.string().optional(), // Organization UID
      vehicles_used: z.array(z.string()).optional(), // Vehicle/Aircraft/Ship/Train UIDs
      seasonal_service: z.boolean().optional(),
      accessibility: z.boolean().optional(),
      express_service: z.boolean().optional(),
      capacity: z.number().min(0).optional(),
      average_ridership: z.number().min(0).optional(),
      on_time_performance: z.number().min(0).max(100).optional(),
      route_map: z.string().url().optional(),
      real_time_tracking: z.boolean().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const ROUTE_UID_PREFIX = "route";

export const validateRouteUID = (uid: string): boolean => {
  return uid.startsWith("route:");
};

// ==================== Type Exports ====================

export type RouteEntity = z.infer<typeof RouteEntitySchema>;
