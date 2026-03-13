/**
 * Biological Domain Card Configuration
 *
 * Pure configuration-based rendering for biological entities.
 */

import { createCardConfig } from "../../domain-system/card-config-builder";

/**
 * Biological domain card configuration
 */
export const biologicalCardConfig = createCardConfig()
  .useDefaultComponent()

  // Classification section
  .section({
    id: "classification",
    title: "Classification",
    order: 1,
    visible: (node) =>
      Boolean(
        node.properties?.scientificName || node.properties?.taxonomicRank
      ),
  })
  .fields([
    {
      property: "scientificName",
      label: "Scientific Name",
      type: "text",
      section: "classification",
      order: 1,
      sizes: ["standard", "detailed"],
    },
    {
      property: "taxonomicRank",
      label: "Rank",
      type: "text",
      section: "classification",
      order: 2,
      sizes: ["standard", "detailed"],
    },
    {
      property: "commonNames",
      label: "Common Names",
      type: "text",
      section: "classification",
      order: 3,
      sizes: ["standard", "detailed"],
    },
  ])

  // Conservation section
  .section({
    id: "conservation",
    title: "Conservation",
    order: 2,
    visible: (node) => Boolean(node.properties?.conservationStatus),
  })
  .fields([
    {
      property: "conservationStatus",
      label: "Status",
      type: "status",
      section: "conservation",
      order: 1,
    },
    {
      property: "population",
      label: "Population",
      type: "number",
      section: "conservation",
      order: 2,
      sizes: ["standard", "detailed"],
    },
  ])

  // Ecology section
  .section({
    id: "ecology",
    title: "Ecology",
    order: 3,
    visible: (node) =>
      Boolean(node.properties?.habitat || node.properties?.diet),
  })
  .fields([
    {
      property: "habitat",
      label: "Habitat",
      type: "text",
      section: "ecology",
      order: 1,
      sizes: ["standard", "detailed", "compact"],
    },
    {
      property: "diet",
      label: "Diet",
      type: "badge",
      section: "ecology",
      order: 2,
      sizes: ["standard", "detailed"],
    },
  ])

  // Characteristics section
  .section({
    id: "characteristics",
    title: "Characteristics",
    order: 4,
    visible: (node) =>
      Boolean(node.properties?.size || node.properties?.lifespan),
  })
  .fields([
    {
      property: "size",
      label: "Size",
      type: "text",
      section: "characteristics",
      order: 1,
      sizes: ["standard", "detailed"],
    },
    {
      property: "lifespan",
      label: "Lifespan",
      type: "text",
      section: "characteristics",
      order: 2,
      sizes: ["standard", "detailed"],
    },
  ])

  .build();
