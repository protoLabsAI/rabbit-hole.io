import type {
  ContextType,
  ContextMenuRegistration,
  MenuConfig,
} from "../core/types";

class ContextMenuRegistry {
  private registrations: Map<string, ContextMenuRegistration[]> = new Map();

  register(registration: ContextMenuRegistration) {
    const routeKey = this.getRouteKey(registration.route);
    const key = `${registration.contextType}:${routeKey}`;
    const existing = this.registrations.get(key) || [];

    existing.push(registration);
    existing.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    this.registrations.set(key, existing);
  }

  getMenuConfig(
    contextType: ContextType,
    route: string,
    context: any
  ): MenuConfig {
    const exactKey = `${contextType}:${route}`;
    const wildcardKey = `${contextType}:*`;

    const exactMatches = this.registrations.get(exactKey) || [];
    const wildcardMatches = this.registrations.get(wildcardKey) || [];

    // Check regex patterns
    const regexMatches: ContextMenuRegistration[] = [];
    for (const [key, regs] of this.registrations.entries()) {
      const [type] = key.split(":");
      if (type === contextType) {
        for (const reg of regs) {
          if (reg.route instanceof RegExp && reg.route.test(route)) {
            regexMatches.push(reg);
          }
        }
      }
    }

    const allRegistrations = [
      ...exactMatches,
      ...regexMatches,
      ...wildcardMatches,
    ];

    const mergedConfig: MenuConfig = [];
    const seenIds = new Set<string>();

    for (const reg of allRegistrations) {
      const config =
        typeof reg.menu === "function" ? reg.menu(context) : reg.menu;

      // Deduplicate items by ID (prevents HMR duplicates)
      for (const item of config) {
        const itemId =
          "id" in item ? item.id : `divider-${mergedConfig.length}`;
        if (!seenIds.has(itemId)) {
          seenIds.add(itemId);
          mergedConfig.push(item);
        }
      }
    }

    return mergedConfig;
  }

  extend(
    contextType: ContextType,
    items: MenuConfig,
    route?: string | RegExp,
    priority = 10
  ) {
    this.register({
      contextType,
      route,
      priority,
      menu: items,
    });
  }

  clear() {
    this.registrations.clear();
  }

  private getRouteKey(route?: string | RegExp): string {
    if (!route) return "*";
    if (typeof route === "string") return route;
    return `regex:${route.source}`;
  }
}

export const contextMenuRegistry = new ContextMenuRegistry();
