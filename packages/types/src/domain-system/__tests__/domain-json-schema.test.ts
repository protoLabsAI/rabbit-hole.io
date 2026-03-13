/**
 * JSON Domain Schema Tests
 *
 * Comprehensive tests for JSON domain validation, conversion, and type generation.
 */

import { describe, it, expect } from "vitest";

import {
  validateJSONDomain,
  convertJSONDomainToZod,
  generateTypeScriptTypes,
  propertyToZodSchema,
  type JSONDomainConfig,
  type JSONPropertyDefinition,
} from "../domain-json-schema";

describe("JSON Domain Validation", () => {
  it("validates complete valid domain", () => {
    const config: JSONDomainConfig = {
      $schema: "https://rabbit-hole.io/schemas/domain-v1.json",
      name: "test",
      displayName: "Test Domain",
      description: "Test description",
      version: "1.0.0",
      entities: {
        TestEntity: {
          uidPrefix: "test_entity",
          displayName: "Test Entity",
          properties: {
            name: {
              type: "string",
              required: false,
            },
          },
        },
      },
      ui: {
        color: "#FF0000",
        icon: "🧪",
      },
      relationships: ["RELATED_TO"],
    };

    const result = validateJSONDomain(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("test");
    }
  });

  it("validates minimal domain", () => {
    const config = {
      name: "minimal",
      displayName: "Minimal",
      description: "Minimal domain",
      entities: {
        Entity: {
          uidPrefix: "entity",
        },
      },
      ui: {
        color: "#000000",
        icon: "✨",
      },
    };

    const result = validateJSONDomain(config);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const config = {
      name: "incomplete",
      displayName: "Incomplete",
      // Missing description, entities, ui
    };

    const result = validateJSONDomain(config);
    expect(result.success).toBe(false);
  });

  it("rejects invalid color format", () => {
    const config = {
      name: "test",
      displayName: "Test",
      description: "Test",
      entities: {
        Entity: { uidPrefix: "entity" },
      },
      ui: {
        color: "red", // Invalid - must be hex
        icon: "🧪",
      },
    };

    const result = validateJSONDomain(config);
    expect(result.success).toBe(false);
  });

  it("validates inheritance with extendsFrom", () => {
    const config = {
      name: "child",
      displayName: "Child",
      description: "Child domain",
      extendsFrom: "parent",
      entities: {
        Entity: { uidPrefix: "entity" },
      },
      ui: {
        color: "#123456",
        icon: "👶",
      },
    };

    const result = validateJSONDomain(config);
    expect(result.success).toBe(true);
  });
});

