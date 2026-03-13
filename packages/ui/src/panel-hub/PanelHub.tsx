/**
 * Panel Hub Component
 *
 * A memory-efficient panel system that loads only one panel at a time.
 * Extracted from playground-hub pattern for monorepo-wide reusability.
 *
 * @example
 * ```tsx
 * const config = {
 *   panels: [
 *     {
 *       id: "files",
 *       name: "Files",
 *       description: "File management",
 *       category: "management",
 *       icon: "📁",
 *       importFn: () => import("./FilesPanel").then(m => ({ default: m.FilesPanel })),
 *     },
 *   ],
 *   categories: {
 *     management: {
 *       label: "Management",
 *       icon: "⚙️",
 *       description: "System management tools"
 *     }
 *   }
 * };
 *
 * <PanelHub
 *   config={config}
 *   defaultPanelId="files"
 *   title="Dashboard"
 *   subtitle="System management interface"
 * />
 * ```
 */

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useQueryState, parseAsString } from "nuqs";
import React, { useState, useMemo, Suspense, useEffect } from "react";

import { PanelLoadingSkeleton } from "./components/PanelLoadingSkeleton";
import { usePanelLoader } from "./hooks/usePanelLoader";
import type {
  PanelHubConfig,
  PanelRegistryEntry,
  PanelCategory,
} from "./types";
import {
  filterPanels,
  getCategoriesWithCounts,
  getPanelById,
} from "./utils/registry";

// Create QueryClient for panels
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 1000 * 60,
    },
  },
});

export interface PanelHubProps {
  /**
   * Panel registry configuration
   */
  config: PanelHubConfig;

  /**
   * Initial panel to load
   */
  defaultPanelId?: string;

  /**
   * Hub title
   * @default "Panel Hub"
   */
  title?: string;

  /**
   * Hub subtitle/description
   */
  subtitle?: string;

  /**
   * Optional CSS class
   */
  className?: string;

  /**
   * UI components (must be provided by consumer for now)
   */
  ui: {
    Badge: React.ComponentType<
      {
        variant?:
          | "default"
          | "secondary"
          | "destructive"
          | "success"
          | "warning"
          | "info"
          | "outline";
        className?: string;
        children?: React.ReactNode;
      } & Record<string, unknown>
    >;
    Card: React.ComponentType<React.HTMLAttributes<HTMLElement>>;
    CardContent: React.ComponentType<React.HTMLAttributes<HTMLElement>>;
    CardHeader: React.ComponentType<React.HTMLAttributes<HTMLElement>>;
    CardTitle: React.ComponentType<React.HTMLAttributes<HTMLElement>>;
    Input: React.ComponentType<React.InputHTMLAttributes<HTMLInputElement>>;
    Icon?: React.ComponentType<{
      name: string;
      size?: number;
      className?: string;
    }>;
  };

  /**
   * Filter function to determine which panels to show
   * (e.g., for admin-only panels)
   */
  filterPanel?: (panel: PanelRegistryEntry) => boolean;

  /**
   * Props to pass to all panels
   */
  panelProps?: Record<string, unknown>;

  /**
   * Disable URL state synchronization (useful for Storybook)
   * @default false
   */
  disableUrlState?: boolean;
}

