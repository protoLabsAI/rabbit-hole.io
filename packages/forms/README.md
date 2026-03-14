# Domain Forms System

## Overview

Complete form system for all 77 entity types across 12 domains with Zod validation and Storybook integration.

## Architecture

### Core Components

- **`DomainFormRegistry`** - Maps entity types to schemas and form configurations
- **`EntityForm`** - Base form component with react-hook-form + zod validation
- **`DynamicFormFields`** - Renders fields dynamically based on schema
- **`DomainFormSelector`** - Cascading domain and entity type selection form
- **`MockDataGenerator`** - Generates test data for all scenarios

### Key Features

- ✅ Dynamic form generation from Zod schemas
- ✅ 77 entity types across 12 domains supported
- ✅ **Auto-generated UIDs** from entity names (no manual entry needed)
- ✅ **Required fields only mode** for quick entity creation
- ✅ **Field blacklisting** with schema validation (exclude unwanted fields)
- ✅ **System field filtering** (UID, type automatically managed)
- ✅ shadcn/ui components with consistent styling
- ✅ Form validation with real-time feedback
- ✅ Mock data generation for testing
- ✅ Comprehensive Storybook integration
- ✅ TypeScript type safety throughout

## Usage

### Basic Entity Form

```typescript
import { EntityForm } from '@proto/forms';

function MyComponent() {
  return (
    <EntityForm
      entityType="Person"
      mode="create"
      onSubmit={async (data) => {
        console.log('Submitted:', data);
      }}
    />
  );
}
```

### Required Fields Only

```typescript
import { EntityForm, QuickEntityForm } from '@proto/forms';

// Show only essential required fields
<EntityForm
  entityType="Person"
  mode="create"
  requiredOnly={true}
  onSubmit={handleSubmit}
/>

// QuickEntityForm uses requiredOnly=true by default
<QuickEntityForm
  entityType="Disease"
  onSubmit={handleSubmit}
/>
```

### Field Blacklisting

```typescript
import { EntityForm } from '@proto/forms';

// Exclude sensitive or unnecessary fields
<EntityForm
  entityType="Person"
  mode="create"
  blacklistFields={["bio", "socialMedia", "contactInfo", "netWorth", "politicalParty"]}
  onSubmit={handleSubmit}
/>

// Blacklist validation - throws error if fields don't exist
<EntityForm
  entityType="Disease"
  blacklistFields={["invalidField"]} // ❌ Error: field doesn't exist in Disease schema
  onSubmit={handleSubmit}
/>
```

### Domain Form Selector

```typescript
import { DomainFormSelector, QuickDomainFormSelector } from '@proto/forms';

// Cascading domain and entity selection
<DomainFormSelector
  defaultDomain="social"
  defaultEntityType="Person"
  onSubmit={async (data) => {
    await createEntity(data);
  }}
/>

// Quick version with required fields only
<QuickDomainFormSelector
  defaultDomain="medical"
  onSubmit={handleSubmit}
/>
```

### Direct Entity Form Usage

```typescript
import { EntityForm } from '@proto/forms';

function CreatePerson() {
  return (
    <EntityForm
      entityType="Person"
      mode="create"
      onSubmit={async (data) => {
        // Handle person creation - UID auto-generated
        await createPerson(data);
      }}
    />
  );
}
```

### Mock Data Generation

```typescript
import { generateMockData, generateAllScenarios } from "@proto/forms";

// Generate complete mock data for Person
const mockPerson = generateMockData("Person", "complete");

// Generate all scenarios (minimal, complete, invalid, edge-case)
const allScenarios = generateAllScenarios("Disease");
```

## Auto-Generated Fields

**System-Managed Fields** (not shown in forms):

- **UID**: Auto-generated from entity name (`person:john_doe`)
- **Type**: Set from entity type selection (`Person`, `Disease`, etc.)

**UID Generation Rules** (uses existing `generateEntityUID` from types package):

- Format: `{prefix}:{normalized_name}` (prefix varies by entity type)
- Name normalization: lowercase, special chars→underscores, truncated to 50 chars
- Examples:
  - "John Doe" → `person:john_doe`
  - "Tesla Inc." → `org:tesla_inc`
  - "Apple Inc. & Co.!" → `org:apple_inc_co`

## Field Blacklisting

**Exclude Unwanted Fields**: Use `blacklistFields` to hide specific fields from forms.

**Validation**: Throws error if blacklisted field doesn't exist in entity schema - prevents typos.

**Use Cases**:

- Hide sensitive fields (`socialMedia`, `contactInfo`, `netWorth`)
- Simplify forms for specific workflows
- Remove deprecated or unused fields
- Custom field visibility per use case

## Form Field Types

The system automatically maps Zod schema fields to appropriate form components:

| Zod Type      | Form Component | Example                    |
| ------------- | -------------- | -------------------------- |
| `z.string()`  | Input          | Name, description          |
| `z.number()`  | Input (number) | Age, price                 |
| `z.boolean()` | Checkbox       | Active status              |
| `z.enum()`    | Select         | Gender, status             |
| `z.array()`   | Tag input      | Skills, aliases            |
| `z.object()`  | JSON textarea  | Social media, contact info |
| Date fields   | Date input     | Birth date, created date   |

## Domain Coverage

All 12 domains supported with specialized forms:

- **Social** (6 entities) - Person, Organization, Platform, Movement, Event, Media
- **Medical** (11 entities) - Disease, Drug, Treatment, Symptom, Condition, etc.
- **Technology** (7 entities) - Software, Hardware, Database, API, Protocol, etc.
- **Geographic** (4 entities) - Country, City, Region, Continent
- **Economic** (6 entities) - Currency, Market, Industry, Commodity, etc.
- **Biological** (6 entities) - Animal, Plant, Fungi, Species, Insect, Ecosystem
- **Infrastructure** (7 entities) - Building, Bridge, Road, Airport, Port, etc.
- **Transportation** (6 entities) - Vehicle, Aircraft, Ship, Train, Route, Station
- **Astronomical** (4 entities) - Planet, Star, Galaxy, Solar System
- **Legal** (7 entities) - Law, Court, Case, Regulation, Patent, License, Contract
- **Academic** (6 entities) - University, Research, Publication, Journal, Course, Degree
- **Cultural** (7 entities) - Book, Film, Song, Art, Language, Religion, Tradition

## Storybook Integration

Comprehensive stories available at `http://localhost:6006`:

- **Forms/Core/EntityForm** - Base component with all entity types and advanced features
- **Forms/Core/DomainFormSelector** - Cascading domain and entity type selection
- Individual stories for each domain and entity type (can be added as needed)

## Adding New Entity Types

1. Add schema to appropriate domain in `packages/types/src/domains/`
2. Export from domain `index.ts`
3. Forms automatically generate - no additional code needed!

## Development

```bash
# Build types package
pnpm --filter @proto/types build

# Start Storybook
pnpm storybook

# Run in development
pnpm dev
```

## Integration Points

- **Atlas Integration** - Replace AddEntityForm entity creation
- **API Integration** - Connect to existing entity endpoints
- **Graph Updates** - Form submissions update knowledge graph
- **Validation** - Server-side validation with same Zod schemas
