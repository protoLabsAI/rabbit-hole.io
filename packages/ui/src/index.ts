/**
 * @protolabsai/ui
 *
 * Shared UI components, hooks, and utilities organized by Atomic Design principles
 *
 * @example
 * ```tsx
 * // Import specific atomic level
 * import { Button, Badge } from "@protolabsai/ui/atoms";
 * import { StatusBadge } from "@protolabsai/ui/molecules";
 * import { DialogRegistry } from "@protolabsai/ui/organisms";
 * import { ResizableChatLayout } from "@protolabsai/ui/templates";
 *
 * // Or import everything (not recommended for tree-shaking)
 * import { Button, StatusBadge } from "@protolabsai/ui";
 * ```
 */

// Re-export all atomic levels for convenience
export * from "./atoms";
export * from "./molecules";
export * from "./organisms";
export * from "./templates";

// Utility functions
export { cn } from "./lib/utils";
