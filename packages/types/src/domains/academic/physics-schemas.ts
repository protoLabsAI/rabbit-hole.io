import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// Force Entity
export const ForceEntitySchema = EntitySchema.extend({
  type: z.literal("Force"),
  properties: z
    .object({
      force_type: z
        .enum(["gravitational", "electromagnetic", "strong", "weak"])
        .optional(),
    })
    .optional(),
});
export const FORCE_UID_PREFIX = "force";
export function validateForceUID(uid: string): boolean {
  return uid.startsWith(`${FORCE_UID_PREFIX}:`);
}

// Field Entity
export const FieldEntitySchema = EntitySchema.extend({
  type: z.literal("Field"),
  properties: z
    .object({
      field_type: z.enum(["scalar", "vector", "tensor"]).optional(),
    })
    .optional(),
});
export const FIELD_UID_PREFIX = "field";
export function validateFieldUID(uid: string): boolean {
  return uid.startsWith(`${FIELD_UID_PREFIX}:`);
}

// Energy Type Entity
export const EnergyTypeEntitySchema = EntitySchema.extend({
  type: z.literal("Energy_Type"),
  properties: z
    .object({
      energy_form: z
        .enum(["kinetic", "potential", "thermal", "chemical"])
        .optional(),
    })
    .optional(),
});
export const ENERGY_TYPE_UID_PREFIX = "energy_type";
export function validateEnergyTypeUID(uid: string): boolean {
  return uid.startsWith(`${ENERGY_TYPE_UID_PREFIX}:`);
}

// Physical Process Entity
export const PhysicalProcessEntitySchema = EntitySchema.extend({
  type: z.literal("Physical_Process"),
  properties: z
    .object({
      process_type: z
        .enum(["thermodynamic", "quantum", "classical"])
        .optional(),
    })
    .optional(),
});
export const PHYSICAL_PROCESS_UID_PREFIX = "physical_process";
export function validatePhysicalProcessUID(uid: string): boolean {
  return uid.startsWith(`${PHYSICAL_PROCESS_UID_PREFIX}:`);
}

// Wave Entity
export const WaveEntitySchema = EntitySchema.extend({
  type: z.literal("Wave"),
  properties: z
    .object({
      wave_type: z.enum(["electromagnetic", "mechanical", "matter"]).optional(),
      frequency: z.number().optional(),
      wavelength: z.number().optional(),
    })
    .optional(),
});
export const WAVE_UID_PREFIX = "wave";
export function validateWaveUID(uid: string): boolean {
  return uid.startsWith(`${WAVE_UID_PREFIX}:`);
}

// Quantum State Entity
export const QuantumStateEntitySchema = EntitySchema.extend({
  type: z.literal("Quantum_State"),
  properties: z
    .object({
      state_type: z.enum(["ground", "excited", "superposition"]).optional(),
    })
    .optional(),
});
export const QUANTUM_STATE_UID_PREFIX = "quantum_state";
export function validateQuantumStateUID(uid: string): boolean {
  return uid.startsWith(`${QUANTUM_STATE_UID_PREFIX}:`);
}

// Element Entity
export const ElementEntitySchema = EntitySchema.extend({
  type: z.literal("Element"),
  properties: z
    .object({
      atomic_number: z.number().int().positive().optional(),
      symbol: z.string().optional(),
      atomic_mass: z.number().positive().optional(),
    })
    .optional(),
});
export const ELEMENT_UID_PREFIX = "element";
export function validateElementUID(uid: string): boolean {
  return uid.startsWith(`${ELEMENT_UID_PREFIX}:`);
}

// Compound Entity
export const CompoundEntitySchema = EntitySchema.extend({
  type: z.literal("Compound"),
  properties: z
    .object({
      molecular_formula: z.string().optional(),
      molecular_weight: z.number().positive().optional(),
    })
    .optional(),
});
export const COMPOUND_UID_PREFIX = "compound";
export function validateCompoundUID(uid: string): boolean {
  return uid.startsWith(`${COMPOUND_UID_PREFIX}:`);
}

// Reaction Entity
export const ReactionEntitySchema = EntitySchema.extend({
  type: z.literal("Reaction"),
  properties: z
    .object({
      reaction_type: z
        .enum(["synthesis", "decomposition", "combustion", "redox"])
        .optional(),
    })
    .optional(),
});
export const REACTION_UID_PREFIX = "reaction";
export function validateReactionUID(uid: string): boolean {
  return uid.startsWith(`${REACTION_UID_PREFIX}:`);
}

// Molecule Entity
export const MoleculeEntitySchema = EntitySchema.extend({
  type: z.literal("Molecule"),
  properties: z
    .object({
      atoms_count: z.number().int().positive().optional(),
      polarity: z.enum(["polar", "nonpolar"]).optional(),
    })
    .optional(),
});
export const MOLECULE_UID_PREFIX = "molecule";
export function validateMoleculeUID(uid: string): boolean {
  return uid.startsWith(`${MOLECULE_UID_PREFIX}:`);
}

// Ion Entity
export const IonEntitySchema = EntitySchema.extend({
  type: z.literal("Ion"),
  properties: z
    .object({
      charge: z.number().optional(),
      ion_type: z.enum(["cation", "anion"]).optional(),
    })
    .optional(),
});
export const ION_UID_PREFIX = "ion";
export function validateIonUID(uid: string): boolean {
  return uid.startsWith(`${ION_UID_PREFIX}:`);
}

// Chemical Bond Entity
export const ChemicalBondEntitySchema = EntitySchema.extend({
  type: z.literal("Chemical_Bond"),
  properties: z
    .object({
      bond_type: z
        .enum(["ionic", "covalent", "metallic", "hydrogen"])
        .optional(),
    })
    .optional(),
});
export const CHEMICAL_BOND_UID_PREFIX = "chemical_bond";
export function validateChemicalBondUID(uid: string): boolean {
  return uid.startsWith(`${CHEMICAL_BOND_UID_PREFIX}:`);
}

// Catalyst Entity
export const CatalystEntitySchema = EntitySchema.extend({
  type: z.literal("Catalyst"),
  properties: z
    .object({
      catalyst_type: z
        .enum(["homogeneous", "heterogeneous", "enzymatic"])
        .optional(),
    })
    .optional(),
});
export const CATALYST_UID_PREFIX = "catalyst";
export function validateCatalystUID(uid: string): boolean {
  return uid.startsWith(`${CATALYST_UID_PREFIX}:`);
}
