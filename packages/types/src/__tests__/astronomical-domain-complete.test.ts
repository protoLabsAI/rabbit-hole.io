/**
 * Astronomical Domain - Complete Test Suite
 *
 * Tests all astronomical entity types and domain functionality.
 */

import { describe, it, expect } from "vitest";

import {
  ASTRONOMICAL_ENTITY_SCHEMAS,
  ASTRONOMICAL_UID_VALIDATORS,
  ASTRONOMICAL_ENTITY_TYPES,
  validateAstronomicalUID,
  getAstronomicalEntityType,
  isAstronomicalUID,
  ASTRONOMICAL_DOMAIN_INFO,
} from "../domains/astronomical";
import { validateRabbitHoleBundle } from "../validation-schemas-modular";

describe("Astronomical Domain - Complete", () => {
  describe("Entity Schemas", () => {
    it("should validate planet entities", () => {
      const planetData = {
        uid: "planet:earth",
        type: "Planet",
        name: "Earth",
        properties: {
          planetType: "terrestrial",
          mass: 1.0,
          diameter: 12742,
          orbitalPeriod: 365.25,
          rotationPeriod: 1.0,
          distanceFromStar: 1.0,
          surfaceTemperature: 288,
          atmosphere: ["nitrogen", "oxygen"],
          hasRings: false,
          moonCount: 1,
          surfaceGravity: 1.0,
          magneticField: true,
          habitabilityIndex: 1.0,
          hasWater: true,
          stellarSystem: "Solar System",
        },
      };

      const result = ASTRONOMICAL_ENTITY_SCHEMAS.Planet.safeParse(planetData);
      expect(result.success).toBe(true);
    });

    it("should validate star entities", () => {
      const starData = {
        uid: "star:sun",
        type: "Star",
        name: "Sun",
        properties: {
          starType: "main_sequence",
          spectralClass: "G",
          mass: 1.0,
          radius: 1.0,
          luminosity: 1.0,
          surfaceTemperature: 5778,
          age: 4.6e9,
          metallicity: 0.0,
          magnitude: -26.74,
          absoluteMagnitude: 4.83,
          hasplanets: true,
          planetCount: 8,
          binarySystem: false,
          companionStars: 0,
        },
      };

      const result = ASTRONOMICAL_ENTITY_SCHEMAS.Star.safeParse(starData);
      expect(result.success).toBe(true);
    });

    it("should validate galaxy entities", () => {
      const galaxyData = {
        uid: "galaxy:milky_way",
        type: "Galaxy",
        name: "Milky Way",
        properties: {
          galaxyType: "spiral",
          morphology: "SBbc",
          diameter: 100000,
          mass: 1.5e12,
          starCount: 4e11,
          distance: 0,
          centralBlackHole: true,
          blackHoleMass: 4.1e6,
          hasActiveNucleus: false,
          localGroup: true,
          companionGalaxies: 2,
        },
      };

      const result = ASTRONOMICAL_ENTITY_SCHEMAS.Galaxy.safeParse(galaxyData);
      expect(result.success).toBe(true);
    });

    it("should validate solar system entities", () => {
      const solarSystemData = {
        uid: "solar_system:sol",
        type: "Solar_System",
        name: "Solar System",
        properties: {
          systemType: "single_star",
          centralStar: "Sun",
          planetCount: 8,
          terrestrialPlanets: 4,
          gasGiants: 4,
          dwarfPlanets: 5,
          asteroidBelt: true,
          age: 4.6e9,
          metallicity: 0.0,
          habitableZone: {
            innerRadius: 0.95,
            outerRadius: 1.37,
          },
          hasHabitablePlanets: true,
          habitablePlanetCount: 1,
          systemRadius: 100,
          totalMass: 1.0,
        },
      };

      const result =
        ASTRONOMICAL_ENTITY_SCHEMAS.Solar_System.safeParse(solarSystemData);
      expect(result.success).toBe(true);
    });
  });

  describe("UID Validation", () => {
    it("should identify astronomical UIDs correctly", () => {
      expect(isAstronomicalUID("planet:earth")).toBe(true);
      expect(isAstronomicalUID("star:sun")).toBe(true);
      expect(isAstronomicalUID("galaxy:milky_way")).toBe(true);
      expect(isAstronomicalUID("solar_system:sol")).toBe(true);
      expect(isAstronomicalUID("animal:dog")).toBe(false);
      expect(isAstronomicalUID("person:scientist")).toBe(false);
    });

    it("should get entity types from UIDs", () => {
      expect(getAstronomicalEntityType("planet:earth")).toBe("Planet");
      expect(getAstronomicalEntityType("star:sun")).toBe("Star");
      expect(getAstronomicalEntityType("galaxy:milky_way")).toBe("Galaxy");
      expect(getAstronomicalEntityType("solar_system:sol")).toBe(
        "Solar_System"
      );
      expect(getAstronomicalEntityType("animal:dog")).toBeNull();
    });

    it("should validate astronomical UID formats", () => {
      expect(validateAstronomicalUID("planet:earth")).toBe(true);
      expect(validateAstronomicalUID("star:sun")).toBe(true);
      expect(validateAstronomicalUID("galaxy:milky_way")).toBe(true);
      expect(validateAstronomicalUID("solar_system:sol")).toBe(true);
      expect(validateAstronomicalUID("invalid:format")).toBe(false);
    });
  });

  describe("Domain Registry", () => {
    it("should export all astronomical schemas", () => {
      expect(Object.keys(ASTRONOMICAL_ENTITY_SCHEMAS)).toEqual([
        "Planet",
        "Star",
        "Galaxy",
        "Solar_System",
      ]);
    });

    it("should have correct UID validators", () => {
      expect(Object.keys(ASTRONOMICAL_UID_VALIDATORS)).toEqual([
        "planet",
        "star",
        "galaxy",
        "solar_system",
      ]);
    });

    it("should provide domain metadata", () => {
      expect(ASTRONOMICAL_DOMAIN_INFO.name).toBe("astronomical");
      expect(ASTRONOMICAL_DOMAIN_INFO.entityCount).toBe(4);
      expect(ASTRONOMICAL_DOMAIN_INFO.relationships).toContain("ORBITS");
      expect(ASTRONOMICAL_DOMAIN_INFO.relationships).toContain("CONTAINS");
    });
  });

  describe("System Integration", () => {
    it("should validate astronomical entities in bundles", () => {
      const bundle = {
        entities: [
          {
            uid: "planet:earth",
            type: "Planet",
            name: "Earth",
            properties: {
              planetType: "terrestrial",
              mass: 1.0,
              hasWater: true,
            },
          },
          {
            uid: "star:sun",
            type: "Star",
            name: "Sun",
            properties: {
              starType: "main_sequence",
              spectralClass: "G",
            },
          },
        ],
        relationships: [
          {
            uid: "rel:earth_orbits_sun",
            source: "planet:earth",
            target: "star:sun",
            type: "ORBITS",
          },
        ],
        evidence: [],
        content: [],
        files: [],
      };

      const result = validateRabbitHoleBundle(bundle);
      if (!result.isValid) {
        console.log("Validation errors:", result.errors);
      }
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate all astronomical entity types", () => {
      expect(ASTRONOMICAL_ENTITY_TYPES).toEqual([
        "Planet",
        "Star",
        "Galaxy",
        "Solar_System",
      ]);
      expect(ASTRONOMICAL_ENTITY_TYPES).toHaveLength(4);
    });

    it("should integrate with cross-domain relationships", () => {
      const bundle = {
        entities: [
          {
            uid: "planet:earth",
            type: "Planet",
            name: "Earth",
          },
          {
            uid: "person:galileo",
            type: "Person",
            name: "Galileo Galilei",
          },
        ],
        relationships: [
          {
            uid: "rel:galileo_discovered_moons",
            source: "person:galileo",
            target: "planet:earth",
            type: "RESEARCHES",
          },
        ],
        evidence: [],
        content: [],
        files: [],
      };

      const result = validateRabbitHoleBundle(bundle);
      if (!result.isValid) {
        console.log("Cross-domain validation errors:", result.errors);
      }
      expect(result.isValid).toBe(true);
    });
  });

  describe("Universal Properties", () => {
    it("should support geospatial properties on astronomical entities", () => {
      const planetWithCoords = {
        uid: "planet:kepler452b",
        type: "Planet",
        name: "Kepler-452b",
        geospatial: {
          coordinates: {
            rightAscension: "19h 44m 00.89s",
            declination: "+44° 16′ 39.0″",
          },
          location_precision: "high",
        },
        properties: {
          planetType: "exoplanet",
          distance: 1402,
        },
      };

      const result =
        ASTRONOMICAL_ENTITY_SCHEMAS.Planet.safeParse(planetWithCoords);
      expect(result.success).toBe(true);
    });

    it("should support temporal properties on astronomical entities", () => {
      const starWithTime = {
        uid: "star:betelgeuse",
        type: "Star",
        name: "Betelgeuse",
        temporal: {
          discovered_date: "1836-01-01T00:00:00Z",
          time_precision: "year",
        },
        properties: {
          starType: "supergiant",
          spectralClass: "M",
          age: 10000000,
        },
      };

      const result = ASTRONOMICAL_ENTITY_SCHEMAS.Star.safeParse(starWithTime);
      expect(result.success).toBe(true);
    });
  });
});
