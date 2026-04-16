# @protolabsai/workspace

Type definitions and utilities for multi-tab collaborative workspaces.

## Features

- Type definitions for workspace, tabs, canvas system
- Event system with SSR-safe dispatchers
- Toolbar capability types
- User presence types
- Canvas registry interfaces

## Installation

```bash
pnpm add @protolabsai/workspace
```

## Usage

```typescript
import type { 
  Workspace, 
  WorkspaceTab, 
  CanvasType,
  UtilityTab 
} from "@protolabsai/workspace";

import { 
  RESEARCH_EVENTS, 
  dispatchResearchEvent 
} from "@protolabsai/workspace";

// Use types in your workspace implementation
interface MyWorkspaceProps {
  workspace: Workspace;
  activeTab: WorkspaceTab | null;
}

// Dispatch canvas events (SSR-safe)
dispatchResearchEvent(RESEARCH_EVENTS.ZOOM_IN, { canvasId: "canvas-1" });
```

## Note

This package contains **types and utilities only**. For hook implementations, see the research app source code in `apps/rabbit-hole/app/research/hooks/`.

## Documentation

See [handoff document](../../handoffs/2025-11-01_RESEARCH_COMPONENT_EXTRACTION.md) for detailed implementation guide.

## Status

**Version:** 0.1.0 (Alpha)  
**Extracted from:** apps/rabbit-hole/app/research  
**Date:** November 2025

