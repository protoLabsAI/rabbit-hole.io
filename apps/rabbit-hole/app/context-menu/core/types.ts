import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export type ContextType =
  | "node"
  | "edge"
  | "background"
  | "legend"
  | "timeline"
  | "evidence"
  | string;

export interface ContextMenuState {
  isOpen: boolean;
  type: ContextType;
  x: number;
  y: number;
  context?: any;
}

export interface MenuHelpers {
  closeMenu: () => void;
  toast: (options: ToastOptions) => void;
  router: AppRouterInstance;
  openDialog?: (dialogId: string, data?: any) => void;
  actions?: Record<string, any>; // Route-specific action handlers
}

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

export interface MenuItemConfig {
  id: string;
  label: string | ((context: any) => string);
  icon?: string | React.ComponentType;
  action: (context: any, helpers: MenuHelpers) => void | Promise<void>;
  disabled?: boolean | ((context: any) => boolean);
  visible?: boolean | ((context: any) => boolean);
  requiresAuth?: boolean;
  requiredRole?: "super_admin" | "admin" | "member" | "viewer";
  variant?: "default" | "destructive" | "success";
  shortcut?: string;
}

export interface MenuDividerConfig {
  type: "divider";
  id: string;
}

export interface MenuSectionConfig {
  id: string;
  label: string;
  icon?: string | React.ComponentType;
  items: (MenuItemConfig | MenuDividerConfig)[];
  requiresAuth?: boolean;
  requiredRole?: "super_admin" | "admin" | "member" | "viewer";
  visible?: boolean | ((context: any) => boolean);
}

export type MenuConfig = (
  | MenuItemConfig
  | MenuDividerConfig
  | MenuSectionConfig
)[];

export interface ContextMenuRegistration {
  contextType: ContextType;
  route?: string | RegExp;
  priority?: number;
  menu: MenuConfig | ((context: any) => MenuConfig);
}

export interface ContextMenuHook {
  contextMenu: ContextMenuState;
  openContextMenu: (
    type: ContextType,
    x: number,
    y: number,
    context?: any
  ) => void;
  closeContextMenu: () => void;
  setActions: (actions: Record<string, any>) => void;
  actions?: Record<string, any>;
}
