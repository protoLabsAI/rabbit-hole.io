import type { DomainConfig } from "../../domain-system";

import {
  AirportEntitySchema,
  validateAirportUID,
  AIRPORT_UID_PREFIX,
} from "./airport.schema";
import {
  BridgeEntitySchema,
  validateBridgeUID,
  BRIDGE_UID_PREFIX,
} from "./bridge.schema";
import {
  BuildingEntitySchema,
  validateBuildingUID,
  BUILDING_UID_PREFIX,
} from "./building.schema";
import { infrastructureCardConfig } from "./card.config";
import {
  PipelineEntitySchema,
  validatePipelineUID,
  PIPELINE_UID_PREFIX,
} from "./pipeline.schema";
import {
  PortEntitySchema,
  validatePortUID,
  PORT_UID_PREFIX,
} from "./port.schema";
import {
  RoadEntitySchema,
  validateRoadUID,
  ROAD_UID_PREFIX,
} from "./road.schema";
import {
  UtilityEntitySchema,
  validateUtilityUID,
  UTILITY_UID_PREFIX,
} from "./utility.schema";

export const infrastructureDomainConfig: DomainConfig = {
  name: "infrastructure",
  displayName: "Infrastructure",
  description: "Infrastructure domain entities",
  category: "core",

  entities: {
    Building: BuildingEntitySchema,
    Bridge: BridgeEntitySchema,
    Road: RoadEntitySchema,
    Airport: AirportEntitySchema,
    Port: PortEntitySchema,
    Utility: UtilityEntitySchema,
    Pipeline: PipelineEntitySchema,
  },

  enrichmentExamples: {
    Building: {
      input_text:
        "The Empire State Building is a 102-story Art Deco skyscraper located in New York City. It was completed in 1931 and has a height of 380 meters to its roof. The building was the world's tallest building until 1972.",
      expected_output: {
        name: "Empire State Building",
        stories: 102,
        location: "New York City",
        completed: "1931",
        height: 380,
      },
    },
    Bridge: {
      input_text:
        "The Golden Gate Bridge is a suspension bridge spanning the Golden Gate strait between San Francisco and Marin County, California. The bridge was completed in 1937 and has a main span length of 1,280 meters. It is painted in a distinctive International Orange color.",
      expected_output: {
        name: "Golden Gate Bridge",
        bridgeType: "suspension",
        location: "San Francisco Bay",
        completed: "1937",
        spanLength: 1280,
      },
    },
    Road: {
      input_text:
        "Interstate 95 (I-95) is the main north-south interstate highway on the East Coast of the United States, spanning 1,920 miles from Florida to Maine. Construction began in the 1950s as part of the Interstate Highway System.",
      expected_output: {
        roadName: "Interstate 95",
        length: 1920,
        direction: "north-south",
        location: "East Coast United States",
        constructionStart: "1950s",
      },
    },
    Airport: {
      input_text:
        "Hartsfield-Jackson Atlanta International Airport is the world's busiest airport by passenger traffic, serving over 107 million passengers in 2018. The airport opened in 1926 and has seven runways.",
      expected_output: {
        location: "Atlanta",
        opened: "1926",
        runways: 7,
        passengerTraffic: 107000000,
        designation: "busiest airport",
      },
    },
    Port: {
      input_text:
        "The Port of Shanghai is the world's busiest container port, handling over 43 million TEU (twenty-foot equivalent units) annually. Located on the Yangtze River Delta, it serves as a major hub for international trade.",
      expected_output: {
        location: "Shanghai, Yangtze River Delta",
        portType: "container port",
        capacity: "43 million TEU",
        significance: "major hub for international trade",
      },
    },
    Utility: {
      input_text:
        "Pacific Gas and Electric (PG&E) is an electric utility company serving Northern and Central California with approximately 16 million customers. Founded in 1905, it operates a grid of over 106,000 circuit miles.",
      expected_output: {
        utilityType: "electric",
        serviceArea: "Northern and Central California",
        customers: 16000000,
        founded: "1905",
        gridSize: "106,000 circuit miles",
      },
    },
    Pipeline: {
      input_text:
        "The Trans-Alaska Pipeline System transports crude oil 800 miles from Prudhoe Bay to Valdez, Alaska. Completed in 1977, it has a diameter of 48 inches and can carry up to 2.1 million barrels per day.",
      expected_output: {
        pipelineName: "Trans-Alaska Pipeline System",
        length: 800,
        product: "crude oil",
        completed: "1977",
        diameter: 48,
        capacity: "2.1 million barrels per day",
      },
    },
  },

  relationshipExample: {
    input_text:
      "The Golden Gate Bridge connects San Francisco to Marin County and is built in 1937. Interstate 95 connects Miami to Maine and is maintained by state departments of transportation. Hartsfield-Jackson Airport serves Atlanta with over 100 million annual passengers. The Port of Shanghai serves maritime trade for East Asia. Pacific Gas and Electric maintains the power utilities serving Northern California. The Trans-Siberian Railway connects Moscow to Vladivostok and was built in 1916. The Panama Canal connects the Atlantic and Pacific Oceans. New York's subway system serves the city's transportation needs and is maintained by the MTA.",
    expected_output: {
      relationships: [
        {
          source_entity: "Golden Gate Bridge",
          target_entity: "San Francisco",
          relationship_type: "CONNECTS",
          confidence: 0.98,
        },
        {
          source_entity: "Golden Gate Bridge",
          target_entity: "Marin County",
          relationship_type: "CONNECTS",
          confidence: 0.97,
        },
        {
          source_entity: "Golden Gate Bridge",
          target_entity: "1937",
          relationship_type: "BUILT_IN",
          confidence: 0.96,
        },
        {
          source_entity: "Interstate 95",
          target_entity: "Miami",
          relationship_type: "CONNECTS",
          confidence: 0.95,
        },
        {
          source_entity: "Hartsfield-Jackson Airport",
          target_entity: "Atlanta",
          relationship_type: "SERVES",
          confidence: 0.97,
        },
        {
          source_entity: "Port of Shanghai",
          target_entity: "East Asia maritime trade",
          relationship_type: "SERVES",
          confidence: 0.92,
        },
        {
          source_entity: "Pacific Gas and Electric",
          target_entity: "Northern California power utilities",
          relationship_type: "MAINTAINED_BY",
          confidence: 0.94,
        },
        {
          source_entity: "Trans-Siberian Railway",
          target_entity: "Moscow",
          relationship_type: "CONNECTS",
          confidence: 0.93,
        },
        {
          source_entity: "Panama Canal",
          target_entity: "Atlantic Ocean",
          relationship_type: "CONNECTS",
          confidence: 0.95,
        },
        {
          source_entity: "NYC Subway System",
          target_entity: "Metropolitan Transportation Authority",
          relationship_type: "MAINTAINED_BY",
          confidence: 0.96,
        },
      ],
    },
  },

  uidPrefixes: {
    Building: BUILDING_UID_PREFIX,
    Bridge: BRIDGE_UID_PREFIX,
    Road: ROAD_UID_PREFIX,
    Airport: AIRPORT_UID_PREFIX,
    Port: PORT_UID_PREFIX,
    Utility: UTILITY_UID_PREFIX,
    Pipeline: PIPELINE_UID_PREFIX,
  },

  validators: {
    [BUILDING_UID_PREFIX]: validateBuildingUID,
    [BRIDGE_UID_PREFIX]: validateBridgeUID,
    [ROAD_UID_PREFIX]: validateRoadUID,
    [AIRPORT_UID_PREFIX]: validateAirportUID,
    [PORT_UID_PREFIX]: validatePortUID,
    [UTILITY_UID_PREFIX]: validateUtilityUID,
    [PIPELINE_UID_PREFIX]: validatePipelineUID,
  },

  relationships: ["CONNECTS", "SERVES", "BUILT_IN", "MAINTAINED_BY"],

  ui: {
    color: "#6B7280",
    icon: "🏗️",
    entityIcons: {
      Building: "🏢",
      Bridge: "🌉",
      Road: "🛣️",
      Airport: "✈️",
      Port: "⚓",
      Utility: "⚡",
      Pipeline: "🔧",
    },
    card: infrastructureCardConfig,
  },
};
