/**
 * @proto/ui
 *
 * Shared UI components, hooks, and utilities organized by Atomic Design principles
 *
 * @example
 * ```tsx
 * // Import specific atomic level
 * import { Button, Badge } from "@proto/ui/atoms";
 * import { StatusBadge } from "@proto/ui/molecules";
 * import { DialogRegistry } from "@proto/ui/organisms";
 * import { ResizableChatLayout } from "@proto/ui/templates";
 *
 * // Or import everything (not recommended for tree-shaking)
 * import { Button, StatusBadge } from "@proto/ui";
 * ```
 */

// Re-export all atomic levels for convenience
export * from "./atoms";
export * from "./molecules";
export * from "./organisms";
export * from "./templates";

// Utility functions
export { cn } from "./lib/utils";
