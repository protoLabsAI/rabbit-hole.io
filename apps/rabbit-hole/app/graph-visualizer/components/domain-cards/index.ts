/**
 * Domain Cards Export Index
 *
 * Central exports for all domain-specific card components and utilities.
 * Maintains backward compatibility with popover naming.
 */

// Core components and factory
export { DomainCardFactory } from "./DomainCardFactory";
export { BaseDomainCard, CardSection, PropertyRow } from "./BaseDomainCard";
export { ConfigurableCard } from "./ConfigurableCard";

// Backward compatibility exports
export { DomainPopoverFactory } from "./DomainCardFactory";
export { BaseDomainPopover, PopoverSection } from "./BaseDomainCard";
export { createDomainTooltipContent } from "./DomainTooltipRenderer";

// Types (new card system)
export type {
  DomainName,
  DomainNodeData,
  DomainCardProps,
  DomainCardComponent,
  DomainCardRegistry,
  BaseDomainCardProps,
} from "./types";

// Backward compatibility types
export type {
  DomainCardProps as DomainPopoverProps,
  DomainCardComponent as DomainPopoverComponent,
  DomainCardRegistry as DomainPopoverRegistry,
  BaseDomainCardProps as BaseDomainPopoverProps,
} from "./types";
