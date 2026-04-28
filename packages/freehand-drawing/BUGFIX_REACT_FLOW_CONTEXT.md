# Bugfix: React Flow Context Error

## Issue

**Error:** `[React Flow]: Seems like you have not used zustand provider as an ancestor`

**Root Cause:** The `useFreehandDrawing` hook was calling `useReactFlow()` directly, but the hook was being used in `GraphCanvasIntegrated`, which is **outside** the `ReactFlowProvider` context.

### Component Hierarchy

```
GraphCanvasIntegrated (❌ Outside provider)
  └─ useFreehandDrawing() ← Called useReactFlow() here
  └─ ResearchEditorWrapper
       └─ ReactFlowProvider (✅ Provider starts here)
            └─ ResearchEditor
                 └─ useReactFlow() ← Only valid here
```

## Solution

Refactored `useFreehandDrawing` to accept React Flow functions as parameters instead of calling `useReactFlow()` internally.

### Changes

#### 1. Hook Signature Update

**Before:**
```typescript
// useFreehandDrawing.ts
export function useFreehandDrawing({
  ydoc,
  userId,
  userTier,
  onNodeCreated,
  onInteractionLockChange,
  onError,
}: UseFreehandDrawingOptions = {}) {
  const { screenToFlowPosition, setNodes } = useReactFlow(); // ❌ Error
  // ...
}
```

**After:**
```typescript
// useFreehandDrawing.ts
interface UseFreehandDrawingOptions {
  // ... existing options
  reactFlowInstance?: {
    screenToFlowPosition: ReactFlowInstance["screenToFlowPosition"];
    setNodes: ReactFlowInstance["setNodes"];
  };
}

export function useFreehandDrawing({
  ydoc,
  userId,
  userTier,
  reactFlowInstance, // ✅ Passed as parameter
  onNodeCreated,
  onInteractionLockChange,
  onError,
}: UseFreehandDrawingOptions = {}) {
  const screenToFlowPosition = reactFlowInstance?.screenToFlowPosition;
  const setNodes = reactFlowInstance?.setNodes;
  // ... rest of hook with null checks
}
```

#### 2. ResearchEditor: Expose Instance

Added `onReactFlowInit` callback to expose React Flow instance to parent:

```typescript
// ResearchEditor.tsx
interface ResearchEditorProps {
  // ... existing props
  onReactFlowInit?: (instance: {
    screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number };
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  }) => void;
}

export function ResearchEditor({ onReactFlowInit, ...props }) {
  const { screenToFlowPosition, setNodes } = useReactFlow();

  // Expose to parent on mount
  useEffect(() => {
    onReactFlowInit?.({ screenToFlowPosition, setNodes });
  }, [onReactFlowInit, screenToFlowPosition, setNodes]);

  return <ReactFlow {...props} />;
}
```

#### 3. GraphCanvasIntegrated: Capture and Pass

Capture instance from child and pass to hook:

```typescript
// GraphCanvasIntegrated.tsx
const [reactFlowInstance, setReactFlowInstance] = useState(null);

const freehand = useFreehandDrawing({
  ydoc,
  userId,
  userTier,
  reactFlowInstance: reactFlowInstance || undefined, // ✅ Pass to hook
  // ... other options
});

return (
  <ResearchEditorWrapper
    {...props}
    onReactFlowInit={setReactFlowInstance} // ✅ Receive from child
  />
);
```

## Benefits

1. **No Context Dependency** - Hook can be used outside React Flow provider
2. **Explicit Dependencies** - Clear what React Flow functions are needed
3. **Better Testability** - Mock functions can be passed for testing
4. **Flexible Architecture** - Supports complex component hierarchies

## Data Flow

```
ResearchEditor (inside provider)
  ├─ useReactFlow() → { screenToFlowPosition, setNodes }
  └─ useEffect → onReactFlowInit({ screenToFlowPosition, setNodes })
       ↓
GraphCanvasIntegrated (outside provider)
  ├─ setReactFlowInstance(instance)
  └─ useFreehandDrawing({ reactFlowInstance })
       ↓
Hook has access to React Flow functions without context
```

## Testing

✅ **Build Status:** Passing  
✅ **Linter:** No errors  
✅ **Types:** All valid  
✅ **Runtime:** No React Flow context errors

## Related Files

- `packages/freehand-drawing/src/useFreehandDrawing.ts` - Hook implementation
- `apps/rabbit-hole/app/research/components/ResearchEditor.tsx` - Instance exposure
- `apps/rabbit-hole/app/research/components/workspace/canvas/GraphCanvasIntegrated.tsx` - Instance capture
- `packages/freehand-drawing/README.md` - Updated API documentation
- `docs/developer/features/freehand-drawing-integration.md` - Integration guide

## Migration Guide

If you're using `useFreehandDrawing` in your own code:

### Option 1: Use Inside ReactFlowProvider

```typescript
function MyGraph() {
  const { screenToFlowPosition, setNodes } = useReactFlow();
  
  const freehand = useFreehandDrawing({
    reactFlowInstance: { screenToFlowPosition, setNodes },
    // ... other options
  });
  
  return <ReactFlow {...props} />;
}
```

### Option 2: Pass from Parent (Complex Apps)

```typescript
// Parent (outside provider)
function Parent() {
  const [instance, setInstance] = useState(null);
  
  const freehand = useFreehandDrawing({
    reactFlowInstance: instance,
    // ... other options
  });
  
  return (
    <ReactFlowProvider>
      <Child onInit={setInstance} />
    </ReactFlowProvider>
  );
}

// Child (inside provider)
function Child({ onInit }) {
  const { screenToFlowPosition, setNodes } = useReactFlow();
  
  useEffect(() => {
    onInit({ screenToFlowPosition, setNodes });
  }, [onInit, screenToFlowPosition, setNodes]);
  
  return <ReactFlow {...props} />;
}
```

---

**Status:** ✅ **RESOLVED**  
**Date:** November 1, 2025  
**Version:** @proto/freehand-drawing@0.0.1

