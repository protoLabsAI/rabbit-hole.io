# Modular Schema Architecture Design

## 🎯 Goal

Transform the monolithic 6k+ line `validation-schemas.ts` into a maintainable, domain-based modular system.

## 📁 Proposed Structure

```
packages/types/src/
  domains/
    core/                           # 🔧 Foundation schemas
      base-entity.schema.ts         # EntitySchema + universal properties
      geospatial.schema.ts          # Coordinate and location schemas
      temporal.schema.ts            # Date and time schemas
      relationship.schema.ts        # All relationship types + validation
      evidence.schema.ts            # Evidence, Content, File schemas
      index.ts                      # Exports all core schemas

    biological/                     # 🧬 Life sciences (6 entities)
      animal.schema.ts              # AnimalEntitySchema
      plant.schema.ts               # PlantEntitySchema
      fungi.schema.ts               # FungiEntitySchema
      species.schema.ts             # SpeciesEntitySchema
      insect.schema.ts              # InsectEntitySchema
      ecosystem.schema.ts           # EcosystemEntitySchema
      index.ts                      # Domain exports + UID mappings

    economic/                       # 💰 Economic systems (6 entities)
      currency.schema.ts
      market.schema.ts
      company.schema.ts
      industry.schema.ts
      commodity.schema.ts
      investment.schema.ts
      index.ts

    infrastructure/                 # 🏗️ Built environment (7 entities)
      building.schema.ts
      bridge.schema.ts
      road.schema.ts
      airport.schema.ts
      port.schema.ts
      utility.schema.ts
      pipeline.schema.ts
      index.ts

    # ... other domains following same pattern

  entity-schema-registry.ts         # 🏭 Factory combining all domains
  validation-schemas.ts             # 📤 Clean main export (~200 lines)
```

## 🔧 Implementation Strategy

### 1. Domain Schema Pattern

Each domain folder follows this pattern:

```typescript
// domains/biological/animal.schema.ts
import { EntitySchema } from "../core";

export const AnimalEntitySchema = EntitySchema.extend({
  type: z.literal("Animal"),
  properties: z
    .object({
      scientificName: z.string().optional(),
      diet: z.enum(["carnivore", "herbivore", "omnivore"]).optional(),
      // ... animal-specific properties
    })
    .optional(),
});

export const ANIMAL_UID_PREFIX = "animal";
export const AnimalUIDValidator = (uid: string) => uid.startsWith("animal:");
```

```typescript
// domains/biological/index.ts
export * from "./animal.schema";
export * from "./plant.schema";
export * from "./fungi.schema";
// ...

export const BIOLOGICAL_ENTITY_SCHEMAS = {
  Animal: AnimalEntitySchema,
  Plant: PlantEntitySchema,
  Fungi: FungiEntitySchema,
  // ...
};

export const BIOLOGICAL_UID_VALIDATORS = {
  animal: AnimalUIDValidator,
  plant: PlantUIDValidator,
  fungi: FungiUIDValidator,
  // ...
};
```

### 2. Registry Factory Pattern

```typescript
// entity-schema-registry.ts
import { BIOLOGICAL_ENTITY_SCHEMAS } from "./domains/biological";
import { ECONOMIC_ENTITY_SCHEMAS } from "./domains/economic";
// ...

export class EntitySchemaRegistry {
  private static instance: EntitySchemaRegistry;
  private schemas = new Map();
  private uidValidators = new Map();

  static getInstance() {
    if (!this.instance) {
      this.instance = new EntitySchemaRegistry();
    }
    return this.instance;
  }

  private constructor() {
    this.registerDomain(
      "biological",
      BIOLOGICAL_ENTITY_SCHEMAS,
      BIOLOGICAL_UID_VALIDATORS
    );
    this.registerDomain(
      "economic",
      ECONOMIC_ENTITY_SCHEMAS,
      ECONOMIC_UID_VALIDATORS
    );
    // ...
  }

  registerDomain(
    name: string,
    schemas: Record<string, any>,
    validators: Record<string, Function>
  ) {
    Object.entries(schemas).forEach(([type, schema]) => {
      this.schemas.set(type, schema);
    });
    Object.entries(validators).forEach(([prefix, validator]) => {
      this.uidValidators.set(prefix, validator);
    });
  }

  getSchema(entityType: string) {
    return this.schemas.get(entityType);
  }

  validateUID(uid: string): boolean {
    const prefix = uid.split(":")[0];
    const validator = this.uidValidators.get(prefix);
    return validator ? validator(uid) : false;
  }

  getAllEntityTypes(): string[] {
    return Array.from(this.schemas.keys());
  }
}
```

### 3. Clean Main Export

```typescript
// validation-schemas.ts (~200 lines instead of 6k)
import { EntitySchemaRegistry } from "./entity-schema-registry";

const registry = EntitySchemaRegistry.getInstance();

export const EntityTypeEnum = z.enum(registry.getAllEntityTypes());

export function validateRabbitHoleBundle(data: unknown): ValidationResult {
  // Same validation logic, but using registry
}

// Export all domain schemas for direct access
export * from "./domains/biological";
export * from "./domains/economic";
// ...
```

## ✅ Benefits

1. **Easy Entity Addition**:

   ```bash
   # Add new entity:
   # 1. Create domains/biological/microbe.schema.ts
   # 2. Add export to domains/biological/index.ts
   # 3. Done! No touching massive files
   ```

2. **Domain Expertise**:
   - Biologists maintain `domains/biological/`
   - Economists maintain `domains/economic/`
   - Clear ownership and specialization

3. **Maintainable**:
   - ~200 line files instead of 6k monolith
   - Easy to find specific entities
   - Reduced merge conflicts

4. **Testable**:

   ```typescript
   // Test each domain independently
   import { BIOLOGICAL_ENTITY_SCHEMAS } from "./domains/biological";
   ```

5. **Scalable**:
   - New domains: just add folder
   - Registry auto-discovers new schemas
   - No complex central coordination

## 📋 Migration Plan

1. **Write comprehensive tests** ✅ (prevent breaking changes)
2. **Create core/ schemas** (extract base schemas)
3. **Implement biological/ domain** (proof of concept)
4. **Migrate one domain at a time** (gradual, safe)
5. **Update imports across codebase** (automated)
6. **Remove monolithic file** (final step)

## 🧪 Testing Strategy

- Pre-refactor tests ensure current behavior captured
- Domain-specific tests for each module
- Integration tests for cross-domain functionality
- Rabbit example validation throughout migration

This design maintains all current functionality while making the system much more maintainable and extensible.