export function PanelHub({
  config,
  defaultPanelId,
  title = "Panel Hub",
  subtitle = "Interactive management tools",
  className = "",
  ui,
  filterPanel = () => true,
  panelProps = {},
  disableUrlState = false,
}: PanelHubProps) {
  const { Badge, Card, CardContent, CardHeader, CardTitle, Input, Icon } = ui;

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<
    Set<PanelCategory>
  >(new Set<PanelCategory>(Object.keys(config.categories)));

  // Use nuqs for URL state management (single source of truth) or fallback to local state
  const [panelId, setPanelId] = disableUrlState
    ? useState<string | null>(null)
    : useQueryState("panel", parseAsString);

  const {
    Component: ActivePanel,
    panelId: activePanelId,
    isLoading,
    error,
    loadPanel,
  } = usePanelLoader({
    onLoad: (id) => console.log(`[PanelHub] Loaded: ${id}`),
    onUnload: (id) => console.log(`[PanelHub] Unloaded: ${id}`),
  });

  // Load panel based on URL state
  useEffect(() => {
    const targetId = panelId || defaultPanelId;
    if (targetId) {
      const entry = getPanelById(config, targetId);
      if (entry && filterPanel(entry)) {
        loadPanel(entry);
      }
    }
  }, [panelId, defaultPanelId, loadPanel, config, filterPanel]);

  // Filter panels by search and user filter
  const filteredPanels = useMemo(() => {
    const filtered = filterPanels(config.panels, searchQuery);
    return filtered.filter(filterPanel);
  }, [searchQuery, config.panels, filterPanel]);

  // Group panels by category
  const panelsByCategory = useMemo(() => {
    const grouped = new Map<PanelCategory, PanelRegistryEntry[]>();

    filteredPanels.forEach((panel) => {
      const list = grouped.get(panel.category) || [];
      list.push(panel);
      grouped.set(panel.category, list);
    });

    return grouped;
  }, [filteredPanels]);

  const categoriesWithCounts = getCategoriesWithCounts(config);

  const toggleCategory = (category: PanelCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handlePanelClick = (entry: PanelRegistryEntry) => {
    setPanelId(entry.id);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className={`flex h-screen ${className}`}>
        {/* Side Navigation */}
        <div className="w-64 border-r bg-card overflow-y-auto flex-shrink-0">
          <div className="p-4 space-y-4">
            {/* Header */}
            <div>
              <h2 className="text-lg font-bold">{title}</h2>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>

            {/* Search */}
            <Input
              placeholder="Search panels..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.target.value)
              }
              className="h-8 text-sm"
            />

            {/* Categories */}
            <div className="space-y-1">
              {categoriesWithCounts.map((cat) => {
                const isExpanded = expandedCategories.has(cat.category);
                const categoryPanels = panelsByCategory.get(cat.category) || [];

                if (categoryPanels.length === 0 && !searchQuery) {
                  return null;
                }

                return (
                  <div key={cat.category} className="space-y-0.5">
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(cat.category)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent text-sm font-semibold group"
                    >
                      <div className="flex items-center gap-2">
                        {Icon && (
                          <Icon
                            name={cat.icon}
                            size={16}
                            className="text-foreground flex-shrink-0"
                          />
                        )}
                        <span>{cat.label}</span>
                        <Badge variant="outline" className="text-[10px] px-1">
                          {categoryPanels.length}
                        </Badge>
                      </div>
                      {Icon && (
                        <Icon
                          name={isExpanded ? "chevron-down" : "chevron-right"}
                          size={14}
                          className="text-muted-foreground"
                        />
                      )}
                    </button>

                    {/* Panel List */}
                    {isExpanded && categoryPanels.length > 0 && (
                      <div className="ml-3 space-y-0.5">
                        {categoryPanels.map((panel) => {
                          const isActive = panel.id === activePanelId;

                          return (
                            <button
                              key={panel.id}
                              onClick={() => handlePanelClick(panel)}
                              className={`
                                w-full flex items-center gap-2 px-2 py-1.5 rounded text-left
                                transition-colors text-sm
                                ${
                                  isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-accent"
                                }
                              `}
                            >
                              {Icon && (
                                <Icon
                                  name={panel.icon}
                                  size={16}
                                  className="flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-xs">
                                  {panel.name}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {panel.description}
                                </div>
                              </div>
                              {panel.status === "experimental" && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1"
                                >
                                  Beta
                                </Badge>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Stats Footer */}
            <div className="pt-4 border-t text-[10px] text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Total Panels</span>
                <span className="font-mono">{config.panels.length}</span>
              </div>
              {activePanelId && (
                <div className="flex justify-between">
                  <span>Active</span>
                  <span className="font-mono truncate max-w-[120px]">
                    {activePanelId}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-background">
          {isLoading && <PanelLoadingSkeleton />}

          {error && (
            <div className="flex items-center justify-center h-full p-6">
              <Card className="border-destructive max-w-md">
                <CardHeader>
                  <CardTitle className="text-destructive">
                    Failed to Load
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-destructive">{error.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Try selecting a different panel or refresh the page.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {!isLoading && !error && !ActivePanel && (
            <div className="overflow-auto h-full p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold">{title}</h1>
                  <p className="text-muted-foreground">{subtitle}</p>
                </div>

                {/* Panel Glossary */}
                <div className="space-y-6">
                  {categoriesWithCounts.map((cat) => {
                    const categoryPanels =
                      panelsByCategory.get(cat.category) || [];

                    if (categoryPanels.length === 0) return null;

                    return (
                      <div key={cat.category} className="space-y-3">
                        <div className="flex items-center gap-2 border-b pb-2">
                          <span className="text-2xl">{cat.icon}</span>
                          <h2 className="text-xl font-semibold">{cat.label}</h2>
                          <Badge variant="secondary">
                            {categoryPanels.length}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {categoryPanels.map((panel) => (
                            <Card
                              key={panel.id}
                              className="hover:border-primary/50 transition-colors cursor-pointer group"
                              onClick={() => handlePanelClick(panel)}
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-start gap-3">
                                  {Icon && (
                                    <Icon
                                      name={panel.icon}
                                      size={32}
                                      className="text-primary flex-shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                                      {panel.name}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {panel.description}
                                    </p>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="flex flex-wrap gap-1">
                                  {panel.tags?.map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  <Badge
                                    variant={
                                      panel.status === "active"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {panel.status || "active"}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && ActivePanel && (
            <Suspense fallback={<PanelLoadingSkeleton />}>
              <ActivePanel {...panelProps} />
            </Suspense>
          )}
        </div>
      </div>
    </QueryClientProvider>
  );
}
