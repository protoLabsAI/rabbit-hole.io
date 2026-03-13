/**
 * Cytoscape Layout Configurations
 *
 * Provides optimized layout configurations for different graph visualization scenarios.
 * Each layout is tuned for specific use cases and data characteristics.
 */

export type LayoutType = "breadthfirst" | "force" | "atlas";

export interface CytoscapeLayoutConfig {
  name: string;
  animate?: boolean | string;
  animationDuration?: number;
  animationEasing?: string;
  padding?: number;
  spacingFactor?: number;
  avoidOverlap?: boolean;
  nodeDimensionsIncludeLabels?: boolean;
  directed?: boolean;
  maxSimulationTime?: number;
  ungrabifyWhileSimulating?: boolean;
  nodeSpacing?: number;
  edgeLength?: number;
  convergenceThreshold?: number;
  handleDisconnected?: boolean;
  clusters?: (node: any) => string;
  nodeRepulsion?: number;
  idealEdgeLength?: number;
  edgeElasticity?: number;
  nodeSeparation?: number;
  allowNodesInsideCircle?: boolean;
}

/**
 * Returns optimized Cytoscape layout configuration for the specified layout type
 *
 * @param type - The layout algorithm to use
 * @returns Cytoscape layout configuration object
 */
export function getLayoutConfig(type: LayoutType): CytoscapeLayoutConfig {
  switch (type) {
    case "breadthfirst":
      return {
        name: "breadthfirst",
        directed: false,
        padding: 40,
        animate: true,
        animationDuration: 1000,
        animationEasing: "ease-out",
        spacingFactor: 2.0,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: false,
      };

    case "force":
      return {
        name: "cola",
        animate: true,
        animationDuration: 1000,
        maxSimulationTime: 2000,
        ungrabifyWhileSimulating: false,
        nodeSpacing: 60,
        edgeLength: 150,
        convergenceThreshold: 0.01,
        handleDisconnected: true,
        avoidOverlap: true,
      };

    case "atlas":
      return {
        name: "cise",
        clusters: function (node: any) {
          return node.data("type");
        },
        animate: "end",
        animationDuration: 1000,
        animationEasing: "ease-out",
        nodeRepulsion: 3000,
        idealEdgeLength: 120,
        edgeElasticity: 0.45,
        nodeSeparation: 80,
        allowNodesInsideCircle: false,
      };

    default: {
      // Exhaustive checking - ensures all LayoutType values are handled
      const _exhaustiveCheck: never = type;
      return {
        name: "grid",
        animate: true,
        animationDuration: 1000,
      };
    }
  }
}
