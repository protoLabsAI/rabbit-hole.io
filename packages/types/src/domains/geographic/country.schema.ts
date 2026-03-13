/**
 * Country Entity Schema - Geographic Domain
 *
 * Schema for country entities in the geographic domain.
 * Covers nation-states and sovereign territories.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Country Entity Schema ====================

export const CountryEntitySchema = EntitySchema.extend({
  type: z.literal("Country"),
  properties: z
    .object({
      independence: z.string().optional(), // independence date
      founded: z.string().optional(), // founding/establishment date
      dissolved: z.string().optional(), // dissolution (USSR, Yugoslavia, etc.)
      capital: z.string().optional(), // capital city
      government: z.string().optional(), // government type
      currency: z.string().optional(), // primary currency
      region: z.string().optional(), // geographic region
      population: z.number().min(0).optional(), // current population
      area: z.number().min(0).optional(), // area in square kilometers
      gdp: z.number().min(0).optional(), // GDP in USD
      languages: z.array(z.string()).optional(), // official languages
      borders: z.array(z.string()).optional(), // neighboring country UIDs
      continent: z.string().optional(), // continent UID
      iso_code: z.string().optional(), // ISO country code
      calling_code: z.string().optional(), // international calling code
      tld: z.string().optional(), // top-level domain
      un_member: z.boolean().optional(), // UN membership status
      sovereignty: z
        .enum(["sovereign", "territory", "dependency", "disputed"])
        .optional(),
      development_status: z
        .enum(["developed", "developing", "least_developed"])
        .optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const COUNTRY_UID_PREFIX = "country";

export const validateCountryUID = (uid: string): boolean => {
  return uid.startsWith("country:");
};

// ==================== Type Exports ====================

export type CountryEntity = z.infer<typeof CountryEntitySchema>;
