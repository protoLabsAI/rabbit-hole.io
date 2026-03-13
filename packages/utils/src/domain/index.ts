/**
 * Domain Utilities
 *
 * Utilities for working with domain configuration system
 */

export {
  getEntityColor,
  getEntityColors,
  getEntityTypeColor,
  getEntityColorArray,
} from "./entity-colors";

export {
  isDomainFeatureEnabled,
  canCreateEntity,
  canEditEntity,
  canDeleteEntity,
  shouldShowInSelector,
  canUserAccessDomain,
  getAccessibleDomains,
} from "./feature-checks";
