/**
 * Atlas API Service
 *
 * Handles all API interactions for the Atlas knowledge graph visualization.
 * Uses standardized canonical format to eliminate data transformation complexity.
 */

import type { CanonicalGraphData } from "../../types/canonical-graph";

export interface ViewMode {
  viewMode: "full-atlas" | "ego" | "community" | "timeslice";
  centerEntity: string | null;
  communityId: number | null;
  timeWindow: { from: string; to: string };
  egoSettings: {
    hops: number;
    nodeLimit: number;
    sentiments: string[] | null;
  };
}

export interface ApiResponse<T = CanonicalGraphData> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ExportFilters {
  entityTypes?: string[];
  timeWindow?: { from: string; to: string };
}

export interface EntityResearchRequest {
  targetPersonName: string;
  researchDepth: "basic" | "detailed" | "comprehensive";
  focusAreas: string[];
  existingPersonEntities: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  dataSourceConfig: {
    wikipedia: {
      enabled: boolean;
      maxResults: number;
      maxContentLength?: number;
    };
  };
}

export class AtlasApiService {
  /**
   * Load graph data based on view mode and parameters
   */
  async loadGraphData(
    options: ViewMode,
    progressive = false
  ): Promise<ApiResponse> {
    try {
      // For large datasets, use progressive loading
      if (progressive || options.viewMode === "full-atlas") {
        console.log(`🔄 Using progressive loading for ${options.viewMode}`);
        return await this.loadGraphProgressive(options);
      }

      // Standard loading for smaller, focused datasets
      const apiUrl = this.buildGraphApiUrl(options);

      console.log(`🎯 Loading ${options.viewMode} view from ${apiUrl}`);
      const response = await fetch(apiUrl);

      // Check if response is OK before parsing JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `API error (${response.status}):`,
          errorText.substring(0, 200)
        );
        return {
          success: false,
          error: `API request failed with status ${response.status}`,
        };
      }

      const result = await response.json();