describe("Property to Zod Conversion", () => {
  it("converts string property", () => {
    const prop: JSONPropertyDefinition = {
      type: "string",
      required: false,
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse("test").success).toBe(true);
    expect(schema.safeParse(123).success).toBe(false);
    expect(schema.safeParse(undefined).success).toBe(true); // Optional
  });

  it("converts string with minLength", () => {
    const prop: JSONPropertyDefinition = {
      type: "string",
      required: false,
      minLength: 5,
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse("short").success).toBe(true);
    expect(schema.safeParse("x").success).toBe(false);
  });

  it("converts string with maxLength", () => {
    const prop: JSONPropertyDefinition = {
      type: "string",
      required: false,
      maxLength: 10,
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse("okay").success).toBe(true);
    expect(schema.safeParse("this is too long").success).toBe(false);
  });

  it("converts string with pattern", () => {
    const prop: JSONPropertyDefinition = {
      type: "string",
      required: false,
      pattern: "^[A-Z][a-z]+$",
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse("Test").success).toBe(true);
    expect(schema.safeParse("test").success).toBe(false);
    expect(schema.safeParse("TEST").success).toBe(false);
  });

  it("converts number property", () => {
    const prop: JSONPropertyDefinition = {
      type: "number",
      required: false,
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse(123).success).toBe(true);
    expect(schema.safeParse("123").success).toBe(false);
  });

  it("converts number with min/max", () => {
    const prop: JSONPropertyDefinition = {
      type: "number",
      required: false,
      min: 0,
      max: 100,
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse(50).success).toBe(true);
    expect(schema.safeParse(-1).success).toBe(false);
    expect(schema.safeParse(101).success).toBe(false);
  });

  it("converts integer number", () => {
    const prop: JSONPropertyDefinition = {
      type: "number",
      required: false,
      integer: true,
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse(5).success).toBe(true);
    expect(schema.safeParse(5.5).success).toBe(false);
  });

  it("converts positive number", () => {
    const prop: JSONPropertyDefinition = {
      type: "number",
      required: false,
      positive: true,
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse(1).success).toBe(true);
    expect(schema.safeParse(0).success).toBe(false);
    expect(schema.safeParse(-1).success).toBe(false);
  });

  it("converts nonnegative number", () => {
    const prop: JSONPropertyDefinition = {
      type: "number",
      required: false,
      nonnegative: true,
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse(0).success).toBe(true);
    expect(schema.safeParse(1).success).toBe(true);
    expect(schema.safeParse(-1).success).toBe(false);
  });

  it("converts boolean property", () => {
    const prop: JSONPropertyDefinition = {
      type: "boolean",
      required: false,
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse(true).success).toBe(true);
    expect(schema.safeParse(false).success).toBe(true);
    expect(schema.safeParse("true").success).toBe(false);
  });

  it("converts date property (YYYY-MM-DD)", () => {
    const prop: JSONPropertyDefinition = {
      type: "date",
      required: false,
      format: "YYYY-MM-DD",
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse("2025-10-15").success).toBe(true);
    expect(schema.safeParse("2025-10-5").success).toBe(false); // Invalid format
    expect(schema.safeParse("10/15/2025").success).toBe(false);
  });

  it("converts array of strings", () => {
    const prop: JSONPropertyDefinition = {
      type: "array",
      required: false,
      items: "string",
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse(["a", "b", "c"]).success).toBe(true);
    expect(schema.safeParse([1, 2, 3]).success).toBe(false);
  });

  it("converts array with minItems/maxItems", () => {
    const prop: JSONPropertyDefinition = {
      type: "array",
      required: false,
      items: "string",
      minItems: 2,
      maxItems: 5,
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse(["a", "b"]).success).toBe(true);
    expect(schema.safeParse(["a"]).success).toBe(false); // Too few
    expect(schema.safeParse(["a", "b", "c", "d", "e", "f"]).success).toBe(
      false
    ); // Too many
  });

  it("converts array with enum items", () => {
    const prop: JSONPropertyDefinition = {
      type: "array",
      required: false,
      items: {
        enum: ["red", "green", "blue"],
      },
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse(["red", "blue"]).success).toBe(true);
    expect(schema.safeParse(["red", "yellow"]).success).toBe(false);
  });

  it("converts object property", () => {
    const prop: JSONPropertyDefinition = {
      type: "object",
      required: false,
      valueType: "string",
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse({ key: "value" }).success).toBe(true);
    expect(schema.safeParse({ key: 123 }).success).toBe(false);
  });

  it("converts enum property", () => {
    const prop: JSONPropertyDefinition = {
      type: "enum",
      required: false,
      values: ["small", "medium", "large"],
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse("medium").success).toBe(true);
    expect(schema.safeParse("extra-large").success).toBe(false);
  });

  it("makes property required when specified", () => {
    const prop: JSONPropertyDefinition = {
      type: "string",
      required: true,
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse("test").success).toBe(true);
    expect(schema.safeParse(undefined).success).toBe(false);
  });
});

describe("JSON to Zod Domain Conversion", () => {
  it("converts complete domain", () => {
    const jsonDomain: JSONDomainConfig = {
      name: "test",
      displayName: "Test",
      description: "Test domain",
      entities: {
        TestEntity: {
          uidPrefix: "test_entity",
          properties: {
            name: { type: "string", required: false },
            count: { type: "number", required: false, min: 0 },
          },
        },
      },
      ui: {
        color: "#FF0000",
        icon: "🧪",
      },
    };

    const result = convertJSONDomainToZod(jsonDomain);

    expect(result.entities.TestEntity).toBeDefined();
    expect(result.uidPrefixes.TestEntity).toBe("test_entity");
    expect(result.validators.test_entity).toBeDefined();

    // Test validator
    expect(result.validators.test_entity("test_entity:123")).toBe(true);
    expect(result.validators.test_entity("other:123")).toBe(false);
  });

  it("generates validators for all entities", () => {
    const jsonDomain: JSONDomainConfig = {
      name: "multi",
      displayName: "Multi",
      description: "Multi-entity domain",
      entities: {
        EntityA: { uidPrefix: "entity_a" },
        EntityB: { uidPrefix: "entity_b" },
        EntityC: { uidPrefix: "entity_c" },
      },
      ui: {
        color: "#123456",
        icon: "📦",
      },
    };

    const result = convertJSONDomainToZod(jsonDomain);

    expect(Object.keys(result.entities)).toHaveLength(3);
    expect(Object.keys(result.uidPrefixes)).toHaveLength(3);
    expect(Object.keys(result.validators)).toHaveLength(3);
  });
});

