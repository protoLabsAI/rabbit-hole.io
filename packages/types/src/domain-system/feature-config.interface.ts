/**
 * Domain Feature Configuration
 *
 * Controls which features are enabled per domain.
 * Essential for white-label permission management.
 */

export interface DomainFeatureConfig {
  // ==================== Entity Operations ====================
  /** Allow creating entities in this domain */
  allowCreate?: boolean;

  /** Allow editing entities */
  allowEdit?: boolean;

  /** Allow deleting entities */
  allowDelete?: boolean;

  /** Allow merging duplicate entities */
  allowMerge?: boolean;

  /** Require admin approval for entity creation */
  requireApproval?: boolean;

  // ==================== Visibility ====================
  /** Show in search results */
  showInSearch?: boolean;

  /** Show in analytics dashboards */
  showInAnalytics?: boolean;

  /** Show in graph visualizations */
  showInGraph?: boolean;

  /** Show in timeline views */
  showInTimeline?: boolean;

  /** Show in evidence panel */
  showInEvidence?: boolean;

  /** Show in domain selector dropdowns */
  showInSelector?: boolean;

  // ==================== Relationships ====================
  /** Allow creating relationships from this domain */
  allowRelationshipCreation?: boolean;

  /** Allowed target domains for relationships */
  allowedRelationshipTargets?: string[];

  // ==================== Advanced ====================
  /** Enable AI-powered entity extraction */
  enableAIExtraction?: boolean;

  /** Enable bulk CSV/JSON import */
  enableBulkImport?: boolean;

  /** Enable data export functionality */
  enableExport?: boolean;

  /** Require authentication to view entities */
  requireAuth?: boolean;

  /** User roles that can access this domain */
  allowedRoles?: string[];

  /** Maximum entities user can create per day */
  creationRateLimit?: number;
}

/**
 * Default feature configuration (everything enabled)
 */
export const DEFAULT_FEATURE_CONFIG: DomainFeatureConfig = {
  allowCreate: true,
  allowEdit: true,
  allowDelete: true,
  allowMerge: true,
  requireApproval: false,
  showInSearch: true,
  showInAnalytics: true,
  showInGraph: true,
  showInTimeline: true,
  showInEvidence: true,
  showInSelector: true,
  allowRelationshipCreation: true,
  enableAIExtraction: true,
  enableBulkImport: true,
  enableExport: true,
  requireAuth: false,
};
