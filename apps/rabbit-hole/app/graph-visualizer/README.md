# Graph Visualizer - Multi-Renderer Architecture

Unified graph visualization system supporting three renderers: Cytoscape.js, React Flow, and Sigma.js.

## Quick Start

### Using GraphCanvas (Recommended)

```tsx
import { GraphCanvas } from "./components/GraphCanvas";

// With Cytoscape (legacy, for compatibility)
<GraphCanvas
  renderer="cytoscape"
  data={canonicalGraphData}
  eventHandlers={handlers}
/>

// With React Flow (interactive editing)
<GraphCanvas
  renderer="reactflow"
  graph={graphologyInstance}
  eventHandlers={handlers}
  onGraphChange={(updatedGraph) => persist(updatedGraph)}
/>

// With Sigma (high-performance, 10k+ nodes)
<GraphCanvas
  renderer="sigma"
  graph={graphologyInstance}
  eventHandlers={handlers}
/>
```

## Architecture

```
CanonicalGraphData ⇄ Graphology ⇄ Renderers
                    (canonical)   ├─ Cytoscape
                                  ├─ React Flow
                                  └─ Sigma
```

## Converting Data Formats

```tsx
import { canonicalToGraph, graphToCanonical } from "./model/adapters/canonical";

// CanonicalGraphData → Graphology
const graph = canonicalToGraph(canonicalData);

// Graphology → CanonicalGraphData
const canonical = graphToCanonical(graph);
```

## Working with Graphology

```tsx
import {
  newGraph,
  upsertNode,
  upsertEdge,
  updateNodePosition,
} from "./model/graph";

// Create graph
const graph = newGraph();

// Add node
upsertNode(graph, "node-1", {
  name: "Alice",
  type: "Person",
  x: 100,
  y: 200,
});

// Add edge
upsertEdge(graph, "edge-1", "node-1", "node-2", {
  type: "KNOWS",
  sentiment: "positive",
});

// Update position
updateNodePosition(graph, "node-1", 150, 250);
```

## Neo4j Persistence

```tsx
import { createNode, updateNode, moveNode } from "./sync/neo4j";
import { getNeo4jClient } from "@protolabsai/database";

const client = getNeo4jClient();

// Create node in database
await createNode(client, {
  uid: "node-1",
  name: "Alice",
  type: "Person",
  x: 100,
  y: 200,
});

// Update position
await moveNode(client, "node-1", 150, 250);
```

## Tooltips

```tsx
import { TooltipManager, useTooltipManager } from "./components/TooltipManager";

function MyGraph() {
  const { hoveredNode, showTooltip, hideTooltip } = useTooltipManager();

  return (
    <>
      <GraphCanvas
        renderer="sigma"
        graph={graph}
        eventHandlers={{
          onNodeClick: (node) => showTooltip(node),
          onBackgroundClick: () => hideTooltip(),
        }}
      />
      <TooltipManager
        hoveredNode={hoveredNode}
        getNodeScreenCoords={(nodeId) => {
          // Renderer-specific coordinate extraction
          return { x: 100, y: 200 };
        }}
      />
    </>
  );
}
```

## Renderer Selection Guide

### Cytoscape (Current Default)

- **Use for**: Existing pages, backward compatibility
- **Performance**: Good up to ~2k nodes
- **Features**: Mature, proven, full feature set

### React Flow (Interactive Editor)

- **Use for**: `/research` page, interactive editing
- **Performance**: Best for <5k nodes
- **Features**: Drag-and-drop, custom nodes, rich UI

### Sigma (High-Performance Explorer)

- **Use for**: `/atlas` page, large graphs
- **Performance**: Excellent up to 50k+ nodes
- **Features**: WebGL rendering, smooth pan/zoom

## Domain Integration

All renderers automatically apply domain colors and icons:

```tsx
import { getEntityColor, getEntityImage } from "@protolabsai/utils/atlas";

const color = getEntityColor("Person"); // #4F46E5 (social domain)
const icon = getEntityImage("Person"); // 👤
```

77 entity types across 12 domains supported.

## File Structure

```
app/graph-visualizer/
  model/
    graph.ts              # Graphology core
    adapters/
      canonical.ts        # CanonicalGraphData ⇄ Graphology
      cytoscape.ts        # Cytoscape adapter
      reactflow.ts        # React Flow adapter
      sigma.ts            # Sigma adapter
  sync/
    neo4j.ts              # Database persistence
  components/
    GraphCanvas.tsx       # Renderer switch
    FlowEditor.tsx        # React Flow implementation
    SigmaExplorer.tsx     # Sigma implementation
    TooltipManager.tsx    # Unified tooltips
    types.ts              # TypeScript types
```

## Migration Guide

### From Cytoscape to React Flow

```tsx
// Before
<GraphVisualizerWrapper data={canonicalData} eventHandlers={handlers} />;

// After
const graph = canonicalToGraph(canonicalData);

<GraphCanvas
  renderer="reactflow"
  graph={graph}
  eventHandlers={handlers}
  onGraphChange={(g) => {
    const updated = graphToCanonical(g);
    persist(updated);
  }}
/>;
```

### From Cytoscape to Sigma

```tsx
// Before
<GraphVisualizerWrapper data={canonicalData} eventHandlers={handlers} />;

// After
const graph = canonicalToGraph(canonicalData);

<GraphCanvas renderer="sigma" graph={graph} eventHandlers={handlers} />;
```

## Performance Tips

### React Flow

- Enable `onlyRenderVisibleElements` for large graphs
- Use custom nodes sparingly
- Batch position updates

### Sigma

- Disable labels for >10k nodes
- Use `labelRenderedSizeThreshold` for zoom-based labels
- Disable edge events for performance

## References

- [Graphology Documentation](https://graphology.github.io/)
- [React Flow Documentation](https://reactflow.dev/)
- [Sigma Documentation](https://www.sigmajs.org/)
- PRD: `/graph-improvements.md`
- Handoff: `/handoffs/graphology-multi-renderer-phase-1.md`
