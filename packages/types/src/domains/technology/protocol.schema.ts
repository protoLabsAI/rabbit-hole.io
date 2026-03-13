/**
 * Protocol Entity Schema - Technology Domain
 *
 * Schema for protocol entities in the technology domain.
 * Covers network protocols, communication standards, and data transfer protocols.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Protocol Entity Schema ====================

export const ProtocolEntitySchema = EntitySchema.extend({
  type: z.literal("Protocol"),
  properties: z
    .object({
      protocol_type: z
        .enum([
          "network",
          "communication",
          "security",
          "data_transfer",
          "messaging",
          "streaming",
          "web",
          "other",
        ])
        .optional(),
      layer: z
        .enum([
          "physical",
          "data_link",
          "network",
          "transport",
          "session",
          "presentation",
          "application",
        ])
        .optional(),
      standard_body: z.string().optional(), // IEEE, IETF, W3C, etc.
      rfc_number: z.string().optional(),
      port_numbers: z.array(z.number()).optional(),
      encryption: z.boolean().optional(),
      reliability: z.enum(["reliable", "unreliable", "best_effort"]).optional(),
      connection_type: z
        .enum(["connectionless", "connection_oriented", "both"])
        .optional(),
      version: z.string().optional(),
      specification: z.string().url().optional(),
      implementation_examples: z.array(z.string()).optional(), // Software UIDs
      supported_by: z.array(z.string()).optional(), // Hardware/Software UIDs
      superseded_by: z.string().optional(), // Protocol UID
      supersedes: z.string().optional(), // Protocol UID
      status: z
        .enum(["active", "deprecated", "obsolete", "experimental", "draft"])
        .optional(),
      adoption_rate: z
        .enum(["widespread", "common", "niche", "experimental"])
        .optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const PROTOCOL_UID_PREFIX = "protocol";

export const validateProtocolUID = (uid: string): boolean => {
  return uid.startsWith("protocol:");
};

// ==================== Type Exports ====================

export type ProtocolEntity = z.infer<typeof ProtocolEntitySchema>;
