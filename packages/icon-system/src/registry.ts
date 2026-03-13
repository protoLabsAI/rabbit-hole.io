import { IconDefinition, IconDefinitionSchema, IconCategory } from "./types";

/**
 * IconRegistry - Centralized icon management
 */
export class IconRegistry {
  private icons: Map<string, IconDefinition> = new Map();
  private aliases: Map<string, string> = new Map();

  /**
   * Register an icon definition
   */
  register(definition: IconDefinition): void {
    const validated = IconDefinitionSchema.parse(definition);
    this.icons.set(validated.name, validated);

    // Register aliases
    if (validated.aliases) {
      validated.aliases.forEach((alias) => {
        this.aliases.set(alias, validated.name);
      });
    }
  }

  /**
   * Register multiple icons
   */
  registerMany(definitions: IconDefinition[]): void {
    definitions.forEach((def) => this.register(def));
  }

  /**
   * Get icon definition by name or alias
   */
  get(nameOrAlias: string): IconDefinition | undefined {
    // Try direct lookup
    const icon = this.icons.get(nameOrAlias);
    if (icon) return icon;

    // Try alias lookup
    const canonicalName = this.aliases.get(nameOrAlias);
    if (canonicalName) {
      return this.icons.get(canonicalName);
    }

    return undefined;
  }

  /**
   * Check if icon exists
   */
  has(nameOrAlias: string): boolean {
    return this.get(nameOrAlias) !== undefined;
  }

  /**
   * List all registered icon names
   */
  listNames(): string[] {
    return Array.from(this.icons.keys());
  }

  /**
   * List all icons in a category
   */
  listByCategory(category: IconCategory): IconDefinition[] {
    return Array.from(this.icons.values()).filter(
      (icon) => icon.category === category
    );
  }

  /**
   * Search icons by name, alias, or description
   */
  search(query: string): IconDefinition[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.icons.values()).filter(
      (icon) =>
        icon.name.toLowerCase().includes(lowerQuery) ||
        icon.identifier.toLowerCase().includes(lowerQuery) ||
        icon.aliases?.some((alias) =>
          alias.toLowerCase().includes(lowerQuery)
        ) ||
        icon.description?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get all categories with icon counts
   */
  getCategoryCounts(): Record<IconCategory, number> {
    const counts: Record<string, number> = {};
    Array.from(this.icons.values()).forEach((icon) => {
      counts[icon.category] = (counts[icon.category] || 0) + 1;
    });
    return counts as Record<IconCategory, number>;
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.icons.clear();
    this.aliases.clear();
  }
}

// Global singleton instance
export const iconRegistry = new IconRegistry();
