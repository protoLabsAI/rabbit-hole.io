/**
 * Graph Visualizer Component Library
 *
 * Modular, configurable graph visualization components.
 */

// NodeHover component exports
export { NodeHover, useNodeHover } from "./components/NodeHover";

// Domain card exports
export {
  DomainCardFactory,
  BaseDomainCard,
  CardSection,
  PropertyRow,
  ConfigurableCard,
  createDomainTooltipContent,
} from "./components/domain-cards";

// Domain popover exports (backward compatibility)
export {
  DomainPopoverFactory,
  BaseDomainPopover,
  PopoverSection,
} from "./components/domain-cards";

// NodeHover type exports
export {
  type NodeHoverProps,
  type TooltipContentConfig,
} from "./components/NodeHover";

// Domain card type exports (new system)
export {
  type DomainName,
  type DomainNodeData,
  type DomainCardProps,
  type DomainCardComponent,
  type BaseDomainCardProps,
} from "./components/domain-cards";

// Domain popover type exports (backward compatibility)
export {
  type DomainPopoverProps,
  type DomainPopoverComponent,
  type BaseDomainPopoverProps,
} from "./components/domain-cards";

export { validateGraphData } from "./utils/data-validation";

export { defaultStyles, defaultLayouts, defaultPerformance } from "./config";
