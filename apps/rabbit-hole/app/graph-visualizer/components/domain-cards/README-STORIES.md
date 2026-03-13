# Domain Card Stories

Interactive Storybook documentation for domain card configuration.

## Important Note

**Domains must be registered** before they can be used in stories. All story files use idempotent registration:

```typescript
import { biologicalDomainConfig } from "@proto/types/domains/biological";
import { socialDomainConfig } from "@proto/types/domains/social";
import { automotiveDomainConfig } from "../../../../custom-domains/automotive";
import { domainRegistry } from "@proto/types";

if (typeof window !== "undefined") {
  try {
    domainRegistry.registerIfNeeded(biologicalDomainConfig);
    domainRegistry.registerIfNeeded(socialDomainConfig);
    domainRegistry.registerIfNeeded(automotiveDomainConfig);
  } catch (e) {
    console.warn("Domain registration error:", e);
  }
}
```

**Note**: `registerIfNeeded()` is idempotent - it only registers if not already registered, preventing duplicate warnings.

## Stories in This Directory

### DomainCards.stories.tsx

Basic examples with configuration display:

- Biological Domain (Bengal Tiger)
- Social Domain (Ada Lovelace)
- Automotive Domain (Tesla Model S)
- Size Comparison (compact/standard/detailed)
- Field Types Showcase

### DomainCardPlayground.stories.tsx

**Interactive configuration editor** - build and test configs in real-time:

- Live preview
- Section editor
- Field editor
- Generated code output
- Domain switcher with presets

### DomainCardProduction.stories.tsx

Production examples with real domain data:

- Multiple biological entities
- Multiple social entities
- Multiple automotive entities
- Conservation status variations
- Status badge variations
- Side-by-side comparisons

## Running Storybook

```bash
pnpm storybook
```

Navigate to: **Domain System > Domain Cards**

## Quick Start

1. **Learn**: View `DomainCards.stories.tsx` examples
2. **Prototype**: Use `DomainCardPlayground.stories.tsx` interactive editor
3. **Test**: Check `DomainCardProduction.stories.tsx` with real data
4. **Implement**: Copy generated config to your domain

## Documentation

- [Domain Card Configuration Guide](../../../../docs/developer/domain-card-configuration.md)
- [Card Configuration Patterns](../../../../docs/developer/CARD_CONFIGURATION_PATTERNS.md)
- [Custom Domains Guide](../../../../custom-domains/README.md)
