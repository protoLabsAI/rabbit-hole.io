/**
 * Card Configuration Builder
 *
 * Fluent API for building domain card configurations.
 */

import type {
  DomainCardConfig,
  DomainCardFieldConfig,
  DomainCardSection,
  DomainCardProps,
  FieldFormatter,
} from "./domain-card-config.interface";

/**
 * Fluent builder for domain card configurations
 */
export class CardConfigBuilder {
  private config: Partial<DomainCardConfig> = {
    fields: [],
    sections: [],
  };

  /**
   * Add a field configuration
   */
  field(config: DomainCardFieldConfig): this {
    this.config.fields!.push(config);
    return this;
  }

  /**
   * Add multiple fields
   */
  fields(configs: DomainCardFieldConfig[]): this {
    this.config.fields!.push(...configs);
    return this;
  }

  /**
   * Add a section
   */
  section(config: DomainCardSection): this {
    if (!this.config.sections) this.config.sections = [];
    this.config.sections.push(config);
    return this;
  }

  /**
   * Add multiple sections
   */
  sections(configs: DomainCardSection[]): this {
    if (!this.config.sections) this.config.sections = [];
    this.config.sections.push(...configs);
    return this;
  }

  /**
   * Set custom component
   */
  component(component: React.ComponentType<DomainCardProps>): this {
    this.config.component = component;
    return this;
  }

  /**
   * Use default generic renderer
   */
  useDefaultComponent(): this {
    this.config.component = "default";
    return this;
  }

  /**
   * Set custom formatters
   */
  formatters(formatters: Record<string, FieldFormatter>): this {
    this.config.formatters = formatters;
    return this;
  }

  /**
   * Add a single formatter
   */
  formatter(property: string, formatter: FieldFormatter): this {
    if (!this.config.formatters) this.config.formatters = {};
    this.config.formatters[property] = formatter;
    return this;
  }

  /**
   * Extend from another domain
   */
  extend(domainName: string): this {
    this.config.extends = domainName;
    return this;
  }

  /**
   * Set layout configuration
   */
  layout(
    size: "compact" | "standard" | "detailed",
    layout: DomainCardConfig["layout"]
  ): this {
    if (!this.config.layout) this.config.layout = {};
    this.config.layout[size] = layout as any;
    return this;
  }

  /**
   * Build final configuration
   */
  build(): DomainCardConfig {
    return this.config as DomainCardConfig;
  }
}

/**
 * Helper function to create builder
 */
export function createCardConfig(): CardConfigBuilder {
  return new CardConfigBuilder();
}
