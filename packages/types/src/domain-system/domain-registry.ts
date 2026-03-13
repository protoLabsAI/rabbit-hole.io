/**
 * Domain Registry - Centralized Domain Management
 *
 * Replaces:
 * - EntitySchemaRegistry hardcoded constructor
 * - Scattered domain metadata maps
 * - getDomainFromUID hardcoded logic
 * - ENTITY_DOMAIN_MAP manual mappings
 */

import { z } from "zod";

import type { DomainConfig, DomainMetadata } from "./domain-config.interface";
import { DomainConfigSchema } from "./validation-schemas";

/**
 * Centralized domain registry singleton
 */
export class DomainRegistry {
  private static instance: DomainRegistry;

  // Core storage
  private domains = new Map<string, DomainConfig>();
  private entityToDomain = new Map<string, string>();
  private prefixToDomain = new Map<string, string>();
  private overrides = new Map<string, Partial<DomainConfig>>();

  static getInstance(): DomainRegistry {
    if (!this.instance) {
      this.instance = new DomainRegistry();
    }
    return this.instance;
  }

  // ==================== Registration ====================

  /**
   * Check if domain is registered
   */
  has(domainName: string): boolean {
    return this.domains.has(domainName);
  }

  /**
   * Register a domain configuration
   */
  register(config: DomainConfig): void {
    // Validate config
    const validation = DomainConfigSchema.safeParse(config);
    if (!validation.success) {
      throw new Error(
        `Invalid domain config for "${config.name}": ${validation.error.message}`
      );
    }

    // Check for conflicts
    if (this.domains.has(config.name)) {
      console.warn(
        `⚠️  Domain "${config.name}" already registered. Overwriting.`
      );
    }

    // Store domain
    this.domains.set(config.name, config);

    // Build indexes for fast lookup
    this.buildEntityIndex(config);
    this.buildPrefixIndex(config);
  }

  /**
   * Register only if not already registered (idempotent)
   */
  registerIfNeeded(config: DomainConfig): void {
    if (this.has(config.name)) {
      return;
    }
    this.register(config);
  }

  /**
   * Override domain configuration (for themes)
   */
  override(domainName: string, overrides: Partial<DomainConfig>): void {
    const existing = this.overrides.get(domainName) || {};
    this.overrides.set(domainName, { ...existing, ...overrides });
  }

  /**
   * Register multiple domains at once
   */
  registerBatch(configs: DomainConfig[]): void {
    configs.forEach((config) => this.register(config));
  }

  /**
   * Register a domain from JSON configuration
   */
  async registerFromJSON(jsonConfig: unknown): Promise<void> {
    // Dynamic import to avoid circular dependencies
    const { validateJSONDomain, convertJSONDomainToZod } = await import(
      "./domain-json-schema"
    );

    // Validate JSON schema
    const validation = validateJSONDomain(jsonConfig);
    if (!validation.success) {
      throw new Error(
        `Invalid JSON domain config: ${validation.error.message}`
      );
    }

    const jsonDomain = validation.data;

    // Convert to runtime Zod schemas
    const { entities, uidPrefixes, validators } =
      convertJSONDomainToZod(jsonDomain);

    // Build DomainConfig
    const config: DomainConfig = {
      name: jsonDomain.name,
      displayName: jsonDomain.displayName,
      description: jsonDomain.description,
      category: "custom",
      entities,
      uidPrefixes,
      validators,
      relationships: jsonDomain.relationships || [],
      ui: jsonDomain.ui,
      extendsFrom: jsonDomain.extendsFrom,
      version: jsonDomain.version,
      author: jsonDomain.author,
      tags: jsonDomain.tags,
    };

    // Register as normal domain
    this.register(config);
  }

  // ==================== Queries ====================

  /**
   * Get domain configuration with applied overrides
   */
  getDomainConfig(name: string): DomainConfig | undefined {
    const base = this.domains.get(name);
    if (!base) return undefined;

    const override = this.overrides.get(name);
    if (!override) return base;

    return this.mergeConfig(base, override);
  }

  /**
   * Get domain from entity type
   */
  getDomainFromEntityType(entityType: string): string | null {
    return this.entityToDomain.get(entityType) || null;
  }

  /**
   * Get domain from UID
   */
  getDomainFromUID(uid: string): string | null {
    if (typeof uid !== "string" || !uid) return null;

    const prefix = uid.split(":")[0];
    return this.prefixToDomain.get(prefix) || null;
  }

  /**
   * Get all registered domains
   */
  getAllDomains(): DomainConfig[] {
    return Array.from(this.domains.values()).map((domain) => {
      const override = this.overrides.get(domain.name);
      return override ? this.mergeConfig(domain, override) : domain;
    });
  }

  /**
   * Get domain metadata for UI
   */
  getDomainMetadata(name: string): DomainMetadata | undefined {
    const config = this.getDomainConfig(name);
    return config ? this.configToMetadata(config) : undefined;
  }

  /**
   * Get entity types by domain
   */
  getEntityTypesByDomain(): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    this.domains.forEach((config, domainName) => {
      result[domainName] = Object.keys(config.entities);
    });

    return result;
  }

  /**
   * Get relationship types by domain
   */
  getRelationshipTypesByDomain(): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    this.domains.forEach((config, domainName) => {
      result[domainName] = [...(config.relationships ?? [])];
    });

    return result;
  }

  // ==================== Schema Access ====================

  /**
   * Get schema for entity type
   */
  getSchema(entityType: string): z.ZodSchema | undefined {
    const domainName = this.entityToDomain.get(entityType);
    if (!domainName) return undefined;

    const config = this.getDomainConfig(domainName);
    return config?.entities[entityType];
  }

  /**
   * Validate UID format
   */
  validateUID(uid: string): boolean {
    const prefix = uid.split(":")[0];
    const domainName = this.prefixToDomain.get(prefix);
    if (!domainName) return false;

    const config = this.getDomainConfig(domainName);
    const validator = config?.validators[prefix];
    return validator ? validator(uid) : false;
  }

  /**
   * Get all entity types across all domains
   */
  getAllEntityTypes(): string[] {
    const types: string[] = [];
    this.domains.forEach((config) => {
      types.push(...Object.keys(config.entities));
    });
    return types;
  }

  // ==================== Private Helpers ====================

  private buildEntityIndex(config: DomainConfig): void {
    Object.keys(config.entities).forEach((entityType) => {
      this.entityToDomain.set(entityType, config.name);
    });
  }

  private buildPrefixIndex(config: DomainConfig): void {
    Object.values(config.uidPrefixes).forEach((prefix) => {
      this.prefixToDomain.set(prefix, config.name);
    });
  }

  private mergeConfig(
    base: DomainConfig,
    override: Partial<DomainConfig>
  ): DomainConfig {
    return {
      ...base,
      ...override,
      ui: { ...base.ui, ...override.ui },
      relationships: override.relationships || base.relationships,
      entities: { ...base.entities, ...override.entities },
    };
  }

  private configToMetadata(config: DomainConfig): DomainMetadata {
    return {
      name: config.name,
      description: config.description,
      entityCount: Object.keys(config.entities).length,
      relationships: config.relationships,
      ui: config.ui,
    };
  }
}

// Singleton export
export const domainRegistry = DomainRegistry.getInstance();
