import type { DomainConfig } from "../../domain-system";

import { astronomicalCardConfig } from "./card.config";
import {
  GalaxyEntitySchema,
  validateGalaxyUID,
  GALAXY_UID_PREFIX,
} from "./galaxy.schema";
import {
  PlanetEntitySchema,
  validatePlanetUID,
  PLANET_UID_PREFIX,
} from "./planet.schema";
import {
  SolarSystemEntitySchema,
  validateSolarSystemUID,
  SOLAR_SYSTEM_UID_PREFIX,
} from "./solar-system.schema";
import {
  StarEntitySchema,
  validateStarUID,
  STAR_UID_PREFIX,
} from "./star.schema";

export const astronomicalDomainConfig: DomainConfig = {
  name: "astronomical",
  displayName: "Astronomical",
  description: "Astronomical domain entities",
  category: "core",

  entities: {
    Planet: PlanetEntitySchema,
    Star: StarEntitySchema,
    Galaxy: GalaxyEntitySchema,
    Solar_System: SolarSystemEntitySchema,
  },

  enrichmentExamples: {
    Planet: {
      input_text:
        "Mars is the fourth planet from the Sun in our solar system. The planet has a diameter of 6,779 kilometers and an orbital period of 687 Earth days. Mars is known as the Red Planet due to iron oxide on its surface and has two small moons named Phobos and Deimos.",
      expected_output: {
        name: "Mars",
        position: "fourth",
        diameter: 6779,
        orbitalPeriod: 687,
        moons: ["Phobos", "Deimos"],
      },
    },
    Star: {
      input_text:
        "Sirius is the brightest star in the night sky, located in the constellation Canis Major. It is a binary star system with a distance of 8.6 light-years from Earth. The primary star, Sirius A, has a surface temperature of approximately 10,000 Kelvin.",
      expected_output: {
        name: "Sirius",
        constellation: "Canis Major",
        distance: 8.6,
        starType: "binary",
        temperature: 10000,
      },
    },
    Galaxy: {
      input_text:
        "The Andromeda Galaxy is a spiral galaxy located approximately 2.5 million light-years from Earth. It is the largest galaxy in the Local Group and contains about 1 trillion stars. The galaxy is on a collision course with the Milky Way.",
      expected_output: {
        galaxyType: "spiral",
        distance: 2500000,
        stars: 1000000000000,
        group: "Local Group",
        trajectory: "collision with Milky Way",
      },
    },
    Solar_System: {
      input_text:
        "The Solar System formed approximately 4.6 billion years ago from a giant molecular cloud. It is located in the Milky Way galaxy and contains eight planets, five dwarf planets, and numerous asteroids and comets.",
      expected_output: {
        age: 4600000000,
        location: "Milky Way",
        planets: 8,
        dwarfPlanets: 5,
        components: ["asteroids", "comets"],
      },
    },
  },

  relationshipExample: {
    input_text:
      "Earth orbits the Sun with an orbital period of 365 days, and is part of the Solar System. The Solar System is located within the Milky Way galaxy. Jupiter orbits the Sun and contains 95 known moons, including Ganymede and Europa. The Moon orbits Earth. Venus orbits the Sun between Mercury and Earth. The Andromeda Galaxy is part of the Local Group of galaxies. The Milky Way contains over 400 billion stars, including our Sun. Saturn contains the spectacular ring system and orbits the Sun. The Local Group is part of the Virgo Supercluster.",
    expected_output: {
      relationships: [
        {
          source_entity: "Earth",
          target_entity: "Sun",
          relationship_type: "ORBITS",
          confidence: 0.99,
        },
        {
          source_entity: "Earth",
          target_entity: "Solar System",
          relationship_type: "PART_OF",
          confidence: 0.98,
        },
        {
          source_entity: "Solar System",
          target_entity: "Milky Way",
          relationship_type: "PART_OF",
          confidence: 0.97,
        },
        {
          source_entity: "Jupiter",
          target_entity: "Sun",
          relationship_type: "ORBITS",
          confidence: 0.99,
        },
        {
          source_entity: "Jupiter",
          target_entity: "Ganymede",
          relationship_type: "CONTAINS",
          confidence: 0.96,
        },
        {
          source_entity: "Jupiter",
          target_entity: "Europa",
          relationship_type: "CONTAINS",
          confidence: 0.96,
        },
        {
          source_entity: "Moon",
          target_entity: "Earth",
          relationship_type: "ORBITS",
          confidence: 0.99,
        },
        {
          source_entity: "Venus",
          target_entity: "Sun",
          relationship_type: "ORBITS",
          confidence: 0.99,
        },
        {
          source_entity: "Andromeda Galaxy",
          target_entity: "Local Group",
          relationship_type: "PART_OF",
          confidence: 0.94,
        },
        {
          source_entity: "Saturn",
          target_entity: "Sun",
          relationship_type: "ORBITS",
          confidence: 0.99,
        },
        {
          source_entity: "Local Group",
          target_entity: "Virgo Supercluster",
          relationship_type: "PART_OF",
          confidence: 0.91,
        },
      ],
    },
  },

  uidPrefixes: {
    Planet: PLANET_UID_PREFIX,
    Star: STAR_UID_PREFIX,
    Galaxy: GALAXY_UID_PREFIX,
    Solar_System: SOLAR_SYSTEM_UID_PREFIX,
  },

  validators: {
    [PLANET_UID_PREFIX]: validatePlanetUID,
    [STAR_UID_PREFIX]: validateStarUID,
    [GALAXY_UID_PREFIX]: validateGalaxyUID,
    [SOLAR_SYSTEM_UID_PREFIX]: validateSolarSystemUID,
  },

  relationships: ["ORBITS", "PART_OF", "CONTAINS"],

  ui: {
    color: "#A855F7",
    icon: "🌌",
    entityIcons: {
      Planet: "🪐",
      Star: "⭐",
      Galaxy: "🌌",
      Asteroid: "☄️",
      Moon: "🌙",
      Constellation: "✨",
    },
    card: astronomicalCardConfig,
  },
};
