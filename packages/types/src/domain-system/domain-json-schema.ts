/**
 * JSON Domain Schema - Validation and Conversion
 *
 * Validates JSON domain configurations and converts them to runtime Zod schemas.
 * Enables domain definitions in JSON format with build-time TypeScript generation.
 */

import { z } from "zod";

// ==================== JSON Property Type Schemas ====================

/**
 * Base property definition in JSON format
 */
const BasePropertySchema = z.object({
  type: z.enum([
    "string",
    "number",
    "boolean",
    "date",
    "array",
    "object",
    "enum",
  ]),
  required: z.boolean().optional().default(false),
  description: z.string().optional(),
});

/**
 * String property with validation rules
 */
const StringPropertySchema = BasePropertySchema.extend({
  type: z.literal("string"),
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().positive().optional(),
  pattern: z.string().optional(), // regex pattern as string
});

/**
 * Number property with validation rules
 */
const NumberPropertySchema = BasePropertySchema.extend({
  type: z.literal("number"),
  min: z.number().optional(),
  max: z.number().optional(),
  integer: z.boolean().optional().default(false),
  positive: z.boolean().optional().default(false),
  nonnegative: z.boolean().optional().default(false),
});

/**
 * Boolean property
 */
const BooleanPropertySchema = BasePropertySchema.extend({
  type: z.literal("boolean"),
});

/**
 * Date property with regex validation
 */
const DatePropertySchema = BasePropertySchema.extend({
  type: z.literal("date"),
  format: z.enum(["YYYY-MM-DD", "ISO8601"]).optional().default("YYYY-MM-DD"),
});

/**
 * Array property with item type
 */
const ArrayPropertySchema = BasePropertySchema.extend({
  type: z.literal("array"),
  items: z.union([
    z.literal("string"),
    z.literal("number"),
    z.literal("boolean"),
    z.object({ enum: z.array(z.string()) }),
  ]),
  minItems: z.number().int().nonnegative().optional(),
  maxItems: z.number().int().positive().optional(),
});

/**
 * Object/Record property
 */
const ObjectPropertySchema = BasePropertySchema.extend({
  type: z.literal("object"),
  valueType: z
    .enum(["string", "number", "boolean", "any"])
    .optional()
    .default("any"),
});

/**
 * Enum property with allowed values
 */
const EnumPropertySchema = BasePropertySchema.extend({
  type: z.literal("enum"),
  values: z.array(z.string()).min(1),
});

/**
 * Union of all property types
 */
const PropertyDefinitionSchema = z.discriminatedUnion("type", [
  StringPropertySchema,
  NumberPropertySchema,
  BooleanPropertySchema,
  DatePropertySchema,
  ArrayPropertySchema,
  ObjectPropertySchema,
  EnumPropertySchema,
]);

// ==================== Entity Definition Schema ====================

/**
 * Entity definition in JSON format
 */
const EntityDefinitionSchema = z.object({
  uidPrefix: z.string().min(1),
  displayName: z.string().min(1).optional(),
  properties: z.record(z.string(), PropertyDefinitionSchema).optional(),
});

// ==================== JSON Domain Schema ====================

/**
 * Complete JSON domain configuration schema
 */
