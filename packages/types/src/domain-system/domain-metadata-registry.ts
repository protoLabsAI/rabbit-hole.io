/**
 * Domain Metadata Registry
 *
 * Centralized domain metadata access.
 * Replaces scattered getDomainColor/getDomainIcon functions.
 */

import type { DomainMetadata } from "./domain-config.interface";
import { DomainRegistry, domainRegistry } from "./domain-registry";

/**
 * Centralized domain metadata access
 */
export class DomainMetadataRegistry {
  private registry: DomainRegistry;

  constructor(registry: DomainRegistry) {
    this.registry = registry;
  }

  getColor(domain: string): string {
    const config = this.registry.getDomainConfig(domain);
    return config?.ui.color || "#6B7280";
  }

  getIcon(domain: string): string {
    const config = this.registry.getDomainConfig(domain);
    return config?.ui.icon || "📦";
  }

  getEntityIcon(domain: string, entityType: string): string {
    const config = this.registry.getDomainConfig(domain);
    return config?.ui.entityIcons?.[entityType] || config?.ui.icon || "📦";
  }

  getMetadata(domain: string): DomainMetadata | undefined {
    return this.registry.getDomainMetadata(domain);
  }

  getAllMetadata(): Map<string, DomainMetadata> {
    const map = new Map<string, DomainMetadata>();
    this.registry.getAllDomains().forEach((config) => {
      const metadata = this.registry.getDomainMetadata(config.name);
      if (metadata) {
        map.set(config.name, metadata);
      }
    });
    return map;
  }
}

// Singleton instance
export const domainMetadata = new DomainMetadataRegistry(domainRegistry);

// Convenience exports (replace all scattered functions)
export const getDomainColor = (domain: string) =>
  domainMetadata.getColor(domain);
export const getDomainIcon = (domain: string) => domainMetadata.getIcon(domain);
export const getEntityIcon = (domain: string, entityType: string) =>
  domainMetadata.getEntityIcon(domain, entityType);
export const getDomainMetadata = (domain: string) =>
  domainMetadata.getMetadata(domain);
