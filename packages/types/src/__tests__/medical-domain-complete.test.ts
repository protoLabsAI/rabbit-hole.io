/**
 * Medical Domain Complete - Test Suite
 *
 * Comprehensive tests for the complete medical domain including
 * all 11 medical entities.
 */

import { describe, it, expect } from "vitest";

import {
  MEDICAL_ENTITY_SCHEMAS,
  MEDICAL_UID_VALIDATORS,
  MEDICAL_ENTITY_TYPES,
  validateMedicalUID,
  getMedicalEntityType,
  isMedicalUID,
  DiseaseEntitySchema,
  DrugEntitySchema,
  HospitalEntitySchema,
} from "../domains/medical";
import { EntitySchemaRegistry } from "../entity-schema-registry";

describe("Medical Domain - Complete Migration", () => {
  // ==================== Registry Tests ====================

  describe("Domain Registry", () => {
    it("includes all 11 medical entity types", () => {
      expect(MEDICAL_ENTITY_TYPES).toEqual([
        "Disease",
        "Drug",
        "Treatment",
        "Symptom",
        "Condition",
        "Medical_Device",
        "Hospital",
        "Clinic",
        "Pharmacy",
        "Insurance",
        "Clinical_Trial",
      ]);
      expect(MEDICAL_ENTITY_TYPES).toHaveLength(11);
    });

    it("has schemas for all entity types", () => {
      expect(MEDICAL_ENTITY_SCHEMAS.Disease).toBeDefined();
      expect(MEDICAL_ENTITY_SCHEMAS.Drug).toBeDefined();
      expect(MEDICAL_ENTITY_SCHEMAS.Treatment).toBeDefined();
      expect(MEDICAL_ENTITY_SCHEMAS.Symptom).toBeDefined();
      expect(MEDICAL_ENTITY_SCHEMAS.Condition).toBeDefined();
      expect(MEDICAL_ENTITY_SCHEMAS.Medical_Device).toBeDefined();
      expect(MEDICAL_ENTITY_SCHEMAS.Hospital).toBeDefined();
      expect(MEDICAL_ENTITY_SCHEMAS.Clinic).toBeDefined();
      expect(MEDICAL_ENTITY_SCHEMAS.Pharmacy).toBeDefined();
      expect(MEDICAL_ENTITY_SCHEMAS.Insurance).toBeDefined();
      expect(MEDICAL_ENTITY_SCHEMAS.Clinical_Trial).toBeDefined();
    });

    it("has UID validators for all entity types", () => {
      expect(MEDICAL_UID_VALIDATORS.disease).toBeDefined();
      expect(MEDICAL_UID_VALIDATORS.drug).toBeDefined();
      expect(MEDICAL_UID_VALIDATORS.treatment).toBeDefined();
      expect(MEDICAL_UID_VALIDATORS.symptom).toBeDefined();
      expect(MEDICAL_UID_VALIDATORS.condition).toBeDefined();
      expect(MEDICAL_UID_VALIDATORS.medical_device).toBeDefined();
      expect(MEDICAL_UID_VALIDATORS.hospital).toBeDefined();
      expect(MEDICAL_UID_VALIDATORS.clinic).toBeDefined();
      expect(MEDICAL_UID_VALIDATORS.pharmacy).toBeDefined();
      expect(MEDICAL_UID_VALIDATORS.insurance).toBeDefined();
      expect(MEDICAL_UID_VALIDATORS.clinical_trial).toBeDefined();
    });
  });

  // ==================== Disease Entity Tests ====================

  describe("Disease Entity", () => {
    it("validates valid disease entity", () => {
      const validDisease = {
        uid: "disease:covid_19",
        type: "Disease",
        name: "COVID-19",
        properties: {
          disease_type: "infectious",
          icd_code: "U07.1",
          prevalence: 15000,
          mortality_rate: 0.02,
          age_of_onset: "all ages",
          affected_organs: ["respiratory", "cardiovascular"],
          symptoms: ["symptom:fever", "symptom:cough", "symptom:fatigue"],
          risk_factors: ["age", "immunocompromised", "comorbidities"],
          prevention_methods: ["vaccination", "masking", "social distancing"],
          prognosis: "good",
          chronic: false,
          contagious: true,
          hereditary: false,
          treatments: ["treatment:antivirals", "treatment:supportive_care"],
          diagnostic_methods: ["PCR test", "Antigen test"],
          specialist_required: false,
        },
      };

      const result = DiseaseEntitySchema.safeParse(validDisease);
      expect(result.success).toBe(true);
    });

    it("validates disease UID format", () => {
      expect(validateMedicalUID("disease:covid_19")).toBe(true);
      expect(MEDICAL_UID_VALIDATORS.disease("disease:covid_19")).toBe(true);
      expect(MEDICAL_UID_VALIDATORS.disease("drug:covid_19")).toBe(false);
    });

    it("gets correct entity type from disease UID", () => {
      expect(getMedicalEntityType("disease:test")).toBe("Disease");
      expect(isMedicalUID("disease:test")).toBe(true);
    });
  });

  // ==================== Drug Entity Tests ====================

  describe("Drug Entity", () => {
    it("validates valid drug entity", () => {
      const validDrug = {
        uid: "drug:aspirin",
        type: "Drug",
        name: "Aspirin",
        properties: {
          drug_type: "over_the_counter",
          atc_code: "N02BA01",
          active_ingredients: ["acetylsalicylic acid"],
          mechanism_of_action: "COX inhibition",
          therapeutic_class: ["analgesic", "anti-inflammatory", "antiplatelet"],
          indications: ["pain", "fever", "cardiovascular protection"],
          contraindications: ["bleeding disorders", "allergy"],
          side_effects: ["GI irritation", "bleeding risk"],
          dosage_forms: ["tablet", "chewable", "enteric-coated"],
          approved_date: "1897",
          manufacturer: "company:bayer",
          generic_available: true,
          cost_range: "$0.01-0.10 per dose",
          storage_requirements: "room temperature, dry place",
        },
      };

      const result = DrugEntitySchema.safeParse(validDrug);
      expect(result.success).toBe(true);
    });

    it("validates drug UID format", () => {
      expect(validateMedicalUID("drug:aspirin")).toBe(true);
      expect(MEDICAL_UID_VALIDATORS.drug("drug:aspirin")).toBe(true);
      expect(MEDICAL_UID_VALIDATORS.drug("disease:aspirin")).toBe(false);
    });

    it("gets correct entity type from drug UID", () => {
      expect(getMedicalEntityType("drug:test")).toBe("Drug");
      expect(isMedicalUID("drug:test")).toBe(true);
    });
  });

  // ==================== Hospital Entity Tests ====================

  describe("Hospital Entity", () => {
    it("validates valid hospital entity", () => {
      const validHospital = {
        uid: "hospital:mayo_clinic",
        type: "Hospital",
        name: "Mayo Clinic",
        properties: {
          hospital_type: "academic",
          ownership: "nonprofit",
          bed_count: 1265,
          accreditation: ["Joint Commission", "Magnet Recognition"],
          specialties: ["cardiology", "oncology", "neurology"],
          trauma_level: "I",
          teaching_hospital: true,
          research_hospital: true,
          magnet_status: true,
          emergency_services: true,
          patient_satisfaction_score: 95,
          safety_rating: "A",
          network_affiliations: ["org:mayo_one"],
          services_offered: ["Emergency", "Surgery", "ICU"],
          insurance_accepted: ["insurance:medicare", "insurance:blue_cross"],
          annual_admissions: 65000,
          average_length_of_stay: 4.2,
          mortality_rate: 0.015,
        },
      };

      const result = HospitalEntitySchema.safeParse(validHospital);
      expect(result.success).toBe(true);
    });

    it("validates hospital UID format", () => {
      expect(validateMedicalUID("hospital:mayo_clinic")).toBe(true);
      expect(MEDICAL_UID_VALIDATORS.hospital("hospital:mayo_clinic")).toBe(
        true
      );
      expect(MEDICAL_UID_VALIDATORS.hospital("clinic:mayo_clinic")).toBe(false);
    });

    it("gets correct entity type from hospital UID", () => {
      expect(getMedicalEntityType("hospital:test")).toBe("Hospital");
      expect(isMedicalUID("hospital:test")).toBe(true);
    });
  });

  // ==================== Registry Integration Tests ====================

  describe("Registry Integration", () => {
    const registry = EntitySchemaRegistry.getInstance();

    it("registry recognizes all medical entities", () => {
      expect(registry.getSchema("Disease")).toBeDefined();
      expect(registry.getSchema("Drug")).toBeDefined();
      expect(registry.getSchema("Treatment")).toBeDefined();
      expect(registry.getSchema("Symptom")).toBeDefined();
      expect(registry.getSchema("Condition")).toBeDefined();
      expect(registry.getSchema("Medical_Device")).toBeDefined();
      expect(registry.getSchema("Hospital")).toBeDefined();
      expect(registry.getSchema("Clinic")).toBeDefined();
      expect(registry.getSchema("Pharmacy")).toBeDefined();
      expect(registry.getSchema("Insurance")).toBeDefined();
      expect(registry.getSchema("Clinical_Trial")).toBeDefined();
    });

    it("registry validates medical UIDs correctly", () => {
      expect(registry.validateUID("disease:test")).toBe(true);
      expect(registry.validateUID("drug:test")).toBe(true);
      expect(registry.validateUID("treatment:test")).toBe(true);
      expect(registry.validateUID("symptom:test")).toBe(true);
      expect(registry.validateUID("condition:test")).toBe(true);
      expect(registry.validateUID("medical_device:test")).toBe(true);
      expect(registry.validateUID("hospital:test")).toBe(true);
      expect(registry.validateUID("clinic:test")).toBe(true);
      expect(registry.validateUID("pharmacy:test")).toBe(true);
      expect(registry.validateUID("insurance:test")).toBe(true);
      expect(registry.validateUID("clinical_trial:test")).toBe(true);
    });

    it("registry maps UIDs to correct domain", () => {
      expect(registry.getDomainFromUID("disease:test")).toBe("medical");
      expect(registry.getDomainFromUID("drug:test")).toBe("medical");
      expect(registry.getDomainFromUID("hospital:test")).toBe("medical");
      expect(registry.getDomainFromUID("insurance:test")).toBe("medical");
    });
  });

  // ==================== Cross-Domain Integration Tests ====================

  describe("Cross-Domain Integration", () => {
    it("maintains all previously migrated domains", () => {
      const registry = EntitySchemaRegistry.getInstance();

      // All previous domains should still work
      expect(registry.getSchema("Animal")).toBeDefined();
      expect(registry.getSchema("Person")).toBeDefined();
      expect(registry.getSchema("Country")).toBeDefined();
      expect(registry.getSchema("Software")).toBeDefined();
      expect(registry.getSchema("Currency")).toBeDefined();

      // Medical domain should now work too
      expect(registry.getSchema("Disease")).toBeDefined();
      expect(registry.getSchema("Hospital")).toBeDefined();
    });

    it("supports cross-domain medical relationships", () => {
      // Test that medical entities can reference other domains
      const hospitalWithLocation = {
        uid: "hospital:test_hospital",
        type: "Hospital",
        name: "Test Hospital",
        properties: {
          hospital_type: "general",
          // References to geographic domain
          coordinates: {
            latitude: 40.7128,
            longitude: -74.006,
          },
          // Could reference Person entities as medical staff
          medical_staff: ["person:dr_smith"],
        },
      };

      const result = HospitalEntitySchema.safeParse(hospitalWithLocation);
      expect(result.success).toBe(true);
    });

    it("all medical entities inherit universal properties", () => {
      const testDisease = {
        uid: "disease:test",
        type: "Disease",
        name: "Test Disease",
        // Universal properties should be inherited
        startDate: "2020-01-01",
        status: "active",
        relatedEvents: ["event:disease_discovery"],
      };

      const result = DiseaseEntitySchema.safeParse(testDisease);
      expect(result.success).toBe(true);
    });
  });

  // ==================== Medical Ecosystem Tests ====================

  describe("Medical Ecosystem Relationships", () => {
    it("supports complete medical treatment workflow", () => {
      const medicalBundle = {
        entities: [
          {
            uid: "disease:diabetes",
            type: "Disease",
            name: "Diabetes",
            properties: { disease_type: "metabolic" },
          },
          {
            uid: "symptom:high_blood_sugar",
            type: "Symptom",
            name: "High Blood Sugar",
            properties: { symptom_type: "physical" },
          },
          {
            uid: "drug:metformin",
            type: "Drug",
            name: "Metformin",
            properties: { drug_type: "prescription" },
          },
          {
            uid: "treatment:diabetes_management",
            type: "Treatment",
            name: "Diabetes Management",
            properties: {
              treatment_type: "medication",
              drugs_used: ["drug:metformin"],
            },
          },
          {
            uid: "hospital:diabetes_center",
            type: "Hospital",
            name: "Diabetes Center",
            properties: { specialties: ["endocrinology"] },
          },
        ],
        relationships: [],
        evidence: [],
        content: [],
        files: [],
      };

      // All entities should validate correctly
      medicalBundle.entities.forEach((entity) => {
        const schema =
          MEDICAL_ENTITY_SCHEMAS[
            entity.type as keyof typeof MEDICAL_ENTITY_SCHEMAS
          ];
        const result = schema.safeParse(entity);
        expect(result.success).toBe(true);
      });
    });
  });
});
