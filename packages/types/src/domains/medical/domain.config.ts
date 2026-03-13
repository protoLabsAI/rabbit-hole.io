/**
 * Medical Domain Configuration
 *
 * Unified configuration for medical domain using new domain system.
 */

import type { DomainConfig } from "../../domain-system";

import { medicalCardConfig } from "./card.config";
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

export const medicalDomainConfig: DomainConfig = {
  name: "medical",
  displayName: "Medical",
  description:
    "Medical entities - diseases, drugs, treatments, symptoms, conditions, devices, hospitals, clinics, pharmacies, insurance, clinical trials",
  category: "core",

  entities: {
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
  },

  enrichmentExamples: {
    Disease: {
      input_text:
        "Diabetes mellitus is a metabolic disorder characterized by high blood sugar levels. There are three main types: Type 1, Type 2, and gestational diabetes. The disease affects over 400 million people worldwide.",
      expected_output: {
        diseaseName: "Diabetes mellitus",
        affectedPopulation: 400000000,
        types: ["Type 1", "Type 2", "gestational"],
        characteristic: "high blood sugar levels",
      },
    },
    Drug: {
      input_text:
        "Aspirin is a nonsteroidal anti-inflammatory drug commonly used to reduce pain and fever. It was first synthesized in 1897 and is derived from salicylic acid. The drug is taken orally and has antiplatelet properties.",
      expected_output: {
        drugName: "Aspirin",
        drugType: "nonsteroidal anti-inflammatory",
        discovered: "1897",
        administrationRoute: "orally",
        uses: ["pain relief", "fever reduction"],
      },
    },
    Treatment: {
      input_text:
        "Chemotherapy is a cancer treatment that uses powerful chemicals to kill fast-growing cells. It can be administered intravenously or orally and is often used in combination with other treatments like surgery or radiation.",
      expected_output: {
        treatmentType: "chemotherapy",
        condition: "cancer",
        administration: ["intravenous", "oral"],
        approach: "combination therapy",
      },
    },
    Symptom: {
      input_text:
        "Fever is a temporary increase in body temperature above 38°C (100.4°F). It is commonly associated with infection and typically resolves within a few days. Fever is the body's natural response to fight illness.",
      expected_output: {
        symptomName: "Fever",
        threshold: "38°C",
        duration: "few days",
        associatedWith: ["infection"],
        purpose: "body's natural response",
      },
    },
    Condition: {
      input_text:
        "Hypertension (high blood pressure) is a chronic condition affecting approximately 1.3 billion people worldwide. It is characterized by sustained blood pressure readings above 130/80 mmHg and can lead to heart disease and stroke.",
      expected_output: {
        conditionName: "Hypertension",
        prevalence: 1300000000,
        threshold: "130/80 mmHg",
        complications: ["heart disease", "stroke"],
      },
    },
    Medical_Device: {
      input_text:
        "A pacemaker is an implantable electronic device that regulates heart rhythm. It is surgically implanted under the skin and delivers electrical impulses to maintain proper heart rate. Modern pacemakers have battery lives of 7-10 years.",
      expected_output: {
        deviceType: "pacemaker",
        function: "regulates heart rhythm",
        implantMethod: "surgical implantation",
        batteryLife: "7-10 years",
      },
    },
    Hospital: {
      input_text:
        "Johns Hopkins Hospital in Baltimore, Maryland was founded in 1889 and has 1,154 beds. It is a teaching hospital affiliated with Johns Hopkins University School of Medicine and is consistently ranked among the top hospitals in the United States.",
      expected_output: {
        location: "Baltimore, Maryland",
        founded: "1889",
        beds: 1154,
        hospitalType: "teaching hospital",
        affiliation: "Johns Hopkins University School of Medicine",
      },
    },
    Clinic: {
      input_text:
        "The Cleveland Clinic is a multi-specialty medical center founded in 1921 that serves over 2 million patients annually. It specializes in cardiac care, neurology, and organ transplantation.",
      expected_output: {
        founded: "1921",
        clinicType: "multi-specialty",
        patientsPerYear: 2000000,
        specializations: ["cardiac care", "neurology", "organ transplantation"],
      },
    },
    Pharmacy: {
      input_text:
        "CVS Pharmacy is a retail pharmacy chain with over 9,900 locations across the United States. Founded in 1963, it offers prescription medications, over-the-counter drugs, and health services.",
      expected_output: {
        founded: "1963",
        locations: 9900,
        country: "United States",
        services: [
          "prescription medications",
          "over-the-counter drugs",
          "health services",
        ],
      },
    },
    Insurance: {
      input_text:
        "UnitedHealth Group is the largest health insurance company in the United States by market share, serving over 50 million members. It provides Medicare, Medicaid, and commercial health insurance plans.",
      expected_output: {
        insuranceType: "health insurance",
        country: "United States",
        members: 50000000,
        plans: ["Medicare", "Medicaid", "commercial"],
      },
    },
    Clinical_Trial: {
      input_text:
        "A Phase III clinical trial for a new diabetes medication began in 2023 and will enroll 5,000 participants across 200 sites worldwide. The randomized, double-blind study will run for 3 years and is sponsored by Novo Nordisk.",
      expected_output: {
        phase: "Phase III",
        startYear: "2023",
        participants: 5000,
        sites: 200,
        duration: "3 years",
        sponsor: "Novo Nordisk",
        design: "randomized, double-blind",
      },
    },
  },

  relationshipExample: {
    input_text:
      "The patient was diagnosed with Type 2 Diabetes at Mayo Clinic in 2018. Diabetes manifests as elevated blood glucose levels. The condition causes complications including diabetic neuropathy and retinopathy. The patient was prescribed Metformin to manage the condition, which is administered daily at home. Metformin is covered by United HealthCare insurance. The disease was studied in the landmark DCCT clinical trial from 1993-1998. The patient was referred to an endocrinologist for specialized care. The endocrinologist treats diabetes through medication and lifestyle management. Insulin therapy was hospitalized-for patient during crisis episodes. Continuous glucose monitors are prescribed for daily use. The symptoms are treated by Mayo Clinic's diabetes management team.",
    expected_output: {
      relationships: [
        {
          source_entity: "patient",
          target_entity: "Type 2 Diabetes",
          relationship_type: "DIAGNOSED_WITH",
          start_date: "2018",
          confidence: 0.96,
        },
        {
          source_entity: "Type 2 Diabetes",
          target_entity: "elevated blood glucose",
          relationship_type: "MANIFESTS_AS",
          confidence: 0.94,
        },
        {
          source_entity: "Type 2 Diabetes",
          target_entity: "diabetic neuropathy",
          relationship_type: "CAUSES",
          confidence: 0.91,
        },
        {
          source_entity: "patient",
          target_entity: "Metformin",
          relationship_type: "PRESCRIBED_FOR",
          confidence: 0.97,
        },
        {
          source_entity: "Metformin",
          target_entity: "home",
          relationship_type: "ADMINISTERED_AT",
          confidence: 0.89,
        },
        {
          source_entity: "Metformin",
          target_entity: "United HealthCare",
          relationship_type: "COVERED_BY",
          confidence: 0.95,
        },
        {
          source_entity: "Type 2 Diabetes",
          target_entity: "DCCT clinical trial",
          relationship_type: "STUDIED_IN",
          start_date: "1993",
          end_date: "1998",
          confidence: 0.92,
        },
        {
          source_entity: "patient",
          target_entity: "endocrinologist",
          relationship_type: "REFERRED_TO",
          confidence: 0.93,
        },
        {
          source_entity: "endocrinologist",
          target_entity: "Type 2 Diabetes",
          relationship_type: "TREATS",
          confidence: 0.96,
        },
        {
          source_entity: "patient",
          target_entity: "Mayo Clinic",
          relationship_type: "HOSPITALIZED_FOR",
          confidence: 0.88,
        },
        {
          source_entity: "patient",
          target_entity: "Continuous glucose monitor",
          relationship_type: "PRESCRIBED_FOR",
          confidence: 0.94,
        },
        {
          source_entity: "Mayo Clinic diabetes team",
          target_entity: "patient symptoms",
          relationship_type: "TREATED_BY",
          confidence: 0.91,
        },
      ],
    },
  },

  uidPrefixes: {
    Disease: DISEASE_UID_PREFIX,
    Drug: DRUG_UID_PREFIX,
    Treatment: TREATMENT_UID_PREFIX,
    Symptom: SYMPTOM_UID_PREFIX,
    Condition: CONDITION_UID_PREFIX,
    Medical_Device: MEDICAL_DEVICE_UID_PREFIX,
    Hospital: HOSPITAL_UID_PREFIX,
    Clinic: CLINIC_UID_PREFIX,
    Pharmacy: PHARMACY_UID_PREFIX,
    Insurance: INSURANCE_UID_PREFIX,
    Clinical_Trial: CLINICAL_TRIAL_UID_PREFIX,
  },

  validators: {
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
  },

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
    "TREATED_BY",
    "MANAGES",
  ],

  ui: {
    color: "#EF4444",
    icon: "🏥",
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
    card: medicalCardConfig,
  },
};
