import type { DomainConfig } from "../../domain-system";

import {
  AnimalEntitySchema,
  validateAnimalUID,
  ANIMAL_UID_PREFIX,
} from "./animal.schema";
import { biologicalCardConfig } from "./card.config";
import {
  CropEntitySchema,
  validateCropUID,
  CROP_UID_PREFIX,
} from "./crop.schema";
import {
  EcosystemEntitySchema,
  validateEcosystemUID,
  ECOSYSTEM_UID_PREFIX,
} from "./ecosystem.schema";
import {
  FarmEntitySchema,
  validateFarmUID,
  FARM_UID_PREFIX,
} from "./farm.schema";
import {
  FungiEntitySchema,
  validateFungiUID,
  FUNGI_UID_PREFIX,
} from "./fungi.schema";
import {
  InsectEntitySchema,
  validateInsectUID,
  INSECT_UID_PREFIX,
} from "./insect.schema";
import {
  PlantEntitySchema,
  validatePlantUID,
  PLANT_UID_PREFIX,
} from "./plant.schema";
import {
  SoilEntitySchema,
  validateSoilUID,
  SOIL_UID_PREFIX,
} from "./soil.schema";
import {
  SpeciesEntitySchema,
  validateSpeciesUID,
  SPECIES_UID_PREFIX,
} from "./species.schema";

export const biologicalDomainConfig: DomainConfig = {
  name: "biological",
  displayName: "Biological",
  description: "Biological domain entities",
  category: "core",

  entities: {
    Animal: AnimalEntitySchema,
    Plant: PlantEntitySchema,
    Fungi: FungiEntitySchema,
    Species: SpeciesEntitySchema,
    Insect: InsectEntitySchema,
    Ecosystem: EcosystemEntitySchema,
    Crop: CropEntitySchema,
    Farm: FarmEntitySchema,
    Soil: SoilEntitySchema,
  },

  enrichmentExamples: {
    Animal: {
      input_text:
        "The African elephant is the largest land mammal, native to the African continent. It has a body weight of up to 7,000 kilograms and is known for its intelligence and complex social behavior. The species is classified as vulnerable on the IUCN Red List.",
      expected_output: {
        scientificName: "Loxodonta",
        habitat: "African continent",
        weight: 7000,
        characteristics: ["intelligence", "complex social behavior"],
        conservationStatus: "vulnerable",
      },
    },
    Plant: {
      input_text:
        "The giant sequoia is the largest tree by volume, found in Sierra Nevada, California. These evergreen conifers can grow to heights of over 80 meters and live for thousands of years. The species is classified as endangered due to habitat loss.",
      expected_output: {
        commonName: "giant sequoia",
        location: "Sierra Nevada, California",
        height: 80,
        plantType: "evergreen conifer",
        conservationStatus: "endangered",
      },
    },
  },

  relationshipExample: {
    input_text:
      "Lions prey on zebras in the African savanna ecosystem. Bees pollinate flowering plants in meadows through mutualistic relationships. Bees are symbiotic with flowering clover plants. Corn grows in rich agricultural soil amended with nitrogen-fixing bacteria. Cattle inhabit grasslands and eat grass. Fungi decompose dead plant matter in soil. Wolves inhabit forests and prey on deer. Crops are cultivated on farms by human farmers. The Amazon rainforest ecosystem contains jaguars, anacondas, and countless plant species. Earthworms inhabit soil and process organic matter.",
    expected_output: {
      relationships: [
        {
          source_entity: "Lion",
          target_entity: "Zebra",
          relationship_type: "PREYS_ON",
          confidence: 0.96,
        },
        {
          source_entity: "flowering plant",
          target_entity: "Bee",
          relationship_type: "POLLINATED_BY",
          confidence: 0.94,
        },
        {
          source_entity: "Bee",
          target_entity: "Clover plant",
          relationship_type: "SYMBIOTIC_WITH",
          confidence: 0.93,
        },
        {
          source_entity: "Corn",
          target_entity: "agricultural soil",
          relationship_type: "GROWS_IN",
          confidence: 0.95,
        },
        {
          source_entity: "Cattle",
          target_entity: "grassland ecosystem",
          relationship_type: "INHABITS",
          confidence: 0.92,
        },
        {
          source_entity: "Fungi",
          target_entity: "soil ecosystem",
          relationship_type: "INHABITS",
          confidence: 0.91,
        },
        {
          source_entity: "Wolf",
          target_entity: "forest",
          relationship_type: "INHABITS",
          confidence: 0.9,
        },
        {
          source_entity: "Crop",
          target_entity: "Farm",
          relationship_type: "CULTIVATED_ON",
          confidence: 0.97,
        },
        {
          source_entity: "Amazon rainforest",
          target_entity: "Jaguar",
          relationship_type: "CONTAINS",
          confidence: 0.93,
        },
        {
          source_entity: "Earthworm",
          target_entity: "soil",
          relationship_type: "INHABITS",
          confidence: 0.89,
        },
        {
          source_entity: "Herb",
          target_entity: "Insect",
          relationship_type: "EATS",
          confidence: 0.88,
        },
      ],
    },
  },

  uidPrefixes: {
    Animal: ANIMAL_UID_PREFIX,
    Plant: PLANT_UID_PREFIX,
    Fungi: FUNGI_UID_PREFIX,
    Species: SPECIES_UID_PREFIX,
    Insect: INSECT_UID_PREFIX,
    Ecosystem: ECOSYSTEM_UID_PREFIX,
    Crop: CROP_UID_PREFIX,
    Farm: FARM_UID_PREFIX,
    Soil: SOIL_UID_PREFIX,
  },

  validators: {
    [ANIMAL_UID_PREFIX]: validateAnimalUID,
    [PLANT_UID_PREFIX]: validatePlantUID,
    [FUNGI_UID_PREFIX]: validateFungiUID,
    [SPECIES_UID_PREFIX]: validateSpeciesUID,
    [INSECT_UID_PREFIX]: validateInsectUID,
    [ECOSYSTEM_UID_PREFIX]: validateEcosystemUID,
    [CROP_UID_PREFIX]: validateCropUID,
    [FARM_UID_PREFIX]: validateFarmUID,
    [SOIL_UID_PREFIX]: validateSoilUID,
  },

  relationships: [
    "EATS",
    "PREYS_ON",
    "SYMBIOTIC_WITH",
    "POLLINATED_BY",
    "INHABITS",
    "CULTIVATED_ON",
    "GROWS_IN",
  ],

  ui: {
    color: "#10B981",
    icon: "🧬",
    entityIcons: {
      Animal: "🐾",
      Plant: "🌱",
      Fungi: "🍄",
      Species: "🧬",
      Insect: "🐛",
      Ecosystem: "🌿",
      Crop: "🌾",
      Farm: "🚜",
      Soil: "🟫",
    },
    card: biologicalCardConfig,
  },
};
