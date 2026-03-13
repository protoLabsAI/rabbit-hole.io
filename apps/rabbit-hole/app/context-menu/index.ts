/**
 * Context Menu System - Zustand-based modular architecture
 *
 * @example
 * ```tsx
 * import { ContextMenuProvider, useContextMenu } from '@/app/context-menu';
 *
 * function MyComponent() {
 *   const { openContextMenu } = useContextMenu();
 *
 *   return (
 *     <div onContextMenu={(e) => {
 *       e.preventDefault();
 *       openContextMenu('node', e.clientX, e.clientY, { id: 'test' });
 *     }}>
 *       Right click me
 *     </div>
 *   );
 * }
 * ```
 */

export { ContextMenuProvider, useContextMenu } from "./core/hooks";
export { contextMenuRegistry } from "./registry";
export { ContextMenuRenderer } from "./components/ContextMenuRenderer";
export type {
  ContextType,
  ContextMenuState,
  MenuHelpers,
  MenuItemConfig,
  MenuDividerConfig,
  MenuSectionConfig,
  MenuConfig,
  ContextMenuRegistration,
  ContextMenuHook,
} from "./core/types";
