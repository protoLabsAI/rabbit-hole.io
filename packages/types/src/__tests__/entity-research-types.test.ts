import { describe, it, expect } from "vitest";

import {
  generateEntityUID,
  generateRelationshipUID,
  OrganizationPropertiesSchema,
  PlatformPropertiesSchema,
  MovementPropertiesSchema,
  EventPropertiesSchema,
  type EntityResearchInput,
  type EntityResearchOutput,
  type OrganizationResearchInput,
  type ResearchSource,
} from "../entity-research-types";
import type { EntityType } from "../validation-schemas-modular";

describe("Entity Research Types", () => {
  describe("UID Generation", () => {
    describe("generateEntityUID", () => {
      it("should generate proper UIDs for each entity type", () => {
        const testCases: Array<{
          entityType: EntityType;
          name: string;
          expected: string;
        }> = [
          {
            entityType: "Person",
            name: "Elon Musk",
            expected: "person:elon_musk",
          },
          {
            entityType: "Organization",
            name: "Tesla Inc.",
            expected: "org:tesla_inc",
          },
          {
            entityType: "Platform",
            name: "Twitter/X",
            expected: "platform:twitter_x",
          },
          {
            entityType: "Movement",
            name: "MAGA Movement",
            expected: "movement:maga_movement",
          },
          {
            entityType: "Event",
            name: "2024 Election",
            expected: "event:2024_election",
          },
        ];

        testCases.forEach(({ entityType, name, expected }) => {
          const result = generateEntityUID(entityType, name);
          expect(result).toBe(expected);
        });
      });

      it("should normalize special characters and spaces", () => {
        const result = generateEntityUID("Organization", "Apple Inc. & Co.!");
        expect(result).toBe("org:apple_inc_co");
      });

      it("should truncate long names", () => {
        const longName = "A".repeat(100);
        const result = generateEntityUID("Person", longName);
        expect(result.length).toBeLessThanOrEqual(57); // "person:" + 50 chars max
      });

      it("should handle empty names gracefully", () => {
        const result = generateEntityUID("Person", "");
        expect(result).toBe("person:");
      });
    });

    describe("generateRelationshipUID", () => {
      it("should generate relationship UIDs correctly", () => {
        const result = generateRelationshipUID(
          "person:elon_musk",
          "org:tesla",
          "OWNS",
          "2024-01-15T10:30:00Z"
        );
        expect(result).toBe("rel:elon_musk_owns_tesla_20240115");
      });

      it("should work without timestamp", () => {
        const result = generateRelationshipUID(
          "person:donald_trump",
          "platform:truth_social",
          "OWNS"
        );
        expect(result).toBe("rel:donald_trump_owns_truth_social");
      });

      it("should handle different relationship types", () => {
        const result = generateRelationshipUID(
          "person:steve_bannon",
          "movement:maga_movement",
          "NARRATIVE_ALIGNMENT"
        );
        expect(result).toBe(
          "rel:steve_bannon_narrative_alignment_maga_movement"
        );
      });
    });
  });

  describe("Property Schemas", () => {
    describe("OrganizationPropertiesSchema", () => {
      it("should validate valid organization properties", () => {
        const validProps = {
          orgType: "corporation",
          founded: "2003",
          headquarters: "Austin, Texas",
          industry: "Electric Vehicles",
          revenue: 96773000000,
          employees: 140000,
          ceo: "Elon Musk",
          website: "https://tesla.com",
        };

        const result = OrganizationPropertiesSchema.safeParse(validProps);
        expect(result.success).toBe(true);
      });

      it("should reject invalid website URLs", () => {
        const invalidProps = {
          website: "not-a-url",
        };

        const result = OrganizationPropertiesSchema.safeParse(invalidProps);
        expect(result.success).toBe(false);
      });

      it("should allow partial properties", () => {
        const partialProps = {
          orgType: "corporation",
          founded: "2003",
        };

        const result = OrganizationPropertiesSchema.safeParse(partialProps);
        expect(result.success).toBe(true);
      });
    });

    describe("PlatformPropertiesSchema", () => {
      it("should validate valid platform properties", () => {
        const validProps = {
          platformType: "social_media",
          launched: "2006",
          userBase: 450000000,
          parentCompany: "Meta Platforms Inc.",
          headquarters: "Menlo Park, California",
          website: "https://twitter.com",
        };

        const result = PlatformPropertiesSchema.safeParse(validProps);
        expect(result.success).toBe(true);
      });

      it("should allow empty object", () => {
        const result = PlatformPropertiesSchema.safeParse({});
        expect(result.success).toBe(true);
      });
    });

    describe("MovementPropertiesSchema", () => {
      it("should validate valid movement properties", () => {
        const validProps = {
          ideology: "populist",
          founded: "2015",
          keyFigures: ["Donald Trump", "Steve Bannon"],
          geography: "United States",
          topic: "political",
          status: "active" as const,
        };

        const result = MovementPropertiesSchema.safeParse(validProps);
        expect(result.success).toBe(true);
      });

      it("should validate status enum values", () => {
        const validStatuses = ["active", "dormant", "defunct"] as const;

        validStatuses.forEach((status) => {
          const result = MovementPropertiesSchema.safeParse({ status });
          expect(result.success).toBe(true);
        });

        const invalidStatus = MovementPropertiesSchema.safeParse({
          status: "invalid",
        });
        expect(invalidStatus.success).toBe(false);
      });
    });

    describe("EventPropertiesSchema", () => {
      it("should validate valid event properties", () => {
        const validProps = {
          date: "2024-01-06",
          endDate: "2024-01-07",
          location: "Washington, D.C.",
          participants: ["Donald Trump", "crowd"],
          impact: "significant",
          duration: "2 hours",
          eventType: "political rally",
        };

        const result = EventPropertiesSchema.safeParse(validProps);
        expect(result.success).toBe(true);
      });

      it("should handle events without end date", () => {
        const props = {
          date: "2024-01-06",
          location: "Washington, D.C.",
        };

        const result = EventPropertiesSchema.safeParse(props);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Research Input Types", () => {
    describe("EntityResearchInput", () => {
      it("should accept valid research input", () => {
        const input: EntityResearchInput = {
          targetEntityName: "Tesla Inc.",
          entityType: "Organization",
          researchDepth: "detailed",
          focusAreas: ["financial", "business", "legal"],
          rawData: [
            {
              content: "Tesla Inc. is an electric vehicle company...",
              source: "Company Website",
              sourceType: "corporate_website",
              reliability: 0.9,
            },
          ],
        };

        // This is a type check - if it compiles, the type is correct
        expect(input.targetEntityName).toBe("Tesla Inc.");
        expect(input.entityType).toBe("Organization");
        expect(input.researchDepth).toBe("detailed");
        expect(input.focusAreas).toEqual(["financial", "business", "legal"]);
      });

      it("should work without optional fields", () => {
        const input: EntityResearchInput = {
          targetEntityName: "Elon Musk",
        };

        expect(input.targetEntityName).toBe("Elon Musk");
        expect(input.entityType).toBeUndefined();
      });
    });

    describe("OrganizationResearchInput", () => {
      it("should accept organization-specific configuration", () => {
        const input: OrganizationResearchInput = {
          targetOrganizationName: "Tesla Inc.",
          researchDepth: "comprehensive",
          dataSourceConfig: {
            sec: {
              enabled: true,
              maxFilings: 10,
            },
            corporateWebsite: {
              enabled: true,
              includePress: true,
            },
            businessRegistration: {
              enabled: true,
              jurisdictions: ["Delaware", "California"],
            },
          },
        };

        expect(input.targetOrganizationName).toBe("Tesla Inc.");
        expect(input.dataSourceConfig?.sec?.enabled).toBe(true);
        expect(
          input.dataSourceConfig?.businessRegistration?.jurisdictions
        ).toEqual(["Delaware", "California"]);
      });
    });
  });

  describe("Research Source Types", () => {
    describe("ResearchSource", () => {
      it("should handle different source types", () => {
        const sources: ResearchSource[] = [
          {
            content: "Wikipedia article content...",
            source: "Wikipedia",
            sourceType: "wikipedia",
            sourceUrl: "https://en.wikipedia.org/wiki/Tesla_Inc",
            reliability: 0.8,
          },
          {
            content: "SEC filing content...",
            source: "SEC EDGAR",
            sourceType: "sec_filing",
            sourceUrl: "https://sec.gov/filing/123",
            reliability: 0.95,
            metadata: {
              documentType: "10-K",
              publishDate: "2024-02-15",
            },
          },
          {
            content: "User provided information...",
            source: "Manual Input",
            sourceType: "user_provided",
            reliability: 0.7,
          },
        ];

        sources.forEach((source) => {
          expect(source.content).toBeDefined();
          expect(source.source).toBeDefined();
          expect(source.sourceType).toBeDefined();
          expect(typeof source.reliability).toBe("number");
        });
      });
    });
  });

  describe("Mock Research Output", () => {
    it("should create valid research output structure", () => {
      // Mock data that would come from actual research
      const mockOutput: EntityResearchOutput = {
        success: true,
        targetEntityName: "Tesla Inc.",
        detectedEntityType: "Organization",
        entities: [
          {
            uid: "org:tesla_inc",
            type: "Organization",
            name: "Tesla Inc.",
            aliases: ["Tesla", "Tesla Motors"],
            tags: ["electric_vehicles", "clean_energy"],
            properties: {
              orgType: "corporation",
              founded: "2003",
              headquarters: "Austin, Texas",
              industry: "Electric Vehicles",
              ceo: "Elon Musk",
            },
          },
        ],
        relationships: [
          {
            uid: "rel:musk_owns_tesla",
            type: "OWNS",
            source: "person:elon_musk",
            target: "org:tesla_inc",
            confidence: 0.95,
          },
        ],
        evidence: [
          {
            uid: "evidence:tesla_sec_filing",
            kind: "government",
            title: "Tesla Inc. 10-K Filing",
            publisher: "SEC",
            date: "2024-02-15",
            url: "https://sec.gov/tesla-10k",
            reliability: 0.95,
          },
        ],
        metadata: {
          researchMethod: "ai_extraction",
          confidenceScore: 0.9,
          sourcesConsulted: ["SEC filings", "Company website"],
          processingTime: 2500,
          entityTypeDetectionConfidence: 0.95,
          propertiesExtracted: [
            "orgType",
            "founded",
            "headquarters",
            "industry",
            "ceo",
          ],
          relationshipsDiscovered: 1,
          dataGaps: ["revenue", "employees"],
          warnings: [],
        },
      };

      expect(mockOutput.success).toBe(true);
      expect(mockOutput.entities).toHaveLength(1);
      expect(mockOutput.relationships).toHaveLength(1);
      expect(mockOutput.evidence).toHaveLength(1);
      expect(mockOutput.metadata.researchMethod).toBe("ai_extraction");
      expect(mockOutput.metadata.confidenceScore).toBe(0.9);
      expect(mockOutput.metadata.dataGaps).toEqual(["revenue", "employees"]);
    });
  });

  describe("Entity Type Detection", () => {
    it("should handle different entity types in universal input", () => {
      const entityTypes: EntityType[] = [
        "Person",
        "Organization",
        "Platform",
        "Movement",
        "Event",
      ];

      entityTypes.forEach((entityType) => {
        const input: EntityResearchInput = {
          targetEntityName: `Test ${entityType}`,
          entityType,
          researchDepth: "basic",
        };

        expect(input.entityType).toBe(entityType);
      });
    });
  });
});
