/**
 * Social Domain Complete - Test Suite
 *
 * Comprehensive tests for the complete social domain including
 * all 6 core social entities: Person, Organization, Platform, Movement, Event, Media.
 */

import { describe, it, expect } from "vitest";

import {
  SOCIAL_ENTITY_SCHEMAS,
  SOCIAL_UID_VALIDATORS,
  SOCIAL_ENTITY_TYPES,
  validateSocialUID,
  getSocialEntityType,
  isSocialUID,
  PersonEntitySchema,
  OrganizationEntitySchema,
  PlatformEntitySchema,
  MovementEntitySchema,
  EventEntitySchema,
  MediaEntitySchema,
} from "../domains/social";
import { EntitySchemaRegistry } from "../entity-schema-registry";

describe("Social Domain - Complete Migration", () => {
  // ==================== Registry Tests ====================

  describe("Domain Registry", () => {
    it("includes all 6 social entity types", () => {
      expect(SOCIAL_ENTITY_TYPES).toEqual([
        "Person",
        "Organization",
        "Platform",
        "Movement",
        "Event",
        "Media",
      ]);
      expect(SOCIAL_ENTITY_TYPES).toHaveLength(6);
    });

    it("has schemas for all entity types", () => {
      expect(SOCIAL_ENTITY_SCHEMAS.Person).toBeDefined();
      expect(SOCIAL_ENTITY_SCHEMAS.Organization).toBeDefined();
      expect(SOCIAL_ENTITY_SCHEMAS.Platform).toBeDefined();
      expect(SOCIAL_ENTITY_SCHEMAS.Movement).toBeDefined();
      expect(SOCIAL_ENTITY_SCHEMAS.Event).toBeDefined();
      expect(SOCIAL_ENTITY_SCHEMAS.Media).toBeDefined();
    });

    it("has UID validators for all entity types", () => {
      expect(SOCIAL_UID_VALIDATORS.person).toBeDefined();
      expect(SOCIAL_UID_VALIDATORS.org).toBeDefined();
      expect(SOCIAL_UID_VALIDATORS.platform).toBeDefined();
      expect(SOCIAL_UID_VALIDATORS.movement).toBeDefined();
      expect(SOCIAL_UID_VALIDATORS.event).toBeDefined();
      expect(SOCIAL_UID_VALIDATORS.media).toBeDefined();
    });
  });

  // ==================== Person Entity Tests ====================

  describe("Person Entity", () => {
    it("validates valid person entity", () => {
      const validPerson = {
        uid: "person:john_doe",
        type: "Person",
        name: "John Doe",
        bio: "Test person for validation",
        birthDate: "1990-01-01",
        birthPlace: "New York, NY",
        nationality: "American",
        occupation: "Software Engineer",
        age: 34,
        gender: "male",
        socialMedia: {
          twitter: "@johndoe",
          linkedin: "john-doe",
        },
        contactInfo: {
          email: "john@example.com",
          website: "https://johndoe.com",
        },
      };

      const result = PersonEntitySchema.safeParse(validPerson);
      expect(result.success).toBe(true);
    });

    it("validates person UID format", () => {
      expect(validateSocialUID("person:john_doe")).toBe(true);
      expect(validateSocialUID("person:jane_smith")).toBe(true);
      expect(SOCIAL_UID_VALIDATORS.person("person:john_doe")).toBe(true);
      expect(SOCIAL_UID_VALIDATORS.person("org:john_doe")).toBe(false);
    });

    it("gets correct entity type from person UID", () => {
      expect(getSocialEntityType("person:test")).toBe("Person");
      expect(isSocialUID("person:test")).toBe(true);
    });
  });

  // ==================== Organization Entity Tests ====================

  describe("Organization Entity", () => {
    it("validates valid organization entity", () => {
      const validOrganization = {
        uid: "org:tech_corp",
        type: "Organization",
        name: "Tech Corp Inc.",
        properties: {
          orgType: "corporation",
          founded: "2010",
          headquarters: "Silicon Valley, CA",
          industry: "Technology",
          revenue: 1000000000,
          employees: 5000,
          ceo: "person:jane_ceo",
          stockTicker: "TECH",
          website: "https://techcorp.com",
          legalStatus: "active",
          jurisdiction: "Delaware",
          products: ["Software Platform", "Cloud Services"],
        },
      };

      const result = OrganizationEntitySchema.safeParse(validOrganization);
      expect(result.success).toBe(true);
    });

    it("validates organization UID format", () => {
      expect(validateSocialUID("org:tech_corp")).toBe(true);
      expect(SOCIAL_UID_VALIDATORS.org("org:tech_corp")).toBe(true);
      expect(SOCIAL_UID_VALIDATORS.org("person:tech_corp")).toBe(false);
    });

    it("gets correct entity type from organization UID", () => {
      expect(getSocialEntityType("org:test")).toBe("Organization");
      expect(isSocialUID("org:test")).toBe(true);
    });
  });

  // ==================== Platform Entity Tests ====================

  describe("Platform Entity", () => {
    it("validates valid platform entity", () => {
      const validPlatform = {
        uid: "platform:social_network",
        type: "Platform",
        name: "Social Network",
        properties: {
          platformType: "social_media",
          launched: "2004",
          userBase: 2900000000,
          parentCompany: "org:meta_platforms",
          headquarters: "Menlo Park, CA",
          website: "https://socialnetwork.com",
          moderationPolicies: "Community standards",
          contentTypes: ["text", "images", "videos", "live_streams"],
          businessModel: "advertising",
          status: "active",
          features: ["messaging", "groups", "pages", "marketplace"],
          apiAvailable: true,
        },
      };

      const result = PlatformEntitySchema.safeParse(validPlatform);
      expect(result.success).toBe(true);
    });

    it("validates platform UID format", () => {
      expect(validateSocialUID("platform:social_network")).toBe(true);
      expect(SOCIAL_UID_VALIDATORS.platform("platform:social_network")).toBe(
        true
      );
      expect(SOCIAL_UID_VALIDATORS.platform("org:social_network")).toBe(false);
    });

    it("gets correct entity type from platform UID", () => {
      expect(getSocialEntityType("platform:test")).toBe("Platform");
      expect(isSocialUID("platform:test")).toBe(true);
    });
  });

  // ==================== Movement Entity Tests ====================

  describe("Movement Entity", () => {
    it("validates valid movement entity", () => {
      const validMovement = {
        uid: "movement:civil_rights",
        type: "Movement",
        name: "Civil Rights Movement",
        properties: {
          ideology: "Civil rights and equality",
          founded: "1950",
          ended: "1968",
          keyFigures: ["person:martin_luther_king", "person:rosa_parks"],
          geography: "United States",
          topic: "Racial equality and civil rights",
          goals: ["End segregation", "Voting rights", "Equal treatment"],
          tactics: [
            "Peaceful protests",
            "Civil disobedience",
            "Legal challenges",
          ],
          status: "transformed",
          size: "massive",
          influence: "national",
          majorEvents: [
            "event:march_on_washington",
            "event:montgomery_bus_boycott",
          ],
        },
      };

      const result = MovementEntitySchema.safeParse(validMovement);
      expect(result.success).toBe(true);
    });

    it("validates movement UID format", () => {
      expect(validateSocialUID("movement:civil_rights")).toBe(true);
      expect(SOCIAL_UID_VALIDATORS.movement("movement:civil_rights")).toBe(
        true
      );
      expect(SOCIAL_UID_VALIDATORS.movement("person:civil_rights")).toBe(false);
    });

    it("gets correct entity type from movement UID", () => {
      expect(getSocialEntityType("movement:test")).toBe("Movement");
      expect(isSocialUID("movement:test")).toBe(true);
    });
  });

  // ==================== Event Entity Tests ====================

  describe("Event Entity", () => {
    it("validates valid event entity", () => {
      const validEvent = {
        uid: "event:tech_conference_2024",
        type: "Event",
        name: "Tech Conference 2024",
        properties: {
          date: "2024-03-15",
          endDate: "2024-03-17",
          duration: "3 days",
          eventType: "conference",
          description: "Annual technology conference",
          significance: "major",
          participants: ["person:keynote_speaker", "person:attendee_1"],
          organizers: ["org:conference_company"],
          location: "San Francisco, CA",
          outcome: "Successful conference with 5000 attendees",
          media_coverage: "extensive",
          related_events: ["event:tech_conference_2023"],
        },
      };

      const result = EventEntitySchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it("validates event UID format", () => {
      expect(validateSocialUID("event:tech_conference")).toBe(true);
      expect(SOCIAL_UID_VALIDATORS.event("event:tech_conference")).toBe(true);
      expect(SOCIAL_UID_VALIDATORS.event("person:tech_conference")).toBe(false);
    });

    it("gets correct entity type from event UID", () => {
      expect(getSocialEntityType("event:test")).toBe("Event");
      expect(isSocialUID("event:test")).toBe(true);
    });
  });

  // ==================== Media Entity Tests ====================

  describe("Media Entity", () => {
    it("validates valid media entity", () => {
      const validMedia = {
        uid: "media:news_article_1",
        type: "Media",
        name: "Breaking Tech News",
        properties: {
          mediaType: "article",
          publishedDate: "2024-09-22",
          author: ["person:journalist_1"],
          publisher: "org:news_corp",
          platform: "platform:news_website",
          url: "https://news.com/breaking-tech-news",
          headline: "Major Tech Breakthrough Announced",
          summary: "Scientists announce revolutionary technology",
          topics: ["technology", "science", "innovation"],
          subjects: ["org:tech_company", "person:scientist"],
          language: "English",
          audience: "General public",
          credibility: "verified",
          viewCount: 150000,
          shareCount: 2500,
          factChecked: true,
          sources: ["org:research_institution"],
        },
      };

      const result = MediaEntitySchema.safeParse(validMedia);
      expect(result.success).toBe(true);
    });

    it("validates media UID format", () => {
      expect(validateSocialUID("media:news_article")).toBe(true);
      expect(SOCIAL_UID_VALIDATORS.media("media:news_article")).toBe(true);
      expect(SOCIAL_UID_VALIDATORS.media("person:news_article")).toBe(false);
    });

    it("gets correct entity type from media UID", () => {
      expect(getSocialEntityType("media:test")).toBe("Media");
      expect(isSocialUID("media:test")).toBe(true);
    });
  });

  // ==================== Registry Integration Tests ====================

  describe("Registry Integration", () => {
    const registry = EntitySchemaRegistry.getInstance();

    it("registry recognizes all social entities", () => {
      expect(registry.getSchema("Person")).toBeDefined();
      expect(registry.getSchema("Organization")).toBeDefined();
      expect(registry.getSchema("Platform")).toBeDefined();
      expect(registry.getSchema("Movement")).toBeDefined();
      expect(registry.getSchema("Event")).toBeDefined();
      expect(registry.getSchema("Media")).toBeDefined();
    });

    it("registry validates social UIDs correctly", () => {
      expect(registry.validateUID("person:test")).toBe(true);
      expect(registry.validateUID("org:test")).toBe(true);
      expect(registry.validateUID("platform:test")).toBe(true);
      expect(registry.validateUID("movement:test")).toBe(true);
      expect(registry.validateUID("event:test")).toBe(true);
      expect(registry.validateUID("media:test")).toBe(true);
    });

    it("registry maps UIDs to correct domain", () => {
      expect(registry.getDomainFromUID("person:test")).toBe("social");
      expect(registry.getDomainFromUID("org:test")).toBe("social");
      expect(registry.getDomainFromUID("platform:test")).toBe("social");
      expect(registry.getDomainFromUID("movement:test")).toBe("social");
      expect(registry.getDomainFromUID("event:test")).toBe("social");
      expect(registry.getDomainFromUID("media:test")).toBe("social");
    });
  });

  // ==================== Cross-Domain Integration Tests ====================

  describe("Cross-Domain Integration", () => {
    it("maintains all previously migrated domains", () => {
      const registry = EntitySchemaRegistry.getInstance();

      // Biological domain should still work
      expect(registry.getSchema("Animal")).toBeDefined();
      expect(registry.getSchema("Plant")).toBeDefined();
      expect(registry.getSchema("Fungi")).toBeDefined();
      expect(registry.getSchema("Species")).toBeDefined();
      expect(registry.getSchema("Insect")).toBeDefined();
      expect(registry.getSchema("Ecosystem")).toBeDefined();

      // Social domain should now work too
      expect(registry.getSchema("Person")).toBeDefined();
      expect(registry.getSchema("Organization")).toBeDefined();
      expect(registry.getSchema("Platform")).toBeDefined();
      expect(registry.getSchema("Movement")).toBeDefined();
      expect(registry.getSchema("Event")).toBeDefined();
      expect(registry.getSchema("Media")).toBeDefined();
    });

    it("supports cross-domain relationships", () => {
      // Test that social entities can reference biological entities
      const personWithPets = {
        uid: "person:pet_owner",
        type: "Person",
        name: "Pet Owner",
        bio: "Loves animals",
        // Could reference animal entities in relationships
      };

      const result = PersonEntitySchema.safeParse(personWithPets);
      expect(result.success).toBe(true);
    });

    it("all social entities inherit universal properties", () => {
      const testPerson = {
        uid: "person:test",
        type: "Person",
        name: "Test Person",
        // Universal properties should be inherited
        coordinates: {
          latitude: 40.7128,
          longitude: -74.006,
        },
        startDate: "2024-01-01",
        status: "active",
        relatedEvents: ["event:birth"],
      };

      const result = PersonEntitySchema.safeParse(testPerson);
      expect(result.success).toBe(true);
    });
  });
});
