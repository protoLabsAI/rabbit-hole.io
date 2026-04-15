/**
 * Domain Builder - Fluent API for Domain Creation
 *
 * Type-safe builder pattern for creating domain configurations.
 */

import { z } from "zod";

import type {
  DomainConfig,
  DomainUIConfig,
  DomainThemeBindings,
} from "./domain-config.interface";

/**
 * Type-safe domain builder with fluent API
 *
 * @example
 * const domain = new DomainBuilder()
 *   .withName("automotive")
 *   .withEntities({ Car_Model: CarModelSchema })
 *   .withUI({ color: "#DC2626", icon: "🚗" })
 *   .build();
 */
export class DomainBuilder<_TName extends string = string> {
  private config: Partial<DomainConfig> = {
    category: "custom",
  };

  withName<T extends string>(name: T): DomainBuilder<T> {
    this.config.name = name;
    this.config.displayName = name.charAt(0).toUpperCase() + name.slice(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this as any;
  }

  withDisplayName(displayName: string): this {
    this.config.displayName = displayName;
    return this;
  }

  withDescription(description: string): this {
    this.config.description = description;
    return this;
  }

  withCategory(category: "core" | "custom" | "extended"): this {
    this.config.category = category;
    return this;
  }

  withEntities<T extends Record<string, z.ZodTypeAny>>(entities: T): this {
    this.config.entities = entities;

    // Auto-generate UID prefixes from entity names if not provided
    if (!this.config.uidPrefixes) {
      this.config.uidPrefixes = Object.keys(entities).reduce(
        (acc, key) => {
          acc[key] = key.toLowerCase().replace(/_/g, "_");
          return acc;
        },
        {} as Record<string, string>
      );
    }

    return this;
  }

  withUIDPrefixes(prefixes: Record<string, string>): this {
    this.config.uidPrefixes = prefixes;
    return this;
  }

  withValidators(validators: Record<string, (uid: string) => boolean>): this {
    this.config.validators = validators;
    return this;
  }

  withRelationships(relationships: string[]): this {
    this.config.relationships = relationships;
    return this;
  }

  withUI(ui: DomainUIConfig): this {
    this.config.ui = ui;
    return this;
  }

  extendsFrom(parentDomain: string): this {
    this.config.extendsFrom = parentDomain;
    return this;
  }

  withThemeIntegration(bindings: DomainThemeBindings): this {
    this.config.themeBindings = bindings;
    return this;
  }

  withVersion(version: string): this {
    this.config.version = version;
    return this;
  }

  withAuthor(author: string): this {
    this.config.author = author;
    return this;
  }

  withTags(tags: string[]): this {
    this.config.tags = tags;
    return this;
  }

  build(): DomainConfig {
    // Validate required fields
    if (!this.config.name) {
      throw new Error("Domain name is required");
    }
    if (!this.config.displayName) {
      throw new Error("Domain displayName is required");
    }
    if (!this.config.description) {
      throw new Error("Domain description is required");
    }
    if (!this.config.entities) {
      throw new Error("Domain entities are required");
    }
    if (!this.config.ui) {
      throw new Error("Domain UI config is required");
    }

    // Auto-generate validators if not provided
    if (!this.config.validators && this.config.uidPrefixes) {
      this.config.validators = this.generateValidators();
    }

    // Default relationships to empty array
    if (!this.config.relationships) {
      this.config.relationships = [];
    }

    return this.config as DomainConfig;
  }

  private generateValidators(): Record<string, (uid: string) => boolean> {
    const validators: Record<string, (uid: string) => boolean> = {};

    if (this.config.uidPrefixes) {
      Object.values(this.config.uidPrefixes).forEach((prefix) => {
        validators[prefix] = (uid: string) => uid.startsWith(`${prefix}:`);
      });
    }

    return validators;
  }
}