export const JSONDomainSchema = z.object({
  $schema: z
    .string()
    .optional()
    .default("https://rabbit-hole.io/schemas/domain-v1.json"),
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().min(1),
  version: z.string().optional().default("1.0.0"),
  extendsFrom: z.string().optional(),

  entities: z.record(z.string(), EntityDefinitionSchema),

  ui: z.object({
    color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be hex format"),
    icon: z.string().min(1),
    entityIcons: z.record(z.string(), z.string()).optional(),
    entityColors: z
      .record(z.string(), z.string().regex(/^#[0-9A-F]{6}$/i))
      .optional(),
  }),

  relationships: z.array(z.string()).optional().default([]),

  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// ==================== Type Exports ====================

export type JSONPropertyDefinition = z.infer<typeof PropertyDefinitionSchema>;
export type JSONEntityDefinition = z.infer<typeof EntityDefinitionSchema>;
export type JSONDomainConfig = z.infer<typeof JSONDomainSchema>;

// ==================== Validation Functions ====================

/**
 * Validate JSON domain configuration
 */
export function validateJSONDomain(
  config: unknown
):
  | { success: true; data: JSONDomainConfig }
  | { success: false; error: z.ZodError } {
  const result = JSONDomainSchema.safeParse(config);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ==================== JSON to Zod Conversion ====================

/**
 * Convert JSON property definition to Zod schema
 */
export function propertyToZodSchema(
  propDef: JSONPropertyDefinition
): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (propDef.type) {
    case "string": {
      schema = z.string();
      if (propDef.minLength !== undefined) {
        schema = (schema as z.ZodString).min(propDef.minLength);
      }
      if (propDef.maxLength !== undefined) {
        schema = (schema as z.ZodString).max(propDef.maxLength);
      }
      if (propDef.pattern) {
        schema = (schema as z.ZodString).regex(new RegExp(propDef.pattern));
      }
      break;
    }

    case "number": {
      schema = z.number();
      if (propDef.integer) {
        schema = (schema as z.ZodNumber).int();
      }
      if (propDef.positive) {
        schema = (schema as z.ZodNumber).positive();
      }
      if (propDef.nonnegative) {
        schema = (schema as z.ZodNumber).nonnegative();
      }
      if (propDef.min !== undefined) {
        schema = (schema as z.ZodNumber).min(propDef.min);
      }
      if (propDef.max !== undefined) {
        schema = (schema as z.ZodNumber).max(propDef.max);
      }
      break;
    }

    case "boolean":
      schema = z.boolean();
      break;

    case "date": {
      const format = propDef.format || "YYYY-MM-DD";
      if (format === "YYYY-MM-DD") {
        schema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
      } else {
        schema = z.string().datetime();
      }
      break;
    }

    case "array": {
      let itemSchema: z.ZodTypeAny;
      if (typeof propDef.items === "string") {
        switch (propDef.items) {
          case "string":
            itemSchema = z.string();
            break;
          case "number":
            itemSchema = z.number();
            break;
          case "boolean":
            itemSchema = z.boolean();
            break;
          default:
            itemSchema = z.any();
        }
      } else {
        itemSchema = z.enum(propDef.items.enum as [string, ...string[]]);
      }

      schema = z.array(itemSchema);
      if (propDef.minItems !== undefined) {
        schema = (schema as z.ZodArray<any>).min(propDef.minItems);
      }
      if (propDef.maxItems !== undefined) {
        schema = (schema as z.ZodArray<any>).max(propDef.maxItems);
      }
      break;
    }

    case "object": {
      const valueType = propDef.valueType || "any";
      let valueSchema: z.ZodTypeAny;
      switch (valueType) {
        case "string":
          valueSchema = z.string();
          break;
        case "number":
          valueSchema = z.number();
          break;
        case "boolean":
          valueSchema = z.boolean();
          break;
        default:
          valueSchema = z.any();
      }
      schema = z.record(z.string(), valueSchema);
      break;
    }

    case "enum":
      schema = z.enum(propDef.values as [string, ...string[]]);
      break;

    default:
      schema = z.any();
  }

  // Make optional if not required
  if (!propDef.required) {
    schema = schema.optional();
  }

  return schema;
}

/**
 * Convert JSON entity definition to Zod schema
 */
export function entityToZodSchema(
  entityType: string,
  entityDef: JSONEntityDefinition
): z.ZodObject<any> {
  const EntitySchema = z.object({
    uid: z.string().min(1),
    type: z.string(),
    name: z.string().min(1),
    aliases: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    properties: z.record(z.string(), z.any()).optional(),
  });

  const propertiesShape: Record<string, z.ZodTypeAny> = {};

  if (entityDef.properties) {
    Object.entries(entityDef.properties).forEach(([propName, propDef]) => {
      propertiesShape[propName] = propertyToZodSchema(
        propDef as JSONPropertyDefinition
      );
    });
  }

  return EntitySchema.extend({
    type: z.literal(entityType),
    properties: z.object(propertiesShape).optional(),
  });
}

/**
 * Convert entire JSON domain to runtime Zod schemas
 */
export function convertJSONDomainToZod(jsonDomain: JSONDomainConfig): {
  entities: Record<string, z.ZodSchema>;
  uidPrefixes: Record<string, string>;
  validators: Record<string, (uid: string) => boolean>;
} {
  const entities: Record<string, z.ZodSchema> = {};
  const uidPrefixes: Record<string, string> = {};
  const validators: Record<string, (uid: string) => boolean> = {};

  Object.entries(jsonDomain.entities).forEach(([entityType, entityDef]) => {
    const typedEntityDef = entityDef as JSONEntityDefinition;
    entities[entityType] = entityToZodSchema(entityType, typedEntityDef);
    uidPrefixes[entityType] = typedEntityDef.uidPrefix;
    validators[typedEntityDef.uidPrefix] = (uid: string) =>
      uid.startsWith(`${typedEntityDef.uidPrefix}:`);
  });

  return { entities, uidPrefixes, validators };
}

// ==================== TypeScript Type Generation ====================

/**
 * Convert JSON property definition to TypeScript type string
 */
function propertyToTypeString(propDef: JSONPropertyDefinition): string {
  let typeStr: string;

  switch (propDef.type) {
    case "string":
      typeStr = "string";
      break;
    case "number":
      typeStr = "number";
      break;
    case "boolean":
      typeStr = "boolean";
      break;
    case "date":
      typeStr = "string"; // Dates are ISO strings
      break;
    case "array": {
      let itemType: string;
      if (typeof propDef.items === "string") {
        itemType = propDef.items;
      } else {
        itemType = propDef.items.enum.map((v) => `"${v}"`).join(" | ");
      }
      typeStr = `${itemType}[]`;
      break;
    }
    case "object": {
      const valueType = propDef.valueType || "any";
      typeStr = `Record<string, ${valueType}>`;
      break;
    }
    case "enum":
      typeStr = propDef.values.map((v) => `"${v}"`).join(" | ");
      break;
    default:
      typeStr = "any";
  }

  return propDef.required ? typeStr : `${typeStr} | undefined`;
}

/**
 * Generate TypeScript interface for an entity
 */
function generateEntityInterface(
  entityType: string,
  entityDef: JSONEntityDefinition
): string {
  const lines: string[] = [];
  const interfaceName = entityType.replace(/_/g, "");

  lines.push(`export interface ${interfaceName} {`);
  lines.push(`  uid: string;`);
  lines.push(`  type: "${entityType}";`);
  lines.push(`  name: string;`);
  lines.push(`  aliases?: string[];`);
  lines.push(`  tags?: string[];`);

  if (entityDef.properties && Object.keys(entityDef.properties).length > 0) {
    lines.push(`  properties?: {`);
    Object.entries(entityDef.properties).forEach(([propName, propDef]) => {
      const typedPropDef = propDef as JSONPropertyDefinition;
      const typeStr = propertyToTypeString(typedPropDef);
      const optional = typedPropDef.required ? "" : "?";
      const comment = typedPropDef.description
        ? `    /** ${typedPropDef.description} */\n`
        : "";
      lines.push(`${comment}    ${propName}${optional}: ${typeStr};`);
    });
    lines.push(`  };`);
  }

  lines.push(`}`);
  return lines.join("\n");
}

/**
 * Generate complete TypeScript declaration file from JSON domain
 */
export function generateTypeScriptTypes(jsonDomain: JSONDomainConfig): string {
  const lines: string[] = [];

  // Header
  lines.push(`/**`);
  lines.push(` * ${jsonDomain.displayName} Domain Types`);
  lines.push(` * Generated from JSON domain configuration`);
  lines.push(` * `);
  lines.push(` * @description ${jsonDomain.description}`);
  if (jsonDomain.version) {
    lines.push(` * @version ${jsonDomain.version}`);
  }
  if (jsonDomain.author) {
    lines.push(` * @author ${jsonDomain.author}`);
  }
  lines.push(` */`);
  lines.push("");

  // Generate entity interfaces
  Object.entries(jsonDomain.entities).forEach(([entityType, entityDef]) => {
    lines.push(
      generateEntityInterface(entityType, entityDef as JSONEntityDefinition)
    );
    lines.push("");
  });

  // Generate union type
  const entityTypes = Object.keys(jsonDomain.entities);
  if (entityTypes.length > 0) {
    const unionName = jsonDomain.name
      .split(/[-_]/)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
    const interfaceNames = entityTypes.map((t) => t.replace(/_/g, ""));
    lines.push(
      `export type ${unionName}Entity = ${interfaceNames.join(" | ")};`
    );
    lines.push("");
  }

  return lines.join("\n");
}