describe("TypeScript Type Generation", () => {
  it("generates interface for entity", () => {
    const jsonDomain: JSONDomainConfig = {
      name: "test",
      displayName: "Test Domain",
      description: "Test description",
      version: "1.0.0",
      author: "Test Author",
      entities: {
        Car_Model: {
          uidPrefix: "car_model",
          displayName: "Car Model",
          properties: {
            manufacturer: {
              type: "string",
              required: false,
              description: "Vehicle manufacturer",
            },
            year: {
              type: "number",
              required: false,
              integer: true,
              min: 1886,
            },
          },
        },
      },
      ui: {
        color: "#DC2626",
        icon: "🚗",
      },
    };

    const types = generateTypeScriptTypes(jsonDomain);

    // Check header
    expect(types).toContain("Test Domain Domain Types");
    expect(types).toContain("@version 1.0.0");
    expect(types).toContain("@author Test Author");

    // Check interface
    expect(types).toContain("export interface CarModel");
    expect(types).toContain('type: "Car_Model"');
    expect(types).toContain("manufacturer?: string | undefined");
    expect(types).toContain("year?: number | undefined");

    // Check union type
    expect(types).toContain("export type TestEntity = CarModel");
  });

  it("generates union type for multiple entities", () => {
    const jsonDomain: JSONDomainConfig = {
      name: "multi",
      displayName: "Multi",
      description: "Multiple entities",
      entities: {
        EntityA: { uidPrefix: "entity_a" },
        EntityB: { uidPrefix: "entity_b" },
      },
      ui: {
        color: "#123456",
        icon: "📦",
      },
    };

    const types = generateTypeScriptTypes(jsonDomain);

    expect(types).toContain("export interface EntityA");
    expect(types).toContain("export interface EntityB");
    expect(types).toContain("export type MultiEntity = EntityA | EntityB");
  });

  it("includes property descriptions as JSDoc", () => {
    const jsonDomain: JSONDomainConfig = {
      name: "test",
      displayName: "Test",
      description: "Test",
      entities: {
        Entity: {
          uidPrefix: "entity",
          properties: {
            field: {
              type: "string",
              required: false,
              description: "This is a field description",
            },
          },
        },
      },
      ui: {
        color: "#000000",
        icon: "✨",
      },
    };

    const types = generateTypeScriptTypes(jsonDomain);

    expect(types).toContain("/** This is a field description */");
  });

  it("handles complex property types", () => {
    const jsonDomain: JSONDomainConfig = {
      name: "complex",
      displayName: "Complex",
      description: "Complex types",
      entities: {
        Entity: {
          uidPrefix: "entity",
          properties: {
            tags: {
              type: "array",
              items: "string",
              required: false,
            },
            status: {
              type: "enum",
              values: ["active", "inactive"],
              required: false,
            },
            metadata: {
              type: "object",
              valueType: "any",
              required: false,
            },
          },
        },
      },
      ui: {
        color: "#123456",
        icon: "🔧",
      },
    };

    const types = generateTypeScriptTypes(jsonDomain);

    expect(types).toContain("tags?: string[] | undefined");
    expect(types).toContain('status?: "active" | "inactive" | undefined');
    expect(types).toContain("metadata?: Record<string, any> | undefined");
  });
});

