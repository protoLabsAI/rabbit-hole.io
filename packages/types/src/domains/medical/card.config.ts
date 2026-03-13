/**
 * Medical Domain Card Configuration
 *
 * Pure configuration-based rendering for medical entities.
 */

import { createCardConfig } from "../../domain-system/card-config-builder";

/**
 * Medical domain card configuration
 */
export const medicalCardConfig = createCardConfig()
  .useDefaultComponent()

  // Clinical Information section
  .section({
    id: "clinical",
    title: "Clinical Information",
    order: 1,
    visible: (node) =>
      Boolean(
        node.properties?.disease_type ||
          node.properties?.drug_type ||
          node.properties?.hospital_type ||
          node.properties?.symptoms ||
          node.properties?.active_ingredients
      ),
  })
  .fields([
    {
      property: "disease_type",
      label: "Type",
      type: "badge",
      section: "clinical",
      order: 1,
      visible: (node) => node.type === "Disease",
      sizes: ["compact", "standard", "detailed"],
    },
    {
      property: "drug_type",
      label: "Type",
      type: "badge",
      section: "clinical",
      order: 1,
      visible: (node) => node.type === "Drug",
      sizes: ["compact", "standard", "detailed"],
    },
    {
      property: "hospital_type",
      label: "Type",
      type: "badge",
      section: "clinical",
      order: 1,
      visible: (node) => node.type === "Hospital",
      sizes: ["compact", "standard", "detailed"],
    },
    {
      property: "icd_code",
      label: "ICD Code",
      type: "text",
      section: "clinical",
      order: 2,
      visible: (node) => Boolean(node.properties?.icd_code),
      sizes: ["standard", "detailed"],
    },
    {
      property: "symptoms",
      label: "Symptoms",
      type: "text",
      section: "clinical",
      order: 3,
      visible: (node) => Boolean(node.properties?.symptoms),
      sizes: ["standard", "detailed"],
      formatter: (value) =>
        Array.isArray(value) ? value.slice(0, 3).join(", ") : String(value),
    },
    {
      property: "active_ingredients",
      label: "Active Ingredients",
      type: "text",
      section: "clinical",
      order: 4,
      visible: (node) => Boolean(node.properties?.active_ingredients),
      sizes: ["standard", "detailed"],
      formatter: (value) =>
        Array.isArray(value) ? value.slice(0, 3).join(", ") : String(value),
    },
    {
      property: "side_effects",
      label: "Side Effects",
      type: "text",
      section: "clinical",
      order: 5,
      visible: (node) => Boolean(node.properties?.side_effects),
      sizes: ["detailed"],
      formatter: (value) =>
        Array.isArray(value) ? value.slice(0, 3).join(", ") : String(value),
    },
  ])

  // Facility Information section
  .section({
    id: "facility",
    title: "Facility Information",
    order: 2,
    visible: (node) =>
      Boolean(
        node.properties?.bed_count ||
          node.properties?.specialties ||
          node.properties?.trauma_level
      ),
  })
  .fields([
    {
      property: "bed_count",
      label: "Beds",
      type: "number",
      section: "facility",
      order: 1,
      visible: (node) => Boolean(node.properties?.bed_count),
      sizes: ["standard", "detailed"],
    },
    {
      property: "specialties",
      label: "Specialties",
      type: "text",
      section: "facility",
      order: 2,
      visible: (node) => Boolean(node.properties?.specialties),
      sizes: ["standard", "detailed"],
      formatter: (value) =>
        Array.isArray(value) ? value.slice(0, 3).join(", ") : String(value),
    },
    {
      property: "trauma_level",
      label: "Trauma Level",
      type: "badge",
      section: "facility",
      order: 3,
      visible: (node) => Boolean(node.properties?.trauma_level),
      sizes: ["detailed"],
    },
    {
      property: "safety_rating",
      label: "Safety Rating",
      type: "badge",
      section: "facility",
      order: 4,
      visible: (node) => Boolean(node.properties?.safety_rating),
      sizes: ["detailed"],
    },
  ])

  // Safety & Status section
  .section({
    id: "safety",
    title: "Safety & Status",
    order: 3,
    visible: (node) =>
      Boolean(
        node.properties?.prognosis ||
          node.properties?.black_box_warning ||
          node.properties?.contagious ||
          node.properties?.approved_date
      ),
  })
  .fields([
    {
      property: "prognosis",
      label: "Prognosis",
      type: "status",
      section: "safety",
      order: 1,
      visible: (node) => Boolean(node.properties?.prognosis),
      sizes: ["standard", "detailed"],
    },
    {
      property: "black_box_warning",
      label: "Black Box Warning",
      type: "status",
      section: "safety",
      order: 2,
      visible: (node) => node.properties?.black_box_warning === true,
      sizes: ["standard", "detailed"],
      formatter: () => "Warning",
    },
    {
      property: "contagious",
      label: "Contagious",
      type: "badge",
      section: "safety",
      order: 3,
      visible: (node) => node.properties?.contagious === true,
      sizes: ["standard", "detailed"],
      formatter: () => "Contagious",
    },
    {
      property: "approved_date",
      label: "Approved",
      type: "text",
      section: "safety",
      order: 4,
      visible: (node) => Boolean(node.properties?.approved_date),
      sizes: ["detailed"],
    },
  ])

  .build();