      if (result.success) {
        const canonicalData: CanonicalGraphData = result.data;

        console.log(
          `✅ Canonical data: ${canonicalData.nodes.length} nodes, ${canonicalData.edges.length} edges`
        );

        return {
          success: true,
          data: canonicalData,
        };
      } else {
        return {
          success: false,
          error: result.error || "Failed to load graph data",
        };
      }
    } catch (error) {
      console.error("Error loading graph data:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Load detailed information for a specific node
   */
  async loadNodeDetails(nodeId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`/api/atlas-details/${nodeId}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Node details error (${response.status}):`,
          errorText.substring(0, 200)
        );
        return {
          success: false,
          error: `Failed to load node details: ${response.status}`,
        };
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error loading node details:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load node details",
      };
    }
  }

  /**
   * Refresh graph data from the main atlas endpoint
   */
  async refreshGraphData(): Promise<ApiResponse> {
    try {
      console.log("🔄 Refreshing graph data...");
      const response = await fetch("/api/atlas/graph-payload");

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `API error (${response.status}):`,
          errorText.substring(0, 200)
        );
        return {
          success: false,
          error: `API request failed with status ${response.status}`,
        };
      }

      const result = await response.json();
      console.log("🔍 Refresh response:", {
        success: result.success,
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : [],
      });

      if (result.success) {
        // Atlas V2 now returns canonical format directly
        const canonicalData = result.data;
        console.log("🔍 Canonical data structure:", {
          hasNodes: !!canonicalData.nodes,
          nodeCount: canonicalData.nodes?.length,
          hasEdges: !!canonicalData.edges,
          edgeCount: canonicalData.edges?.length,
          hasMeta: !!canonicalData.meta,
          metaKeys: canonicalData.meta ? Object.keys(canonicalData.meta) : [],
        });

        // Ensure meta exists and add refresh timestamp
        if (!canonicalData.meta) {
          console.log("⚠️ Meta object missing, creating new one");
          canonicalData.meta = {
            nodeCount: canonicalData.nodes.length,
            edgeCount: canonicalData.edges.length,
            generatedAt: new Date().toISOString(),
          };
        } else {
          console.log("✅ Meta object exists, updating generatedAt");
          canonicalData.meta.generatedAt = new Date().toISOString();
        }

        console.log(
          `✅ Refreshed data: ${canonicalData.nodes.length} nodes, ${canonicalData.edges.length} edges`
        );

        return {
          success: true,
          data: canonicalData,
        };
      }

      console.error("❌ Refresh failed:", result.error);
      return result;
    } catch (error) {
      console.error("Error refreshing graph data:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to refresh graph data",
      };
    }
  }

  /**
   * Load timeline data for an entity
   */
  async loadTimeline(entityId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`/api/entity-timeline/${entityId}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Timeline error (${response.status}):`,
          errorText.substring(0, 200)
        );
        return {
          success: false,
          error: `Failed to load timeline: ${response.status}`,
        };
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error loading timeline:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to load timeline",
      };
    }
  }

  /**
   * Perform AI-powered entity research
   */
  async entityResearch(
    request: EntityResearchRequest
  ): Promise<ApiResponse<any>> {
    try {
      console.log(
        `🔍 Starting entity research for: ${request.targetPersonName}`
      );

      // Use the universal entity-research-agent instead of legacy entity-research
      const response = await fetch("/api/research/entity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetEntityName: request.targetPersonName,
          entityType: "person", // Default to person for legacy compatibility
          researchDepth: request.researchDepth,
          rawData: [],
          focusAreas: request.focusAreas,
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("❌ Entity research failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Research failed",
      };
    }
  }

  /**
   * Build export URL with filters
   */
  buildExportUrl(filters: ExportFilters): string {
    const params = new URLSearchParams();

    if (filters.entityTypes && filters.entityTypes.length > 0) {
      params.set("types", filters.entityTypes.join(","));
    }

    if (filters.timeWindow) {
      params.set("from", filters.timeWindow.from);
      params.set("to", filters.timeWindow.to);
    }

    const queryString = params.toString();
    return queryString
      ? `/api/export-bundle?${queryString}`
      : "/api/export-bundle";
  }

  /**
   * Trigger export download
   */
  triggerExportDownload(filters: ExportFilters): void {
    const exportUrl = this.buildExportUrl(filters);

    console.log("📤 Exporting current graph as Rabbit Hole bundle...");

    // Trigger download
    const link = document.createElement("a");
    link.href = exportUrl;
    link.download = `rabbit-hole-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log("📁 Export download triggered");
  }

  /**
   * Load graph data progressively with batch processing
   */
  async loadGraphProgressive(
    options: ViewMode,
    onProgress?: (batch: number, total: number) => void
  ): Promise<ApiResponse<CanonicalGraphData>> {
    try {
      const baseUrl = this.buildGraphApiUrl(options);
      const allNodes: any[] = [];
      const allEdges: any[] = [];
      let cursor: string | undefined;
      let hasMore = true;
      let batchCount = 0;
      const maxBatches = 10; // Safety limit

      console.log(`🔄 Starting progressive load for ${options.viewMode}`);

      while (hasMore && batchCount < maxBatches) {
        const url = new URL(baseUrl, window.location.origin);
        url.searchParams.set("pageSize", "500");
        if (cursor) {
          url.searchParams.set("cursor", cursor);
        }

        const response = await fetch(url.toString());

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `Progressive load batch ${batchCount} failed (${response.status}):`,
            errorText.substring(0, 200)
          );
          throw new Error(
            `Progressive loading failed with status ${response.status}`
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Progressive loading failed");
        }

        const batch = result.data;
        allNodes.push(...batch.nodes);
        allEdges.push(...batch.edges);

        hasMore = batch.meta?.pagination?.hasMore || false;
        cursor = batch.meta?.pagination?.cursor;
        batchCount++;

        onProgress?.(batchCount, hasMore ? batchCount + 3 : batchCount);

        console.log(
          `📦 Batch ${batchCount}: +${batch.nodes.length} nodes, +${batch.edges.length} edges (total: ${allNodes.length}/${allEdges.length})`
        );

        // Small delay to prevent overwhelming the UI
        if (hasMore) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      const progressiveData: CanonicalGraphData = {
        nodes: allNodes,
        edges: allEdges,
        meta: {
          nodeCount: allNodes.length,
          edgeCount: allEdges.length,
          generatedAt: new Date().toISOString(),
          schemaVersion: "canonical-v1",
          viewMode: options.viewMode,
          bounded: hasMore, // Still more data available
          progressive: {
            batchesLoaded: batchCount,
            hasMoreBatches: hasMore,
            totalEstimate: hasMore ? allNodes.length * 2 : allNodes.length,
          },
        },
      };

      console.log(
        `✅ Progressive load complete: ${allNodes.length} nodes, ${allEdges.length} edges in ${batchCount} batches`
      );

      return {
        success: true,
        data: progressiveData,
      };
    } catch (error) {
      console.error("Progressive loading failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Progressive loading failed",
      };
    }
  }

  /**
   * Build API URL based on view mode and options
   */
  private buildGraphApiUrl(options: ViewMode): string {
    switch (options.viewMode) {
      case "ego":
        if (options.centerEntity) {
          const params = new URLSearchParams({
            nodeLimit: options.egoSettings.nodeLimit.toString(),
            hops: options.egoSettings.hops.toString(),
          });
          if (options.egoSettings.sentiments) {
            params.set("sentiments", options.egoSettings.sentiments.join(","));
          }
          return `/api/graph-tiles/ego/${options.centerEntity}?${params}`;
        } else {
          return "/api/atlas/graph-payload"; // Fallback to full atlas
        }

      case "community":
        if (options.communityId !== null) {
          const params = new URLSearchParams({
            nodeLimit: "200",
            edgeLimit: "400",
            from: options.timeWindow.from,
            to: options.timeWindow.to,
          });
          return `/api/graph-tiles/community/${options.communityId}?${params}`;
        } else {
          return "/api/atlas/graph-payload"; // Fallback to full atlas
        }

      case "timeslice": {
        const params = new URLSearchParams({
          from: options.timeWindow.from,
          to: options.timeWindow.to,
          nodeLimit: "300",
          edgeLimit: "600",
          minActivity: "1",
        });
        return `/api/graph-tiles/timeslice?${params}`;
      }

      default:
        return "/api/atlas/graph-payload"; // Full atlas
    }
  }
}
