/**
 * Automotive Domain Card Configuration
 *
 * Configuration-based card rendering for automotive entities.
 */

import { createCardConfig } from "@proto/types";

/**
 * Automotive card configuration
 */
export const automotiveCardConfig = createCardConfig()
  .useDefaultComponent()

  // Vehicle Information section
  .section({
    id: "vehicle-info",
    title: "Vehicle Information",
    order: 1,
  })
  .fields([
    {
      property: "manufacturer",
      label: "Manufacturer",
      type: "text",
      section: "vehicle-info",
      order: 1,
      sizes: ["standard", "detailed"],
    },
    {
      property: "year",
      label: "Year",
      type: "number",
      section: "vehicle-info",
      order: 2,
    },
    {
      property: "body_type",
      label: "Body Type",
      type: "badge",
      section: "vehicle-info",
      order: 3,
      formatter: (value) => String(value).replace(/_/g, " ").toUpperCase(),
    },
  ])

  // Performance section
  .section({
    id: "performance",
    title: "Performance",
    order: 2,
  })
  .fields([
    {
      property: "engine_type",
      label: "Engine",
      type: "badge",
      section: "performance",
      order: 1,
      formatter: (value) => String(value).replace(/_/g, " ").toUpperCase(),
    },
    {
      property: "horsepower",
      label: "Horsepower",
      type: "number",
      section: "performance",
      order: 2,
      formatter: (value) => `${value} HP`,
    },
    {
      property: "mpg_city",
      label: "MPG (City)",
      type: "number",
      section: "performance",
      order: 3,
      sizes: ["standard", "detailed"],
    },
    {
      property: "mpg_highway",
      label: "MPG (Highway)",
      type: "number",
      section: "performance",
      order: 4,
      sizes: ["standard", "detailed"],
    },
  ])

  // Pricing & Safety section
  .section({
    id: "pricing-safety",
    title: "Pricing & Safety",
    order: 3,
  })
  .fields([
    {
      property: "msrp",
      label: "MSRP",
      type: "number",
      section: "pricing-safety",
      order: 1,
      formatter: (value) => `$${Number(value).toLocaleString()}`,
      sizes: ["standard", "detailed"],
    },
    {
      property: "safety_rating",
      label: "Safety Rating",
      type: "badge",
      section: "pricing-safety",
      order: 2,
      formatter: (value) => `${value}/5 ⭐`,
    },
  ])

  .build();