describe("Error Handling", () => {
  it("provides detailed error for invalid property type", () => {
    const config = {
      name: "test",
      displayName: "Test",
      description: "Test",
      entities: {
        Entity: {
          uidPrefix: "entity",
          properties: {
            field: {
              type: "invalid_type", // Invalid
            },
          },
        },
      },
      ui: {
        color: "#000000",
        icon: "✨",
      },
    };

    const result = validateJSONDomain(config);
    expect(result.success).toBe(false);
  });

  it("validates enum must have values", () => {
    const config = {
      name: "test",
      displayName: "Test",
      description: "Test",
      entities: {
        Entity: {
          uidPrefix: "entity",
          properties: {
            status: {
              type: "enum",
              // Missing values
            },
          },
        },
      },
      ui: {
        color: "#000000",
        icon: "✨",
      },
    };

    const result = validateJSONDomain(config);
    expect(result.success).toBe(false);
  });

  it("validates uidPrefix is required", () => {
    const config = {
      name: "test",
      displayName: "Test",
      description: "Test",
      entities: {
        Entity: {
          // Missing uidPrefix
        },
      },
      ui: {
        color: "#000000",
        icon: "✨",
      },
    };

    const result = validateJSONDomain(config);
    expect(result.success).toBe(false);
  });
});

describe("Additional Property Type Coverage", () => {
  it("converts date with ISO8601 format", () => {
    const prop: JSONPropertyDefinition = {
      type: "date",
      required: false,
      format: "ISO8601",
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse("2025-10-15T10:30:00Z").success).toBe(true);
    expect(schema.safeParse("2025-10-15").success).toBe(false);
  });

  it("converts array of numbers", () => {
    const prop: JSONPropertyDefinition = {
      type: "array",
      required: false,
      items: "number",
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse([1, 2, 3]).success).toBe(true);
    expect(schema.safeParse(["a", "b"]).success).toBe(false);
  });

  it("converts array of booleans", () => {
    const prop: JSONPropertyDefinition = {
      type: "array",
      required: false,
      items: "boolean",
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse([true, false, true]).success).toBe(true);
    expect(schema.safeParse([1, 0]).success).toBe(false);
  });

  it("converts object with number valueType", () => {
    const prop: JSONPropertyDefinition = {
      type: "object",
      required: false,
      valueType: "number",
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse({ count: 5, total: 10 }).success).toBe(true);
    expect(schema.safeParse({ count: "five" }).success).toBe(false);
  });

  it("converts object with boolean valueType", () => {
    const prop: JSONPropertyDefinition = {
      type: "object",
      required: false,
      valueType: "boolean",
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse({ enabled: true, active: false }).success).toBe(
      true
    );
    expect(schema.safeParse({ enabled: "yes" }).success).toBe(false);
  });

  it("handles combined validation rules", () => {
    const prop: JSONPropertyDefinition = {
      type: "number",
      required: true,
      integer: true,
      min: 1,
      max: 100,
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse(50).success).toBe(true);
    expect(schema.safeParse(50.5).success).toBe(false); // Not integer
    expect(schema.safeParse(0).success).toBe(false); // Below min
    expect(schema.safeParse(101).success).toBe(false); // Above max
    expect(schema.safeParse(undefined).success).toBe(false); // Required
  });

  it("handles string with all validation rules", () => {
    const prop: JSONPropertyDefinition = {
      type: "string",
      required: true,
      minLength: 3,
      maxLength: 10,
      pattern: "^[a-z]+$",
    };

    const schema = propertyToZodSchema(prop);
    expect(schema.safeParse("hello").success).toBe(true);
    expect(schema.safeParse("hi").success).toBe(false); // Too short
    expect(schema.safeParse("verylongstring").success).toBe(false); // Too long
    expect(schema.safeParse("Hello").success).toBe(false); // Fails pattern
  });
});

