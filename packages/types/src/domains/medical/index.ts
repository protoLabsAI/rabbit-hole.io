/**
 * Medical Domain - Index
 *
 * Exports all medical entity schemas and provides domain-specific
 * UID validation and entity type mappings.
 */

// ==================== Schema Imports ====================

export * from "./disease.schema";
export * from "./drug.schema";
export * from "./treatment.schema";
export * from "./symptom.schema";
export * from "./condition.schema";
export * from "./medical-device.schema";
export * from "./hospital.schema";
export * from "./clinic.schema";
export * from "./pharmacy.schema";
export * from "./insurance.schema";
export * from "./clinical-trial.schema";

import type { DomainMetadata } from "../../domain-metadata";

import {
  ClinicEntitySchema,
  validateClinicUID,
  CLINIC_UID_PREFIX,
} from "./clinic.schema";
import {
  ClinicalTrialEntitySchema,
  validateClinicalTrialUID,
  CLINICAL_TRIAL_UID_PREFIX,
} from "./clinical-trial.schema";
import {
  ConditionEntitySchema,
  validateConditionUID,
  CONDITION_UID_PREFIX,
} from "./condition.schema";
import {
  DiseaseEntitySchema,
  validateDiseaseUID,
  DISEASE_UID_PREFIX,
} from "./disease.schema";
import {
  DrugEntitySchema,
  validateDrugUID,
  DRUG_UID_PREFIX,
} from "./drug.schema";
import {
  HospitalEntitySchema,
  validateHospitalUID,
  HOSPITAL_UID_PREFIX,
} from "./hospital.schema";
import {
  InsuranceEntitySchema,
  validateInsuranceUID,
  INSURANCE_UID_PREFIX,
} from "./insurance.schema";
import {
  MedicalDeviceEntitySchema,
  validateMedicalDeviceUID,
  MEDICAL_DEVICE_UID_PREFIX,
} from "./medical-device.schema";
import {
  PharmacyEntitySchema,
  validatePharmacyUID,
  PHARMACY_UID_PREFIX,
} from "./pharmacy.schema";
import {
  SymptomEntitySchema,
  validateSymptomUID,
  SYMPTOM_UID_PREFIX,
} from "./symptom.schema";
import {
  TreatmentEntitySchema,
  validateTreatmentUID,
  TREATMENT_UID_PREFIX,
} from "./treatment.schema";

// ==================== Domain Registry ====================

/**
 * All medical entity schemas mapped by type name
 */
export const MEDICAL_ENTITY_SCHEMAS = {
  Disease: DiseaseEntitySchema,
  Drug: DrugEntitySchema,
  Treatment: TreatmentEntitySchema,
  Symptom: SymptomEntitySchema,
  Condition: ConditionEntitySchema,
  Medical_Device: MedicalDeviceEntitySchema,
  Hospital: HospitalEntitySchema,
  Clinic: ClinicEntitySchema,
  Pharmacy: PharmacyEntitySchema,
  Insurance: InsuranceEntitySchema,
  Clinical_Trial: ClinicalTrialEntitySchema,
} as const;

/**
 * All medical entity types
 */
export const MEDICAL_ENTITY_TYPES = Object.keys(
  MEDICAL_ENTITY_SCHEMAS
) as Array<keyof typeof MEDICAL_ENTITY_SCHEMAS>;

/**
 * UID prefix mappings for medical entities
 */
export const MEDICAL_UID_PREFIXES = {
  [DISEASE_UID_PREFIX]: "Disease",
  [DRUG_UID_PREFIX]: "Drug",
  [TREATMENT_UID_PREFIX]: "Treatment",
  [SYMPTOM_UID_PREFIX]: "Symptom",
  [CONDITION_UID_PREFIX]: "Condition",
  [MEDICAL_DEVICE_UID_PREFIX]: "Medical_Device",
  [HOSPITAL_UID_PREFIX]: "Hospital",
  [CLINIC_UID_PREFIX]: "Clinic",
  [PHARMACY_UID_PREFIX]: "Pharmacy",
  [INSURANCE_UID_PREFIX]: "Insurance",
  [CLINICAL_TRIAL_UID_PREFIX]: "Clinical_Trial",
} as const;

/**
 * UID validators for medical entities
 */
export const MEDICAL_UID_VALIDATORS = {
  [DISEASE_UID_PREFIX]: validateDiseaseUID,
  [DRUG_UID_PREFIX]: validateDrugUID,
  [TREATMENT_UID_PREFIX]: validateTreatmentUID,
  [SYMPTOM_UID_PREFIX]: validateSymptomUID,
  [CONDITION_UID_PREFIX]: validateConditionUID,
  [MEDICAL_DEVICE_UID_PREFIX]: validateMedicalDeviceUID,
  [HOSPITAL_UID_PREFIX]: validateHospitalUID,
  [CLINIC_UID_PREFIX]: validateClinicUID,
  [PHARMACY_UID_PREFIX]: validatePharmacyUID,
  [INSURANCE_UID_PREFIX]: validateInsuranceUID,
  [CLINICAL_TRIAL_UID_PREFIX]: validateClinicalTrialUID,
} as const;

// ==================== Domain Helper Functions ====================

/**
 * Validate if a UID belongs to the medical domain
 */
export function isMedicalUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  return prefix in MEDICAL_UID_VALIDATORS;
}

/**
 * Get entity type from medical UID
 */
export function getMedicalEntityType(uid: string): string | null {
  const prefix = uid.split(":")[0];
  return (
    MEDICAL_UID_PREFIXES[prefix as keyof typeof MEDICAL_UID_PREFIXES] || null
  );
}

/**
 * Validate medical UID format
 */
export function validateMedicalUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  const validator =
    MEDICAL_UID_VALIDATORS[prefix as keyof typeof MEDICAL_UID_VALIDATORS];
  return validator ? validator(uid) : false;
}

// ==================== Domain Configuration (New) ====================

export * from "./domain.config";
export { medicalDomainConfig } from "./domain.config";

// ==================== Domain Metadata (Deprecated) ====================

/**
 * @deprecated Use medicalDomainConfig from domain-system instead.
 * This export maintained for backward compatibility only.
 * Will be removed in v2.0.0
 */
export const MEDICAL_DOMAIN_INFO: DomainMetadata = {
  name: "medical",
  description:
    "Medical entities - diseases, drugs, treatments, symptoms, conditions, devices, hospitals, clinics, pharmacies, insurance, clinical trials",
  entityCount: Object.keys(MEDICAL_ENTITY_SCHEMAS).length,
  relationships: [
    "TREATS",
    "CAUSES",
    "MANIFESTS_AS",
    "PRESCRIBED_FOR",
    "ADMINISTERED_AT",
    "COVERED_BY",
    "STUDIED_IN",
    "DIAGNOSED_WITH",
    "HOSPITALIZED_FOR",
    "REFERRED_TO",
    "TREATED_BY", // Medical treatment relationship
    "MANAGES", // Medical management
  ],
  ui: {
    color: "#EF4444", // Red - health/medical
    icon: "🏥", // Hospital/healthcare
    entityIcons: {
      Disease: "🦠",
      Drug: "💊",
      Treatment: "💉",
      Symptom: "🩺",
      Condition: "🔬",
      Medical_Device: "🩹",
      Hospital: "🏥",
      Clinic: "🩺",
      Pharmacy: "💊",
      Insurance: "📋",
      Clinical_Trial: "🧪",
    },
  },
} as const;
