/**
 * Insect Entity Schema - Biological Domain
 *
 * Schema for insect entities in the biological domain.
 * Specialized for insect-specific properties and lifecycle stages.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Insect Entity Schema ====================

export const InsectEntitySchema = EntitySchema.extend({
  type: z.literal("Insect"),
  properties: z
    .object({
      scientificName: z.string().optional(), // Taxonomic scientific name
      commonNames: z.array(z.string()).optional(), // Common names across regions
      taxonomicRank: z.string().optional(), // Species, subspecies, etc.
      conservationStatus: z
        .enum([
          "extinct",
          "extinct_in_wild",
          "critically_endangered",
          "endangered",
          "vulnerable",
          "near_threatened",
          "least_concern",
          "data_deficient",
          "not_evaluated",
        ])
        .optional(),
      habitat: z.string().optional(), // Primary habitat description
      diet: z
        .enum([
          "herbivore",
          "carnivore",
          "omnivore",
          "nectar_feeder",
          "blood_feeder",
          "decomposer",
          "parasitic",
        ])
        .optional(),
      lifecycle: z
        .enum([
          "complete_metamorphosis", // egg -> larva -> pupa -> adult
          "incomplete_metamorphosis", // egg -> nymph -> adult
          "no_metamorphosis", // ametabolous
        ])
        .optional(),
      socialStructure: z
        .enum(["solitary", "colonial", "eusocial", "swarm", "territorial"])
        .optional(),
      wingType: z
        .enum([
          "no_wings",
          "two_wings", // Diptera
          "four_wings", // most insects
          "hardened_forewings", // Coleoptera
          "scale_wings", // Lepidoptera
        ])
        .optional(),
      bodyLength: z.number().min(0).optional(), // in millimeters
      geographicRange: z.string().optional(), // Geographic distribution
      threats: z.array(z.string()).optional(), // Conservation threats
      economicImpact: z
        .enum(["beneficial", "pest", "neutral", "mixed"])
        .optional(),
      pollinatorOf: z.array(z.string()).optional(), // Plant species UIDs
      class: z.string().default("Insecta"),
      order: z.string().optional(), // Lepidoptera, Coleoptera, etc.
      family: z.string().optional(), // Taxonomic family
      genus: z.string().optional(), // Taxonomic genus
      species: z.string().optional(), // Taxonomic species
    })
    .optional(),
});

// ==================== UID Validation ====================

export const INSECT_UID_PREFIX = "insect";

export const validateInsectUID = (uid: string): boolean => {
  return uid.startsWith("insect:");
};

// ==================== Type Exports ====================

export type InsectEntity = z.infer<typeof InsectEntitySchema>;
