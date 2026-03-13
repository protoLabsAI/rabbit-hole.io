import type { DomainConfig } from "../../domain-system";

import { geographicCardConfig } from "./card.config";
import {
  CityEntitySchema,
  validateCityUID,
  CITY_UID_PREFIX,
} from "./city.schema";
import {
  ContinentEntitySchema,
  validateContinentUID,
  CONTINENT_UID_PREFIX,
} from "./continent.schema";
import {
  CountryEntitySchema,
  validateCountryUID,
  COUNTRY_UID_PREFIX,
} from "./country.schema";
import {
  LocationEntitySchema,
  validateLocationUID,
  LOCATION_UID_PREFIX,
} from "./location.schema";
import {
  RegionEntitySchema,
  validateRegionUID,
  REGION_UID_PREFIX,
} from "./region.schema";

export const geographicDomainConfig: DomainConfig = {
  name: "geographic",
  displayName: "Geographic",
  description: "Geographic domain entities",
  category: "core",

  entities: {
    Country: CountryEntitySchema,
    City: CityEntitySchema,
    Region: RegionEntitySchema,
    Continent: ContinentEntitySchema,
    Location: LocationEntitySchema,
  },

  enrichmentExamples: {
    Country: {
      input_text:
        "Germany has a population of 83 million and covers an area of 357,000 square kilometers. The capital is Berlin, and the country uses the Euro as its currency. Germany has a federal parliamentary system of government.",
      expected_output: {
        population: 83000000,
        area: 357000,
        capital: "Berlin",
        currency: "Euro",
        government: "federal parliamentary",
      },
    },
    City: {
      input_text:
        "Paris is the capital and largest city of France with a population of 2.1 million in the city proper. The city is located in the Île-de-France region and is situated on the Seine River.",
      expected_output: {
        country: "France",
        population: 2100000,
        region: "Île-de-France",
        cityType: "capital",
      },
    },
    Region: {
      input_text:
        "Silicon Valley is a region in the southern San Francisco Bay Area of California. It is known as a global center for technology and innovation, home to many major tech companies and startups.",
      expected_output: {
        location: "San Francisco Bay Area, California",
        knownFor: "technology and innovation",
        significance: "global center",
        industries: ["technology"],
      },
    },
    Continent: {
      input_text:
        "Africa is the second-largest continent covering 30.37 million square kilometers with a population of approximately 1.4 billion people. It contains 54 countries and is bordered by the Mediterranean Sea to the north.",
      expected_output: {
        area: 30370000,
        population: 1400000000,
        countries: 54,
        borders: ["Mediterranean Sea"],
      },
    },
    Location: {
      input_text:
        "The Grand Canyon is located in Arizona, United States at coordinates 36.1069° N, 112.1129° W. It is a steep-sided canyon carved by the Colorado River, stretching 277 miles long.",
      expected_output: {
        country: "United States",
        state: "Arizona",
        latitude: 36.1069,
        longitude: -112.1129,
        features: ["canyon", "carved by Colorado River"],
        length: 277,
      },
    },
  },

  relationshipExample: {
    input_text:
      "Paris is the capital of France and is located in the Île-de-France region. France borders Spain, Italy, Germany, Belgium, and Switzerland. The Île-de-France region contains Paris, Versailles, and surrounding suburban areas. Spain is located on the Iberian Peninsula which borders Portugal. Europe is the continent that contains France, Spain, Germany, and Italy. The Mediterranean region contains countries that border the Mediterranean Sea including Spain, Italy, and Greece.",
    expected_output: {
      relationships: [
        {
          source_entity: "Paris",
          target_entity: "France",
          relationship_type: "CAPITAL_OF",
          confidence: 0.99,
        },
        {
          source_entity: "Paris",
          target_entity: "Île-de-France",
          relationship_type: "LOCATED_IN",
          confidence: 0.96,
        },
        {
          source_entity: "France",
          target_entity: "Spain",
          relationship_type: "BORDERS",
          confidence: 0.95,
        },
        {
          source_entity: "France",
          target_entity: "Germany",
          relationship_type: "BORDERS",
          confidence: 0.94,
        },
        {
          source_entity: "Île-de-France",
          target_entity: "Versailles",
          relationship_type: "CONTAINS",
          confidence: 0.93,
        },
        {
          source_entity: "Spain",
          target_entity: "Iberian Peninsula",
          relationship_type: "LOCATED_IN",
          confidence: 0.91,
        },
        {
          source_entity: "Iberian Peninsula",
          target_entity: "Portugal",
          relationship_type: "BORDERS",
          confidence: 0.92,
        },
        {
          source_entity: "Europe",
          target_entity: "France",
          relationship_type: "CONTAINS",
          confidence: 0.98,
        },
        {
          source_entity: "Mediterranean region",
          target_entity: "Italy",
          relationship_type: "CONTAINS",
          confidence: 0.89,
        },
        {
          source_entity: "Italy",
          target_entity: "Mediterranean Sea",
          relationship_type: "BORDERS",
          confidence: 0.94,
        },
      ],
    },
  },

  uidPrefixes: {
    Country: COUNTRY_UID_PREFIX,
    City: CITY_UID_PREFIX,
    Region: REGION_UID_PREFIX,
    Continent: CONTINENT_UID_PREFIX,
    Location: LOCATION_UID_PREFIX,
  },

  validators: {
    [COUNTRY_UID_PREFIX]: validateCountryUID,
    [CITY_UID_PREFIX]: validateCityUID,
    [REGION_UID_PREFIX]: validateRegionUID,
    [CONTINENT_UID_PREFIX]: validateContinentUID,
    [LOCATION_UID_PREFIX]: validateLocationUID,
  },

  relationships: ["LOCATED_IN", "BORDERS", "CAPITAL_OF", "CONTAINS"],

  ui: {
    color: "#14B8A6",
    icon: "🌍",
    entityIcons: {
      Country: "🏴",
      City: "🏙️",
      Region: "📍",
      Continent: "🌎",
      Location: "📌",
    },
    card: geographicCardConfig,
  },
};
