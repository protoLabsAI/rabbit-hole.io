import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// Material Entity
export const MaterialEntitySchema = EntitySchema.extend({
  type: z.literal("Material"),
  properties: z
    .object({
      material_type: z
        .enum(["metal", "polymer", "ceramic", "composite"])
        .optional(),
    })
    .optional(),
});
export const MATERIAL_UID_PREFIX = "material";
export function validateMaterialUID(uid: string): boolean {
  return uid.startsWith(`${MATERIAL_UID_PREFIX}:`);
}

// Mineral Entity
export const MineralEntitySchema = EntitySchema.extend({
  type: z.literal("Mineral"),
  properties: z
    .object({
      hardness: z.number().optional(),
      crystal_system: z.string().optional(),
    })
    .optional(),
});
export const MINERAL_UID_PREFIX = "mineral";
export function validateMineralUID(uid: string): boolean {
  return uid.startsWith(`${MINERAL_UID_PREFIX}:`);
}

// Resource Entity
export const ResourceEntitySchema = EntitySchema.extend({
  type: z.literal("Resource"),
  properties: z
    .object({
      resource_type: z
        .enum(["renewable", "non_renewable", "inexhaustible"])
        .optional(),
    })
    .optional(),
});
export const RESOURCE_UID_PREFIX = "resource";
export function validateResourceUID(uid: string): boolean {
  return uid.startsWith(`${RESOURCE_UID_PREFIX}:`);
}

// Substance Entity
export const SubstanceEntitySchema = EntitySchema.extend({
  type: z.literal("Substance"),
  properties: z
    .object({
      state: z.enum(["solid", "liquid", "gas", "plasma"]).optional(),
      toxicity: z.enum(["safe", "harmful", "toxic", "lethal"]).optional(),
    })
    .optional(),
});
export const SUBSTANCE_UID_PREFIX = "substance";
export function validateSubstanceUID(uid: string): boolean {
  return uid.startsWith(`${SUBSTANCE_UID_PREFIX}:`);
}

// Composite Entity
export const CompositeEntitySchema = EntitySchema.extend({
  type: z.literal("Composite"),
  properties: z
    .object({
      matrix_material: z.string().optional(),
      reinforcement_material: z.string().optional(),
    })
    .optional(),
});
export const COMPOSITE_UID_PREFIX = "composite";
export function validateCompositeUID(uid: string): boolean {
  return uid.startsWith(`${COMPOSITE_UID_PREFIX}:`);
}

// Alloy Entity
export const AlloyEntitySchema = EntitySchema.extend({
  type: z.literal("Alloy"),
  properties: z
    .object({
      base_metal: z.string().optional(),
      alloy_elements: z.array(z.string()).optional(),
    })
    .optional(),
});
export const ALLOY_UID_PREFIX = "alloy";
export function validateAlloyUID(uid: string): boolean {
  return uid.startsWith(`${ALLOY_UID_PREFIX}:`);
}

// Crystal Entity
export const CrystalEntitySchema = EntitySchema.extend({
  type: z.literal("Crystal"),
  properties: z
    .object({
      crystal_structure: z
        .enum(["cubic", "hexagonal", "tetragonal"])
        .optional(),
    })
    .optional(),
});
export const CRYSTAL_UID_PREFIX = "crystal";
export function validateCrystalUID(uid: string): boolean {
  return uid.startsWith(`${CRYSTAL_UID_PREFIX}:`);
}

// Weather Event Entity
export const WeatherEventEntitySchema = EntitySchema.extend({
  type: z.literal("Weather_Event"),
  properties: z
    .object({
      event_type: z.enum(["storm", "drought", "flood", "hurricane"]).optional(),
      severity: z.enum(["minor", "moderate", "major", "severe"]).optional(),
    })
    .optional(),
});
export const WEATHER_EVENT_UID_PREFIX = "weather_event";
export function validateWeatherEventUID(uid: string): boolean {
  return uid.startsWith(`${WEATHER_EVENT_UID_PREFIX}:`);
}

// Climate Zone Entity
export const ClimateZoneEntitySchema = EntitySchema.extend({
  type: z.literal("Climate_Zone"),
  properties: z
    .object({
      climate_type: z
        .enum(["tropical", "arid", "temperate", "polar"])
        .optional(),
    })
    .optional(),
});
export const CLIMATE_ZONE_UID_PREFIX = "climate_zone";
export function validateClimateZoneUID(uid: string): boolean {
  return uid.startsWith(`${CLIMATE_ZONE_UID_PREFIX}:`);
}

// Natural Disaster Entity
export const NaturalDisasterEntitySchema = EntitySchema.extend({
  type: z.literal("Natural_Disaster"),
  properties: z
    .object({
      disaster_type: z
        .enum(["earthquake", "tsunami", "volcanic", "wildfire"])
        .optional(),
      magnitude: z.number().optional(),
    })
    .optional(),
});
export const NATURAL_DISASTER_UID_PREFIX = "natural_disaster";
export function validateNaturalDisasterUID(uid: string): boolean {
  return uid.startsWith(`${NATURAL_DISASTER_UID_PREFIX}:`);
}

// Environmental Process Entity
export const EnvironmentalProcessEntitySchema = EntitySchema.extend({
  type: z.literal("Environmental_Process"),
  properties: z
    .object({
      process_type: z
        .enum(["biogeochemical", "hydrological", "atmospheric"])
        .optional(),
    })
    .optional(),
});
export const ENVIRONMENTAL_PROCESS_UID_PREFIX = "environmental_process";
export function validateEnvironmentalProcessUID(uid: string): boolean {
  return uid.startsWith(`${ENVIRONMENTAL_PROCESS_UID_PREFIX}:`);
}

// Carbon Cycle Entity
export const CarbonCycleEntitySchema = EntitySchema.extend({
  type: z.literal("Carbon_Cycle"),
  properties: z
    .object({
      cycle_component: z
        .enum(["atmosphere", "biosphere", "hydrosphere", "geosphere"])
        .optional(),
    })
    .optional(),
});
export const CARBON_CYCLE_UID_PREFIX = "carbon_cycle";
export function validateCarbonCycleUID(uid: string): boolean {
  return uid.startsWith(`${CARBON_CYCLE_UID_PREFIX}:`);
}

// Renewable Energy Entity
export const RenewableEnergyEntitySchema = EntitySchema.extend({
  type: z.literal("Renewable_Energy"),
  properties: z
    .object({
      energy_source: z
        .enum(["solar", "wind", "hydro", "geothermal", "biomass"])
        .optional(),
      efficiency: z.number().min(0).max(100).optional(),
    })
    .optional(),
});
export const RENEWABLE_ENERGY_UID_PREFIX = "renewable_energy";
export function validateRenewableEnergyUID(uid: string): boolean {
  return uid.startsWith(`${RENEWABLE_ENERGY_UID_PREFIX}:`);
}