describe("Domain Registry Integration", () => {
  it("registerFromJSON creates working domain", async () => {
    const { DomainRegistry } = await import("../domain-registry");

    const registry = new DomainRegistry();

    const jsonConfig: JSONDomainConfig = {
      name: "test_registry",
      displayName: "Test Registry Domain",
      description: "Testing registry integration",
      entities: {
        TestEntity: {
          uidPrefix: "test_entity",
          properties: {
            value: {
              type: "number",
              required: false,
              min: 0,
            },
          },
        },
      },
      ui: {
        color: "#FF0000",
        icon: "🧪",
      },
      relationships: ["RELATED_TO"],
    };

    await registry.registerFromJSON(jsonConfig);

    expect(registry.has("test_registry")).toBe(true);

    const domain = registry.getDomainConfig("test_registry");
    expect(domain).toBeDefined();
    expect(domain?.name).toBe("test_registry");
    expect(domain?.entities.TestEntity).toBeDefined();
  });

  it("registerFromJSON validates UIDs correctly", async () => {
    const { DomainRegistry } = await import("../domain-registry");

    const registry = new DomainRegistry();

    const jsonConfig: JSONDomainConfig = {
      name: "uid_test",
      displayName: "UID Test",
      description: "Testing UID validation",
      entities: {
        Product: {
          uidPrefix: "product",
        },
      },
      ui: {
        color: "#123456",
        icon: "📦",
      },
    };

    await registry.registerFromJSON(jsonConfig);

    const domain = registry.getDomainConfig("uid_test");
    expect(domain?.validators.product("product:123")).toBe(true);
    expect(domain?.validators.product("other:123")).toBe(false);
  });

  it("registerFromJSON rejects invalid config", async () => {
    const { DomainRegistry } = await import("../domain-registry");

    const registry = new DomainRegistry();

    const invalidConfig = {
      name: "invalid",
      // Missing required fields
    };

    await expect(registry.registerFromJSON(invalidConfig)).rejects.toThrow();
  });
});

describe("Complex Entity Schemas", () => {
  it("validates entity with multiple property types", () => {
    const jsonDomain: JSONDomainConfig = {
      name: "complex",
      displayName: "Complex",
      description: "Complex entity",
      entities: {
        ComplexEntity: {
          uidPrefix: "complex",
          properties: {
            name: { type: "string", required: true },
            count: { type: "number", integer: true, min: 0 },
            active: { type: "boolean" },
            tags: { type: "array", items: "string" },
            metadata: { type: "object", valueType: "any" },
            status: { type: "enum", values: ["draft", "published"] },
            created: { type: "date", format: "YYYY-MM-DD" },
          },
        },
      },
      ui: {
        color: "#123456",
        icon: "🔧",
      },
    };

    const result = convertJSONDomainToZod(jsonDomain);
    const schema = result.entities.ComplexEntity;

    // Valid entity
    expect(
      schema.safeParse({
        uid: "complex:1",
        type: "ComplexEntity",
        name: "Test",
        properties: {
          name: "Test Entity",
          count: 5,
          active: true,
          tags: ["tag1", "tag2"],
          metadata: { key: "value" },
          status: "published",
          created: "2025-10-15",
        },
      }).success
    ).toBe(true);

    // Invalid - missing required name
    expect(
      schema.safeParse({
        uid: "complex:2",
        type: "ComplexEntity",
        name: "Test",
        properties: {
          count: 5,
        },
      }).success
    ).toBe(false);
  });
});

describe("Full Domain Examples", () => {
  it("validates automotive domain structure", () => {
    const automotiveJSON: JSONDomainConfig = {
      name: "automotive",
      displayName: "Automotive",
      description: "Automotive industry - vehicles, manufacturers, models",
      version: "1.0.0",
      extendsFrom: "technology",
      entities: {
        Car_Model: {
          uidPrefix: "car_model",
          displayName: "Car Model",
          properties: {
            manufacturer: {
              type: "string",
              required: false,
            },
            year: {
              type: "number",
              required: false,
              integer: true,
              min: 1886,
              max: 2100,
            },
            body_type: {
              type: "enum",
              required: false,
              values: ["sedan", "suv", "truck", "coupe", "hatchback"],
            },
          },
        },
      },
      ui: {
        color: "#DC2626",
        icon: "🚗",
        entityIcons: {
          Car_Model: "🚙",
        },
      },
      relationships: ["MANUFACTURED_BY", "COMPETES_WITH"],
      author: "Test Author",
      tags: ["vehicles", "transportation"],
    };

    const result = validateJSONDomain(automotiveJSON);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.extendsFrom).toBe("technology");
      expect(result.data.ui.entityIcons?.Car_Model).toBe("🚙");
      expect(result.data.relationships).toContain("MANUFACTURED_BY");
      expect(result.data.author).toBe("Test Author");
      expect(result.data.tags).toContain("vehicles");
    }
  });
});
