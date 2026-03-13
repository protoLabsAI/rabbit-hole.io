/**
 * Astronomical Domain Card Configuration
 *
 * Pure configuration-based rendering for astronomical entities.
 */

import { createCardConfig } from "../../domain-system/card-config-builder";

/**
 * Astronomical domain card configuration
 */
export const astronomicalCardConfig = createCardConfig()
  .useDefaultComponent()

  // Classification section
  .section({
    id: "classification",
    title: "Classification",
    order: 1,
    visible: (node) =>
      Boolean(
        node.properties?.type ||
          node.properties?.spectral_type ||
          node.properties?.category
      ),
  })
  .fields([
    {
      property: "type",
      label: "Type",
      type: "badge",
      section: "classification",
      order: 1,
      visible: (node) => Boolean(node.properties?.type),
      sizes: ["compact", "standard", "detailed"],
    },
    {
      property: "spectral_type",
      label: "Spectral Class",
      type: "badge",
      section: "classification",
      order: 2,
      visible: (node) => Boolean(node.properties?.spectral_type),
      sizes: ["standard", "detailed"],
    },
    {
      property: "category",
      label: "Category",
      type: "badge",
      section: "classification",
      order: 3,
      visible: (node) => Boolean(node.properties?.category),
      sizes: ["standard", "detailed"],
    },
  ])

  // Physical Properties section
  .section({
    id: "physical",
    title: "Physical Properties",
    order: 2,
    visible: (node) =>
      Boolean(
        node.properties?.mass ||
          node.properties?.radius ||
          node.properties?.temperature
      ),
  })
  .fields([
    {
      property: "mass",
      label: "Mass",
      type: "text",
      section: "physical",
      order: 1,
      visible: (node) => Boolean(node.properties?.mass),
      sizes: ["standard", "detailed"],
    },
    {
      property: "radius",
      label: "Radius",
      type: "text",
      section: "physical",
      order: 2,
      visible: (node) => Boolean(node.properties?.radius),
      sizes: ["standard", "detailed"],
    },
    {
      property: "temperature",
      label: "Temperature (K)",
      type: "number",
      section: "physical",
      order: 3,
      visible: (node) => Boolean(node.properties?.temperature),
      sizes: ["detailed"],
    },
    {
      property: "luminosity",
      label: "Luminosity",
      type: "text",
      section: "physical",
      order: 4,
      visible: (node) => Boolean(node.properties?.luminosity),
      sizes: ["detailed"],
    },
  ])

  // Orbital Properties section
  .section({
    id: "orbital",
    title: "Orbital Properties",
    order: 3,
    visible: (node) =>
      Boolean(
        node.properties?.orbital_period ||
          node.properties?.distance ||
          node.properties?.rotation_period
      ),
  })
  .fields([
    {
      property: "orbital_period",
      label: "Orbital Period",
      type: "text",
      section: "orbital",
      order: 1,
      visible: (node) => Boolean(node.properties?.orbital_period),
      sizes: ["standard", "detailed"],
    },
    {
      property: "distance",
      label: "Distance",
      type: "text",
      section: "orbital",
      order: 2,
      visible: (node) => Boolean(node.properties?.distance),
      sizes: ["standard", "detailed"],
    },
    {
      property: "rotation_period",
      label: "Rotation Period",
      type: "text",
      section: "orbital",
      order: 3,
      visible: (node) => Boolean(node.properties?.rotation_period),
      sizes: ["detailed"],
    },
  ])

  .build();
