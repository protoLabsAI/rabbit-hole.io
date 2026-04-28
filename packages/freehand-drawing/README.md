# @proto/freehand-drawing

Multi-tool drawing system for React Flow canvases with real-time collaboration support.

## Features

- **Registry-Based Tool System** - Extensible architecture for adding new tools
- **Freehand Drawing** - Smooth pressure-sensitive drawing with perfect-freehand
- **Eraser Tool** - Delete nodes and edges by wiping over them
- **Real-time Collaboration** - Yjs sync for drawings across clients
- **Context Menus** - Right-click settings for tools and drawings
- **Available to All Users** - No tier restrictions
- **Whitelabel Integration** - Respects theme colors and styling

## Installation

```bash
pnpm add @proto/freehand-drawing
```

## Quick Start

```tsx
import { useFreehandDrawing, Freehand } from "@proto/freehand-drawing";

function MyCanvas() {
  const { screenToFlowPosition, setNodes, setEdges, deleteElements } =
    useReactFlow();

  const freehand = useFreehandDrawing({
    ydoc, // Yjs document
    userId: "user-123",
    userTier: "pro",
    reactFlowInstance: {
      screenToFlowPosition,
      setNodes,
      setEdges,
      deleteElements,
    },
  });

  return (
    <>
      <ReactFlow>{/* Your graph content */}</ReactFlow>

      {freehand.isEnabled && (
        <Freehand
          points={freehand.points}
          isDrawing={freehand.isDrawing}
          settings={freehand.settings}
          activeTool={freehand.activeTool}
          onPointerDown={freehand.handlePointerDown}
          onPointerMove={freehand.handlePointerMove}
          onPointerUp={freehand.handlePointerUp}
          onSettingsChange={freehand.handleSettingsChange}
          onToolChange={freehand.handleToolChange}
          onEraseNodes={freehand.handleEraseNodes}
          onEraseEdges={freehand.handleEraseEdges}
        />
      )}
    </>
  );
}
```

## Adding New Tools

1. **Define Tool Config** in `tools/registry.ts`:

```typescript
export const TOOL_REGISTRY: Record<ToolType, ToolConfig> = {
  // ... existing tools

  myNewTool: {
    type: "myNewTool",
    name: "My Tool",
    description: "Does something cool",
    icon: "wand", // Lucide icon name
    category: "utility",
    defaultSettings: {
      myParam: 10,
    },
    hasSettings: true,
  },
};
```

2. **Add Tool Logic** in `Freehand.tsx` or separate component

3. **Add Settings UI** in `FreehandContextMenu.tsx`

4. **Export** from `index.ts`

## Tool Registry

Current tools:

- `freehand` - Drawing tool with brush settings
- `eraser` - Delete nodes/edges by wiping

Categories:

- `draw` - Drawing and creation tools
- `edit` - Modification and deletion tools
- `shape` - Geometric shape tools (future)
- `utility` - Helper tools (future)

## API

See [integration docs](../../../docs/developer/features/freehand-drawing-integration.md) for complete API reference.
