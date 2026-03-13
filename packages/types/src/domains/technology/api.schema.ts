/**
 * API Entity Schema - Technology Domain
 *
 * Schema for API entities in the technology domain.
 * Covers web APIs, services, and application interfaces.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== API Entity Schema ====================

export const APIEntitySchema = EntitySchema.extend({
  type: z.literal("API"),
  properties: z
    .object({
      api_type: z
        .enum(["REST", "GraphQL", "SOAP", "RPC", "WebSocket", "gRPC", "Other"])
        .optional(),
      version: z.string().optional(),
      base_url: z.string().url().optional(),
      documentation: z.string().url().optional(),
      authentication: z
        .array(
          z.enum(["api_key", "oauth", "basic_auth", "bearer_token", "none"])
        )
        .optional(),
      rate_limits: z.string().optional(),
      provider: z.string().optional(), // Provider organization UID
      pricing_model: z
        .enum(["free", "freemium", "pay_per_use", "subscription", "enterprise"])
        .optional(),
      data_format: z
        .array(z.enum(["json", "xml", "yaml", "csv", "binary"]))
        .optional(),
      industry: z.array(z.string()).optional(),
      status: z.enum(["active", "deprecated", "beta", "planned"]).optional(),
      endpoints: z.number().min(0).optional(), // Number of endpoints
      uptime: z.number().min(0).max(100).optional(), // Uptime percentage
      response_time: z.number().min(0).optional(), // Average response time in ms
      supported_methods: z
        .array(z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"]))
        .optional(),
      cors_enabled: z.boolean().optional(),
      ssl_required: z.boolean().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const API_UID_PREFIX = "api";

export const validateAPIUID = (uid: string): boolean => {
  return uid.startsWith("api:");
};

// ==================== Type Exports ====================

export type APIEntity = z.infer<typeof APIEntitySchema>;
