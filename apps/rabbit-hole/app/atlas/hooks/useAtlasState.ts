/**
 * Atlas Core State Hook
 *
 * Manages core UI state for the Atlas page including:
 * - Node selection and details
 * - Loading states
 * - Form visibility
 * - Entity data
 */

import { useState, useCallback } from "react";

import type {
  CanonicalNode,
  CanonicalGraphData,
} from "../../types/canonical-graph";

// Legacy compatibility - now maps to canonical format
export type AtlasNode = CanonicalNode;

export interface EnhancedNodeDetails {
  entity: {
    id: string;
    label: string;
    entityType: string;
    tags: string[];
    dates: {
      // Unified temporal data structure for enhanced timeline
      birth?: string; // Person birth
      death?: string; // Person death
      founded?: string; // Org/Movement/Platform/Country founding
      dissolved?: string; // Org/Movement/Country dissolution
      launched?: string; // Platform launch
      shutdown?: string; // Platform shutdown
      eventDate?: string; // Event single date
      eventEndDate?: string; // Event end date
      independence?: string; // Country independence
      acquired?: string; // Organization acquisition
      rebranded?: string; // Organization rebranding
      // Legacy support
      start?: string;
      end?: string;
    };
    sources: Array<{
      id: string;
      type: string;
      available: boolean;
    }>;
    bio?: string;
    birthDate?: string;
    birthPlace?: string;
    deathDate?: string; // Enhanced: death date
    deathPlace?: string; // Enhanced: death place
    nationality?: string;
    occupation?: string;
    politicalParty?: string;
    education?: string[];
    netWorth?: number;
    residence?: string;
    aliases?: string[];
  };
  network: {
    total: number;
    incoming: number;
    outgoing: number;
    by_sentiment: {
      hostile: number;
      supportive: number;
      neutral: number;
    };
    speech_acts: Array<{
      category: string;
      sentiment: string;
      text_excerpt?: string;
      target?: string;
      date?: string;
      intensity?: string;
    }>;
  };
  speech_patterns?: {
    total_incidents: number;
    categories: Array<{
      category: string;
      count: number;
    }>;
    targets: string[];
    timeline: Array<{
      date: string;
      category: string;
      excerpt: string;
      intensity: string;
    }>;
  };
  // Enhanced timeline data
  timeline?: {
    events: Array<{
      id: string;
      timestamp: string;
      eventType: "intrinsic" | "relationship" | "milestone";
      category: string;
      title: string;
      description?: string;
      relationshipType?: string;
      targetEntity?: {
        uid: string;
        name: string;
        type: string;
      };
      entityProperty?: string;
      isPlaceholder?: boolean;
      properties?: Record<string, unknown>;
      evidence?: Array<{
        uid: string;
        title: string;
        publisher: string;
        url: string;
        reliability: number;
      }>;
      confidence: number;
      importance: "critical" | "major" | "minor";
    }>;
    summary: {
      totalEvents: number;
      dateRange: { earliest: string; latest: string };
      eventCategories: Record<string, number>;
      intrinsicEvents: number;
      relationshipEvents: number;
      placeholderEvents: number;
      intrinsicPlaceholders: number; // Missing birth dates, founding dates, etc.
      temporalPlaceholders: number; // Relationships without dates
    };
  };
}

export interface ExistingEntity {
  id: string;
  label: string;
  entityType: string;
}

// Legacy compatibility - now uses canonical format
export type AtlasData = CanonicalGraphData;

export function useAtlasState() {
  // Core selection state
  const [selectedNode, setSelectedNodeState] = useState<AtlasNode | null>(null);
  const [selectedNodeDetails, setSelectedNodeDetails] =
    useState<EnhancedNodeDetails | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingNodeDetails, setIsLoadingNodeDetails] = useState(false);

  // Form visibility states
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Entity data
  const [existingEntities, setExistingEntities] = useState<ExistingEntity[]>(
    []
  );

  // Enhanced setters with side effects
  const setSelectedNode = useCallback((node: AtlasNode | null) => {
    setSelectedNodeState(node);
    // Clear details when node changes
    if (node === null) {
      setSelectedNodeDetails(null);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNode(null);
    setSelectedNodeDetails(null);
  }, [setSelectedNode]);

  const openAddForm = useCallback(() => {
    setShowAddForm(true);
    clearSelection(); // Clear selection when opening form
  }, [clearSelection]);

  const closeAddForm = useCallback(() => {
    setShowAddForm(false);
  }, []);

  const openBulkImport = useCallback(() => {
    setShowBulkImport(true);
  }, []);

  const closeBulkImport = useCallback(() => {
    setShowBulkImport(false);
  }, []);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    clearSelection(); // Clear selection when starting new load
  }, [clearSelection]);

  const finishLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const updateExistingEntitiesFromGraphData = useCallback(
    (graphData: AtlasData) => {
      const entities = graphData.nodes.map((node) => ({
        id: node.uid,
        label: node.name,
        entityType: node.type,
      }));
      setExistingEntities(entities);
    },
    []
  );

  return {
    // Core selection state
    selectedNode,
    selectedNodeDetails,
    setSelectedNode,
    setSelectedNodeDetails: setSelectedNodeDetails as (
      details: EnhancedNodeDetails | null
    ) => void,
    clearSelection,

    // Loading states
    isLoading,
    isLoadingNodeDetails,
    setIsLoading,
    setIsLoadingNodeDetails,
    startLoading,
    finishLoading,

    // Form states
    showAddForm,
    showBulkImport,
    setShowAddForm,
    setShowBulkImport,
    openAddForm,
    closeAddForm,
    openBulkImport,
    closeBulkImport,

    // Entity data
    existingEntities,
    setExistingEntities,
    updateExistingEntitiesFromGraphData,
  };
}
