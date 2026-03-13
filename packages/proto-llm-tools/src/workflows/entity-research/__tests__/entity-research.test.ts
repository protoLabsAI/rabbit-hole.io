import { describe, it, expect, vi, beforeEach } from "vitest";

import type { EntityResearchInput, EntityResearchSource } from "@proto/types";

import { entityResearchTool } from "../index";

// Mock the langextract client tool
vi.mock("../../tools/langextract-client", () => ({
  langextractClientTool: {
    invoke: vi.fn(),
  },
}));

describe.skip("Entity Research Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("entityResearchTool", () => {
    it("should handle organization research with valid input", async () => {
      // Mock research sources
      const mockRawData: EntityResearchSource[] = [
        {
          content:
            "Tesla Inc. is an American electric vehicle and clean energy company based in Austin, Texas. Founded in 2003 by Martin Eberhard and Marc Tarpenning, Tesla is now led by CEO Elon Musk. The company designs, develops, manufactures, and sells fully electric vehicles.",
          source: "Company Website",
          sourceType: "corporate_website",
          reliability: 0.9,
        },
        {
          content:
            "Tesla reported revenue of $96.8 billion in 2023, with over 140,000 employees worldwide. The company operates manufacturing facilities in multiple countries.",
          source: "Annual Report",
          sourceType: "sec_filing",
          reliability: 0.95,
        },
      ];

      // Mock the langextract response
      const mockLangExtractResponse = {
        success: true,
        extractedData: {
          name: "Tesla Inc.",
          orgType: "corporation",
          founded: "2003",
          headquarters: "Austin, Texas",
          industry: "Electric Vehicles",
          ceo: "Elon Musk",
          founders: ["Martin Eberhard", "Marc Tarpenning"],
          revenue: 96800000000,
          employees: 140000,
        },
        metadata: {
          modelUsed: "gpt-4o",
          processingTimeMs: 2500,
          confidence: 0.9,
        },
        sourceGrounding: [],
      };

      // Mock the tool calls
      const { langextractClientTool } = await import(
        "../../tools/langextract-client"
      );
      vi.mocked(langextractClientTool.invoke).mockResolvedValue(
        mockLangExtractResponse
      );

      const input: EntityResearchInput = {
        targetEntityName: "Tesla Inc.",
        entityType: "Organization",
        researchDepth: "detailed",
        focusAreas: ["business", "financial"],
        rawData: mockRawData,
      };

      const result = await entityResearchTool.invoke(input);

      expect(result.success).toBe(true);
      expect(result.targetEntityName).toBe("Tesla Inc.");
      expect(result.detectedEntityType).toBe("Organization");
      expect(result.entities).toHaveLength(1);

      const entity = result.entities[0];
      expect(entity.uid).toBe("org:tesla_inc");
      expect(entity.type).toBe("Organization");
      expect(entity.name).toBe("Tesla Inc.");
      expect(entity.properties?.orgType).toBe("corporation");
      expect(entity.properties?.founded).toBe("2003");

      expect(result.evidence).toHaveLength(2);
      expect(result.metadata.researchMethod).toBe("ai_extraction");
      expect(result.metadata.sourcesConsulted).toEqual([
        "Company Website",
        "Annual Report",
      ]);
    });

    it("should auto-detect entity type when not provided", async () => {
      const mockRawData: EntityResearchSource[] = [
        {
          content:
            "Twitter is a social networking platform that allows users to post short messages. It was acquired by Elon Musk in 2022 and rebranded as X.",
          source: "News Article",
          sourceType: "news_archive",
          reliability: 0.8,
        },
      ];

      const mockLangExtractResponse = {
        success: true,
        extractedData: {
          name: "Twitter (X)",
          platformType: "social_media",
          launched: "2006",
          userBase: 450000000,
          currentOwner: "Elon Musk",
        },
        metadata: {
          modelUsed: "gpt-4o",
          processingTimeMs: 2000,
          confidence: 0.85,
        },
      };

      const { langextractClientTool } = await import(
        "../../tools/langextract-client"
      );
      vi.mocked(langextractClientTool.invoke).mockResolvedValue(
        mockLangExtractResponse
      );

      const input: EntityResearchInput = {
        targetEntityName: "Twitter",
        // No entityType provided - should auto-detect
        researchDepth: "detailed",
        rawData: mockRawData,
      };

      const result = await entityResearchTool.invoke(input);

      expect(result.success).toBe(true);
      expect(result.detectedEntityType).toBe("Platform");
      expect(result.entities).toHaveLength(1);

      const entity = result.entities[0];
      expect(entity.uid).toBe("platform:twitter");
      expect(entity.type).toBe("Platform");
    });

    it("should handle movement research", async () => {
      const mockRawData: EntityResearchSource[] = [
        {
          content:
            "The MAGA (Make America Great Again) movement is a political movement associated with Donald Trump. It promotes populist and nationalist ideologies with key figures including Steve Bannon.",
          source: "Political Analysis",
          sourceType: "academic",
          reliability: 0.85,
        },
      ];

      const mockLangExtractResponse = {
        success: true,
        extractedData: {
          name: "MAGA Movement",
          ideology: "populist nationalism",
          founded: "2016",
          keyFigures: ["Donald Trump", "Steve Bannon"],
          geography: "United States",
          status: "active",
        },
        metadata: {
          modelUsed: "gpt-4o",
          confidence: 0.8,
        },
      };

      const { langextractClientTool } = await import(
        "../../tools/langextract-client"
      );
      vi.mocked(langextractClientTool.invoke).mockResolvedValue(
        mockLangExtractResponse
      );

      const input: EntityResearchInput = {
        targetEntityName: "MAGA Movement",
        entityType: "Movement",
        rawData: mockRawData,
      };

      const result = await entityResearchTool.invoke(input);

      expect(result.success).toBe(true);
      expect(result.detectedEntityType).toBe("Movement");
      expect(result.entities[0].properties?.ideology).toBe(
        "populist nationalism"
      );
      expect(result.entities[0].properties?.status).toBe("active");
    });

    it("should handle event research", async () => {
      const mockRawData: EntityResearchSource[] = [
        {
          content:
            "The January 6, 2021 attack on the United States Capitol occurred when supporters of Donald Trump breached the building to disrupt the electoral vote certification.",
          source: "News Report",
          sourceType: "major_media",
          reliability: 0.95,
        },
      ];

      const mockLangExtractResponse = {
        success: true,
        extractedData: {
          name: "January 6 Capitol Attack",
          date: "2021-01-06",
          eventType: "incident",
          location: "United States Capitol",
          participants: ["Trump supporters"],
          impact: "national",
        },
        metadata: {
          modelUsed: "gpt-4o",
          confidence: 0.9,
        },
      };

      const { langextractClientTool } = await import(
        "../../tools/langextract-client"
      );
      vi.mocked(langextractClientTool.invoke).mockResolvedValue(
        mockLangExtractResponse
      );

      const input: EntityResearchInput = {
        targetEntityName: "January 6 Capitol Attack",
        entityType: "Event",
        rawData: mockRawData,
      };

      const result = await entityResearchTool.invoke(input);

      expect(result.success).toBe(true);
      expect(result.detectedEntityType).toBe("Event");
      expect(result.entities[0].properties?.date).toBe("2021-01-06");
      expect(result.entities[0].properties?.eventType).toBe("incident");
    });

    it("should handle empty raw data gracefully", async () => {
      const input: EntityResearchInput = {
        targetEntityName: "Test Entity",
        rawData: [], // Empty raw data
      };

      const result = await entityResearchTool.invoke(input);

      expect(result.success).toBe(false);
      expect(result.metadata.dataGaps).toContain("No source data provided");
      expect(result.metadata.warnings).toContain(
        "No raw data sources provided for research"
      );
    });

    it("should handle langextract failures gracefully", async () => {
      const mockRawData: EntityResearchSource[] = [
        {
          content: "Some test content",
          source: "Test Source",
          sourceType: "user_provided",
        },
      ];

      // Mock langextract failure
      const { langextractClientTool } = await import(
        "../../tools/langextract-client"
      );
      vi.mocked(langextractClientTool.invoke).mockRejectedValue(
        new Error("LangExtract service unavailable")
      );

      const input: EntityResearchInput = {
        targetEntityName: "Test Organization",
        entityType: "Organization",
        rawData: mockRawData,
      };

      const result = await entityResearchTool.invoke(input);

      expect(result.success).toBe(false);
      expect(result.metadata.researchMethod).toBe("fallback_parsing");
      expect(
        result.metadata.warnings.some((w) =>
          w.includes("Workflow execution error")
        )
      ).toBe(true);
    });

    it("should calculate quality metrics correctly", async () => {
      const mockRawData: EntityResearchSource[] = [
        {
          content: "Complete organization data with all fields filled",
          source: "Comprehensive Source",
          sourceType: "sec_filing",
          reliability: 0.95,
        },
      ];

      const mockLangExtractResponse = {
        success: true,
        extractedData: {
          name: "Complete Org",
          orgType: "corporation",
          founded: "2000",
          headquarters: "New York",
          industry: "Technology",
          ceo: "John Doe",
          revenue: 1000000,
          employees: 500,
        },
        metadata: {
          confidence: 0.95,
        },
      };

      const { langextractClientTool } = await import(
        "../../tools/langextract-client"
      );
      vi.mocked(langextractClientTool.invoke).mockResolvedValue(
        mockLangExtractResponse
      );

      const input: EntityResearchInput = {
        targetEntityName: "Complete Org",
        entityType: "Organization",
        rawData: mockRawData,
      };

      const result = await entityResearchTool.invoke(input);

      expect(result.success).toBe(true);
      expect(result.metadata.confidenceScore).toBeGreaterThan(0.8);
      expect(result.metadata.dataGaps).toHaveLength(0); // Should have no gaps with complete data
      expect(result.metadata.propertiesExtracted).toContain("orgType");
      expect(result.metadata.propertiesExtracted).toContain("founded");
    });
  });
});
