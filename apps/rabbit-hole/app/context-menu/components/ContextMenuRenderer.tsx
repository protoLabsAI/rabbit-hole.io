"use client";

import { useRouter, usePathname } from "next/navigation";
import React from "react";

import { getUserRoleClient, hasMinimumRole } from "@proto/auth/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@proto/ui/atoms";
import { useToast } from "@proto/ui/hooks";

import { useContextMenu } from "../core/hooks";
import type {
  MenuItemConfig,
  MenuSectionConfig,
  MenuConfig,
  MenuHelpers,
} from "../core/types";
import { contextMenuRegistry } from "../registry";

export function ContextMenuRenderer() {
  const contextMenuHook = useContextMenu();
  const { contextMenu, closeContextMenu } = contextMenuHook;
  const isSignedIn = true;
  const user = {
    id: "local-user",
    firstName: "Local",
    lastName: "User",
    username: "local-user",
    fullName: "Local User",
    emailAddresses: [{ emailAddress: "local@localhost" }],
    publicMetadata: { tier: "pro" },
    privateMetadata: { stats: {} },
  };
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  // Get user role for permission checks
  const userRole = getUserRoleClient(user ?? null);

  if (!contextMenu.isOpen) return null;

  const helpers: MenuHelpers = {
    closeMenu: closeContextMenu,
    toast,
    router,
    actions: contextMenuHook.actions,
  };

  const menuConfig = contextMenuRegistry.getMenuConfig(
    contextMenu.type,
    pathname,
    contextMenu.context
  );

  const renderMenuItem = (item: MenuItemConfig) => {
    const visible =
      typeof item.visible === "function"
        ? item.visible(contextMenu.context)
        : item.visible !== false;

    if (!visible) return null;

    // Check role-based visibility (hide completely if role not met)
    if (item.requiredRole && !hasMinimumRole(userRole, item.requiredRole)) {
      return null;
    }

    if (item.requiresAuth && !isSignedIn) {
      return (
        <DropdownMenuItem key={item.id} disabled>
          <span className="flex items-center space-x-2 text-muted-foreground">
            <span>🔒</span>
            <span>
              {typeof item.label === "function"
                ? item.label(contextMenu.context)
                : item.label}
            </span>
          </span>
        </DropdownMenuItem>
      );
    }

    const disabled =
      typeof item.disabled === "function"
        ? item.disabled(contextMenu.context)
        : item.disabled;

    const label =
      typeof item.label === "function"
        ? item.label(contextMenu.context)
        : item.label;

    const handleClick = async () => {
      try {
        await item.action(contextMenu.context, helpers);
      } catch (error) {
        console.error("Menu action error:", error);
        toast({
          title: "Action Failed",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    };

    return (
      <DropdownMenuItem
        key={item.id}
        onClick={handleClick}
        disabled={disabled}
        className={item.variant === "destructive" ? "text-destructive" : ""}
      >
        <span className="flex items-center space-x-2">
          {item.icon && (
            <span>
              {typeof item.icon === "string" ? item.icon : <item.icon />}
            </span>
          )}
          <span>{label}</span>
          {item.shortcut && (
            <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>
          )}
        </span>
      </DropdownMenuItem>
    );
  };

  const renderSection = (section: MenuSectionConfig) => {
    const visible =
      typeof section.visible === "function"
        ? section.visible(contextMenu.context)
        : section.visible !== false;

    if (!visible) return null;

    // Check role-based visibility (hide completely if role not met)
    if (
      section.requiredRole &&
      !hasMinimumRole(userRole, section.requiredRole)
    ) {
      return null;
    }

    if (section.requiresAuth && !isSignedIn) {
      return (
        <DropdownMenuItem key={section.id} disabled>
          <span className="flex items-center space-x-2 text-muted-foreground">
            <span>🔒</span>
            <span>{section.label} (sign in required)</span>
          </span>
        </DropdownMenuItem>
      );
    }

    return (
      <DropdownMenuSub key={section.id}>
        <DropdownMenuSubTrigger>
          <span className="flex items-center space-x-2">
            {section.icon && (
              <span>
                {typeof section.icon === "string" ? (
                  section.icon
                ) : (
                  <section.icon />
                )}
              </span>
            )}
            <span>{section.label}</span>
          </span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="!bg-card/95 backdrop-blur-lg">
          {section.items.map((item) =>
            "type" in item && item.type === "divider" ? (
              <DropdownMenuSeparator key={item.id} />
            ) : (
              renderMenuItem(item as MenuItemConfig)
            )
          )}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  };

  const renderConfig = (config: MenuConfig) => {
    if (config.length === 0) {
      return (
        <DropdownMenuItem disabled>
          <span className="text-muted-foreground">No actions available</span>
        </DropdownMenuItem>
      );
    }

    return config.map((item) => {
      if ("type" in item && item.type === "divider") {
        return <DropdownMenuSeparator key={item.id} />;
      }
      if ("items" in item) {
        return renderSection(item as MenuSectionConfig);
      }
      return renderMenuItem(item as MenuItemConfig);
    });
  };

  const renderAuthPrompt = () => (
    <>
      <DropdownMenuItem disabled>
        <span className="flex items-center space-x-2 text-muted-foreground">
          <span>🔒</span>
          <span>Sign in for more options</span>
        </span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={closeContextMenu}>
        <span className="flex items-center space-x-2 text-primary cursor-pointer">
          <span>🔐</span>
          <span>Sign In</span>
        </span>
      </DropdownMenuItem>
    </>
  );

  // Use a portal to render menu at cursor position
  return (
    <div
      style={{
        position: "fixed",
        left: contextMenu.x,
        top: contextMenu.y,
        zIndex: 9999,
      }}
    >
      <DropdownMenu
        open={contextMenu.isOpen}
        onOpenChange={(open) => {
          if (!open) closeContextMenu();
        }}
      >
        <DropdownMenuTrigger className="w-0 h-0" />
        <DropdownMenuContent
          className="!bg-card/95 backdrop-blur-lg min-w-48"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {renderConfig(menuConfig)}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
