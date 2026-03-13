/**
 * Port Entity Schema - Infrastructure Domain
 *
 * Schema for port entities in the infrastructure domain.
 * Covers maritime and river ports for cargo and passenger transport.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Port Entity Schema ====================

export const PortEntitySchema = EntitySchema.extend({
  type: z.literal("Port"),
  properties: z
    .object({
      port_type: z
        .enum([
          "seaport",
          "river_port",
          "lake_port",
          "container",
          "bulk_cargo",
          "passenger",
          "fishing",
          "naval",
          "marina",
        ])
        .optional(),
      established_date: z.string().optional(),
      berths: z.number().min(0).optional(),
      water_depth: z.number().min(0).optional(), // meters
      cargo_capacity: z.number().min(0).optional(), // TEU or tonnes
      annual_throughput: z.number().min(0).optional(),
      storage_area: z.number().min(0).optional(), // square meters
      crane_capacity: z.number().min(0).optional(), // tonnes
      facilities: z.array(z.string()).optional(),
      connected_waterway: z.string().optional(),
      customs_facility: z.boolean().optional(),
      rail_connection: z.boolean().optional(),
      road_connection: z.array(z.string()).optional(), // Road UIDs
      operating_authority: z.string().optional(), // Organization UID
      security_level: z.enum(["ISPS_1", "ISPS_2", "ISPS_3"]).optional(),
      container_handling: z.boolean().optional(),
      bulk_handling: z.boolean().optional(),
      passenger_terminal: z.boolean().optional(),
      dry_dock: z.boolean().optional(),
      ship_repair: z.boolean().optional(),
      bunkering: z.boolean().optional(),
      environmental_rating: z.enum(["A", "B", "C", "D", "F"]).optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const PORT_UID_PREFIX = "port";

export const validatePortUID = (uid: string): boolean => {
  return uid.startsWith("port:");
};

// ==================== Type Exports ====================

export type PortEntity = z.infer<typeof PortEntitySchema>;
