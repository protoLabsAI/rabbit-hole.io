/**
 * Technology Domain Complete - Test Suite
 *
 * Comprehensive tests for the complete technology domain including
 * all 7 technology entities: Software, Hardware, Database, API, Protocol, Framework, Library.
 */

import { describe, it, expect } from "vitest";

import {
  TECHNOLOGY_ENTITY_SCHEMAS,
  TECHNOLOGY_UID_VALIDATORS,
  TECHNOLOGY_ENTITY_TYPES,
  validateTechnologyUID,
  getTechnologyEntityType,
  isTechnologyUID,
  SoftwareEntitySchema,
  HardwareEntitySchema,
  DatabaseEntitySchema,
  APIEntitySchema,
  ProtocolEntitySchema,
  FrameworkEntitySchema,
  LibraryEntitySchema,
} from "../domains/technology";
import { EntitySchemaRegistry } from "../entity-schema-registry";

describe("Technology Domain - Complete Migration", () => {
  // ==================== Registry Tests ====================

  describe("Domain Registry", () => {
    it("includes all 7 technology entity types", () => {
      expect(TECHNOLOGY_ENTITY_TYPES).toEqual([
        "Software",
        "Hardware",
        "Database",
        "API",
        "Protocol",
        "Framework",
        "Library",
      ]);
      expect(TECHNOLOGY_ENTITY_TYPES).toHaveLength(7);
    });

    it("has schemas for all entity types", () => {
      expect(TECHNOLOGY_ENTITY_SCHEMAS.Software).toBeDefined();
      expect(TECHNOLOGY_ENTITY_SCHEMAS.Hardware).toBeDefined();
      expect(TECHNOLOGY_ENTITY_SCHEMAS.Database).toBeDefined();
      expect(TECHNOLOGY_ENTITY_SCHEMAS.API).toBeDefined();
      expect(TECHNOLOGY_ENTITY_SCHEMAS.Protocol).toBeDefined();
      expect(TECHNOLOGY_ENTITY_SCHEMAS.Framework).toBeDefined();
      expect(TECHNOLOGY_ENTITY_SCHEMAS.Library).toBeDefined();
    });

    it("has UID validators for all entity types", () => {
      expect(TECHNOLOGY_UID_VALIDATORS.software).toBeDefined();
      expect(TECHNOLOGY_UID_VALIDATORS.hardware).toBeDefined();
      expect(TECHNOLOGY_UID_VALIDATORS.database).toBeDefined();
      expect(TECHNOLOGY_UID_VALIDATORS.api).toBeDefined();
      expect(TECHNOLOGY_UID_VALIDATORS.protocol).toBeDefined();
      expect(TECHNOLOGY_UID_VALIDATORS.framework).toBeDefined();
      expect(TECHNOLOGY_UID_VALIDATORS.library).toBeDefined();
    });
  });

  // ==================== Software Entity Tests ====================

  describe("Software Entity", () => {
    it("validates valid software entity", () => {
      const validSoftware = {
        uid: "software:visual_studio_code",
        type: "Software",
        name: "Visual Studio Code",
        properties: {
          version: "1.82.0",
          language: ["TypeScript", "JavaScript"],
          framework: "Electron",
          license: "MIT",
          openSource: true,
          repository: "https://github.com/microsoft/vscode",
          documentation: "https://code.visualstudio.com/docs",
          company: "org:microsoft",
          category: "application",
          platform: ["Windows", "macOS", "Linux"],
          dependencies: ["software:electron", "software:nodejs"],
          release_date: "2023-09-07",
          user_base: 15000000,
          pricing_model: "free",
          status: "active",
        },
      };

      const result = SoftwareEntitySchema.safeParse(validSoftware);
      expect(result.success).toBe(true);
    });

    it("validates software UID format", () => {
      expect(validateTechnologyUID("software:vscode")).toBe(true);
      expect(TECHNOLOGY_UID_VALIDATORS.software("software:vscode")).toBe(true);
      expect(TECHNOLOGY_UID_VALIDATORS.software("hardware:vscode")).toBe(false);
    });

    it("gets correct entity type from software UID", () => {
      expect(getTechnologyEntityType("software:test")).toBe("Software");
      expect(isTechnologyUID("software:test")).toBe(true);
    });
  });

  // ==================== Hardware Entity Tests ====================

  describe("Hardware Entity", () => {
    it("validates valid hardware entity", () => {
      const validHardware = {
        uid: "hardware:apple_m2_pro",
        type: "Hardware",
        name: "Apple M2 Pro",
        properties: {
          category: "processor",
          manufacturer: "org:apple",
          model: "M2 Pro",
          release_date: "2023-01-17",
          architecture: "ARM",
          power_consumption: 20,
          availability: "available",
        },
      };

      const result = HardwareEntitySchema.safeParse(validHardware);
      expect(result.success).toBe(true);
    });

    it("validates hardware UID format", () => {
      expect(validateTechnologyUID("hardware:m2_pro")).toBe(true);
      expect(TECHNOLOGY_UID_VALIDATORS.hardware("hardware:m2_pro")).toBe(true);
      expect(TECHNOLOGY_UID_VALIDATORS.hardware("software:m2_pro")).toBe(false);
    });

    it("gets correct entity type from hardware UID", () => {
      expect(getTechnologyEntityType("hardware:test")).toBe("Hardware");
      expect(isTechnologyUID("hardware:test")).toBe(true);
    });
  });

  // ==================== Database Entity Tests ====================

  describe("Database Entity", () => {
    it("validates valid database entity", () => {
      const validDatabase = {
        uid: "database:postgresql",
        type: "Database",
        name: "PostgreSQL",
        properties: {
          database_type: "relational",
          query_language: ["SQL", "PL/pgSQL"],
          vendor: "org:postgresql_global_development_group",
          license: "open_source",
          cloud_native: true,
          acid_compliant: true,
          scalability: "both",
          primary_use_cases: ["web_applications", "analytics", "geospatial"],
          supported_platforms: ["Linux", "Windows", "macOS"],
          replication: true,
          clustering: true,
          backup_features: ["pg_dump", "continuous_archiving"],
          security_features: ["SSL", "row_level_security", "data_masking"],
          version: "16.0",
          release_date: "2023-09-14",
          status: "active",
        },
      };

      const result = DatabaseEntitySchema.safeParse(validDatabase);
      expect(result.success).toBe(true);
    });

    it("validates database UID format", () => {
      expect(validateTechnologyUID("database:postgresql")).toBe(true);
      expect(TECHNOLOGY_UID_VALIDATORS.database("database:postgresql")).toBe(
        true
      );
      expect(TECHNOLOGY_UID_VALIDATORS.database("software:postgresql")).toBe(
        false
      );
    });

    it("gets correct entity type from database UID", () => {
      expect(getTechnologyEntityType("database:test")).toBe("Database");
      expect(isTechnologyUID("database:test")).toBe(true);
    });
  });

  // ==================== API Entity Tests ====================

  describe("API Entity", () => {
    it("validates valid API entity", () => {
      const validAPI = {
        uid: "api:github_rest_api",
        type: "API",
        name: "GitHub REST API",
        properties: {
          api_type: "REST",
          version: "v3",
          base_url: "https://api.github.com",
          documentation: "https://docs.github.com/en/rest",
          authentication: ["bearer_token", "oauth"],
          rate_limits: "5000 requests per hour",
          provider: "org:github",
          pricing_model: "freemium",
          data_format: ["json"],
          industry: ["software_development", "version_control"],
          status: "active",
          endpoints: 150,
          uptime: 99.9,
          response_time: 200,
          supported_methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
          cors_enabled: true,
          ssl_required: true,
        },
      };

      const result = APIEntitySchema.safeParse(validAPI);
      expect(result.success).toBe(true);
    });

    it("validates API UID format", () => {
      expect(validateTechnologyUID("api:github_rest")).toBe(true);
      expect(TECHNOLOGY_UID_VALIDATORS.api("api:github_rest")).toBe(true);
      expect(TECHNOLOGY_UID_VALIDATORS.api("software:github_rest")).toBe(false);
    });

    it("gets correct entity type from API UID", () => {
      expect(getTechnologyEntityType("api:test")).toBe("API");
      expect(isTechnologyUID("api:test")).toBe(true);
    });
  });

  // ==================== Protocol Entity Tests ====================

  describe("Protocol Entity", () => {
    it("validates valid protocol entity", () => {
      const validProtocol = {
        uid: "protocol:https",
        type: "Protocol",
        name: "HTTPS",
        properties: {
          protocol_type: "web",
          layer: "application",
          standard_body: "IETF",
          rfc_number: "RFC 2818",
          port_numbers: [443],
          encryption: true,
          reliability: "reliable",
          connection_type: "connection_oriented",
          version: "1.1, 2.0, 3.0",
          specification: "https://tools.ietf.org/html/rfc2818",
          implementation_examples: ["software:apache_httpd", "software:nginx"],
          supported_by: ["software:chrome", "software:firefox"],
          supersedes: "protocol:http",
          status: "active",
          adoption_rate: "widespread",
        },
      };

      const result = ProtocolEntitySchema.safeParse(validProtocol);
      expect(result.success).toBe(true);
    });

    it("validates protocol UID format", () => {
      expect(validateTechnologyUID("protocol:https")).toBe(true);
      expect(TECHNOLOGY_UID_VALIDATORS.protocol("protocol:https")).toBe(true);
      expect(TECHNOLOGY_UID_VALIDATORS.protocol("api:https")).toBe(false);
    });

    it("gets correct entity type from protocol UID", () => {
      expect(getTechnologyEntityType("protocol:test")).toBe("Protocol");
      expect(isTechnologyUID("protocol:test")).toBe(true);
    });
  });

  // ==================== Framework Entity Tests ====================

  describe("Framework Entity", () => {
    it("validates valid framework entity", () => {
      const validFramework = {
        uid: "framework:react",
        type: "Framework",
        name: "React",
        properties: {
          category: "frontend",
          language: ["JavaScript", "TypeScript"],
          paradigm: ["component", "reactive"],
          license: "MIT",
          maintainer: "org:meta",
          repository: "https://github.com/facebook/react",
          documentation: "https://react.dev/",
          learning_curve: "moderate",
          community_size: "huge",
          version: "18.2.0",
          release_date: "2022-06-14",
          last_update: "2023-09-01",
          dependencies: [],
          plugins: [
            "library:react_router",
            "library:redux",
            "library:styled_components",
          ],
          performance: "high",
          bundle_size: "42.2kB (React + ReactDOM)",
          browser_support: ["Chrome", "Firefox", "Safari", "Edge"],
          status: "active",
        },
      };

      const result = FrameworkEntitySchema.safeParse(validFramework);
      expect(result.success).toBe(true);
    });

    it("validates framework UID format", () => {
      expect(validateTechnologyUID("framework:react")).toBe(true);
      expect(TECHNOLOGY_UID_VALIDATORS.framework("framework:react")).toBe(true);
      expect(TECHNOLOGY_UID_VALIDATORS.framework("library:react")).toBe(false);
    });

    it("gets correct entity type from framework UID", () => {
      expect(getTechnologyEntityType("framework:test")).toBe("Framework");
      expect(isTechnologyUID("framework:test")).toBe(true);
    });
  });

  // ==================== Library Entity Tests ====================

  describe("Library Entity", () => {
    it("validates valid library entity", () => {
      const validLibrary = {
        uid: "library:lodash",
        type: "Library",
        name: "Lodash",
        properties: {
          language: ["JavaScript"],
          category: "utility",
          package_manager: ["npm"],
          version: "4.17.21",
          license: "MIT",
          author: "person:john_david_dalton",
          maintainer: "org:lodash_team",
          repository: "https://github.com/lodash/lodash",
          documentation: "https://lodash.com/docs",
          dependencies: [],
          size: "531kB",
          download_count: 50000000,
          weekly_downloads: 25000000,
          github_stars: 57000,
          open_issues: 12,
          last_commit: "2023-08-15",
          stability: "stable",
          breaking_changes: false,
          security_vulnerabilities: 0,
          status: "active",
        },
      };

      const result = LibraryEntitySchema.safeParse(validLibrary);
      expect(result.success).toBe(true);
    });

    it("validates library UID format", () => {
      expect(validateTechnologyUID("library:lodash")).toBe(true);
      expect(TECHNOLOGY_UID_VALIDATORS.library("library:lodash")).toBe(true);
      expect(TECHNOLOGY_UID_VALIDATORS.library("framework:lodash")).toBe(false);
    });

    it("gets correct entity type from library UID", () => {
      expect(getTechnologyEntityType("library:test")).toBe("Library");
      expect(isTechnologyUID("library:test")).toBe(true);
    });
  });

  // ==================== Registry Integration Tests ====================

  describe("Registry Integration", () => {
    const registry = EntitySchemaRegistry.getInstance();

    it("registry recognizes all technology entities", () => {
      expect(registry.getSchema("Software")).toBeDefined();
      expect(registry.getSchema("Hardware")).toBeDefined();
      expect(registry.getSchema("Database")).toBeDefined();
      expect(registry.getSchema("API")).toBeDefined();
      expect(registry.getSchema("Protocol")).toBeDefined();
      expect(registry.getSchema("Framework")).toBeDefined();
      expect(registry.getSchema("Library")).toBeDefined();
    });

    it("registry validates technology UIDs correctly", () => {
      expect(registry.validateUID("software:test")).toBe(true);
      expect(registry.validateUID("hardware:test")).toBe(true);
      expect(registry.validateUID("database:test")).toBe(true);
      expect(registry.validateUID("api:test")).toBe(true);
      expect(registry.validateUID("protocol:test")).toBe(true);
      expect(registry.validateUID("framework:test")).toBe(true);
      expect(registry.validateUID("library:test")).toBe(true);
    });

    it("registry maps UIDs to correct domain", () => {
      expect(registry.getDomainFromUID("software:test")).toBe("technology");
      expect(registry.getDomainFromUID("hardware:test")).toBe("technology");
      expect(registry.getDomainFromUID("database:test")).toBe("technology");
      expect(registry.getDomainFromUID("api:test")).toBe("technology");
      expect(registry.getDomainFromUID("protocol:test")).toBe("technology");
      expect(registry.getDomainFromUID("framework:test")).toBe("technology");
      expect(registry.getDomainFromUID("library:test")).toBe("technology");
    });
  });

  // ==================== Cross-Domain Integration Tests ====================

  describe("Cross-Domain Integration", () => {
    it("maintains all previously migrated domains", () => {
      const registry = EntitySchemaRegistry.getInstance();

      // Biological domain should still work
      expect(registry.getSchema("Animal")).toBeDefined();
      expect(registry.getSchema("Plant")).toBeDefined();

      // Social domain should still work
      expect(registry.getSchema("Person")).toBeDefined();
      expect(registry.getSchema("Organization")).toBeDefined();

      // Geographic domain should still work
      expect(registry.getSchema("Country")).toBeDefined();
      expect(registry.getSchema("City")).toBeDefined();

      // Technology domain should now work too
      expect(registry.getSchema("Software")).toBeDefined();
      expect(registry.getSchema("Hardware")).toBeDefined();
      expect(registry.getSchema("Database")).toBeDefined();
      expect(registry.getSchema("API")).toBeDefined();
      expect(registry.getSchema("Protocol")).toBeDefined();
      expect(registry.getSchema("Framework")).toBeDefined();
      expect(registry.getSchema("Library")).toBeDefined();
    });

    it("supports cross-domain relationships", () => {
      // Test that technology entities can reference other domains
      const softwareWithDeveloper = {
        uid: "software:test_app",
        type: "Software",
        name: "Test App",
        properties: {
          company: "org:test_company", // References social domain
          language: ["JavaScript"],
        },
      };

      const result = SoftwareEntitySchema.safeParse(softwareWithDeveloper);
      expect(result.success).toBe(true);
    });

    it("all technology entities inherit universal properties", () => {
      const testSoftware = {
        uid: "software:test",
        type: "Software",
        name: "Test Software",
        // Universal properties should be inherited
        coordinates: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
        startDate: "2023-01-01",
        status: "active",
        relatedEvents: ["event:software_launch"],
      };

      const result = SoftwareEntitySchema.safeParse(testSoftware);
      expect(result.success).toBe(true);
    });
  });

  // ==================== Technology Stack Relationships ====================

  describe("Technology Stack Relationships", () => {
    it("supports technology stack dependencies", () => {
      const techStackBundle = {
        entities: [
          {
            uid: "software:react_app",
            type: "Software",
            name: "React App",
            properties: {
              framework: "framework:react",
              dependencies: ["library:lodash", "library:axios"],
            },
          },
          {
            uid: "framework:react",
            type: "Framework",
            name: "React",
            properties: { language: ["JavaScript"] },
          },
          {
            uid: "library:lodash",
            type: "Library",
            name: "Lodash",
            properties: { category: "utility" },
          },
          {
            uid: "database:postgresql",
            type: "Database",
            name: "PostgreSQL",
            properties: { database_type: "relational" },
          },
        ],
        relationships: [],
        evidence: [],
        content: [],
        files: [],
      };

      // All entities should validate correctly
      techStackBundle.entities.forEach((entity) => {
        const schema =
          TECHNOLOGY_ENTITY_SCHEMAS[
            entity.type as keyof typeof TECHNOLOGY_ENTITY_SCHEMAS
          ];
        const result = schema.safeParse(entity);
        expect(result.success).toBe(true);
      });
    });
  });
});
