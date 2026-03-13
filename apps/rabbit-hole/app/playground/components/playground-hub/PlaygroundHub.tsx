"use client";

/**
 * Playground Hub
 *
 * Master component providing unified access to all playground components.
 * Features dynamic loading with automatic memory management.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState, useMemo, Suspense, useEffect } from "react";

import { Icon } from "@proto/icon-system";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@proto/ui/atoms";

import { usePlaygroundPageState } from "../../hooks/usePlaygroundPageState";

import { PlaygroundLoadingSkeleton } from "./components/PlaygroundLoadingSkeleton";
import { usePlaygroundLoader } from "./hooks/usePlaygroundLoader";
import {
  playgroundRegistry,
  getCategoriesWithCounts,
  getPlaygroundById,
} from "./registry";
import type {
  PlaygroundRegistryEntry,
  PlaygroundCategory,
} from "./registry/types";

// Create QueryClient for playgrounds
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 1000 * 60,
    },
  },
});

export interface PlaygroundHubProps {
  /**
   * Optional CSS class
   */
  className?: string;
}

export function PlaygroundHub({ className = "" }: PlaygroundHubProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<
    Set<PlaygroundCategory>
  >(
    new Set<PlaygroundCategory>([
      "ai-services",
      "media-processing",
      "data-extraction",
      "research-tools",
    ])
  );

  // URL state management with nuqs - enables browser back/forward and shareable links
  const { playgroundId, setPlaygroundId } = usePlaygroundPageState();

  const {
    Component: ActivePlayground,
    playgroundId: activePlaygroundId,
    isLoading,
    error,
    loadPlayground,
    unloadPlayground,
  } = usePlaygroundLoader({
    onLoad: (id) => console.log(`[PlaygroundHub] Loaded: ${id}`),
    onUnload: (id) => console.log(`[PlaygroundHub] Unloaded: ${id}`),
  });

  // Load playground based on URL state (managed by nuqs)
  useEffect(() => {
    if (playgroundId) {
      const entry = getPlaygroundById(playgroundId);
      if (entry) {
        loadPlayground(entry);
      } else {
        // Invalid/non-existent playground ID - unload stale state
        unloadPlayground();
      }
    } else {
      // Clear active playground when p parameter disappears
      unloadPlayground();
    }
  }, [playgroundId, loadPlayground, unloadPlayground]);

  // Filter playgrounds by search
  const filteredPlaygrounds = useMemo(() => {
    if (!searchQuery.trim()) {
      return playgroundRegistry.playgrounds;
    }

    const query = searchQuery.toLowerCase();
    return playgroundRegistry.playgrounds.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  // Group playgrounds by category
  const playgroundsByCategory = useMemo(() => {
    const grouped = new Map<PlaygroundCategory, PlaygroundRegistryEntry[]>();

    filteredPlaygrounds.forEach((playground) => {
      const list = grouped.get(playground.category) || [];
      list.push(playground);
      grouped.set(playground.category, list);
    });

    return grouped;
  }, [filteredPlaygrounds]);

  const categoriesWithCounts = getCategoriesWithCounts();

  const toggleCategory = (category: PlaygroundCategory) => {
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

  const handlePlaygroundClick = (entry: PlaygroundRegistryEntry) => {
    setPlaygroundId(entry.id);
  };

  // Delay content visibility when expanding to prevent text shift during animation
  useEffect(() => {
    if (sidebarCollapsed) {
      // Immediately hide when collapsing
      setContentVisible(false);
    } else {
      // Delay showing content until panel has mostly expanded
      const timer = setTimeout(() => setContentVisible(true), 150);
      return () => clearTimeout(timer);
    }
  }, [sidebarCollapsed]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className={`flex h-screen ${className}`}>
        {/* Side Navigation */}
        <div
          className={`border-r bg-card overflow-y-auto flex-shrink-0 transition-all duration-200 relative ${
            sidebarCollapsed ? "w-12" : "w-64"
          }`}
        >
          {/* Collapse Toggle Button */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute top-3 right-2 z-10 p-1 rounded hover:bg-accent transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icon
              name={sidebarCollapsed ? "chevron-right" : "chevron-left"}
              size={16}
              className="text-muted-foreground"
            />
          </button>

          {/* Collapsed View - Icon Only */}
          {sidebarCollapsed && (
            <div
              className={`p-2 pt-10 transition-opacity duration-150 ${
                !contentVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              {(() => {
                let visibleIndex = 0;
                return categoriesWithCounts.map((cat) => {
                  const categoryPlaygrounds =
                    playgroundsByCategory.get(cat.category) || [];
                  if (categoryPlaygrounds.length === 0 && !searchQuery) {
                    return null;
                  }
                  const isFirst = visibleIndex === 0;
                  visibleIndex++;
                  return (
                    <div key={cat.category}>
                      {!isFirst && (
                        <div className="my-2 border-t border-border" />
                      )}
                      <div className="space-y-1 py-1">
                        {categoryPlaygrounds.map((playground) => {
                          const isActive = playground.id === activePlaygroundId;
                          return (
                            <button
                              key={playground.id}
                              onClick={() => handlePlaygroundClick(playground)}
                              className={`w-full flex justify-center py-1.5 rounded transition-colors ${
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-accent"
                              }`}
                              title={playground.name}
                            >
                              <Icon name={playground.icon} size={16} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* Expanded View - Full Content */}
          {!sidebarCollapsed && (
            <div
              className={`p-4 space-y-4 transition-opacity duration-150 ${
                contentVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* Header */}
              <div className="pr-6">
                <h2 className="text-lg font-bold">Playground Hub</h2>
                <p className="text-xs text-muted-foreground">
                  Interactive testing tools
                </p>
              </div>

              {/* Search */}
              <Input
                placeholder="Search playgrounds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-sm"
              />

              {/* Categories */}
              <div>
                {(() => {
                  let visibleIndex = 0;
                  return categoriesWithCounts.map((cat) => {
                    const isExpanded = expandedCategories.has(cat.category);
                    const categoryPlaygrounds =
                      playgroundsByCategory.get(cat.category) || [];

                    if (categoryPlaygrounds.length === 0 && !searchQuery) {
                      return null;
                    }

                    const isFirst = visibleIndex === 0;
                    visibleIndex++;

                    return (
                      <div key={cat.category}>
                        {!isFirst && (
                          <div className="my-2 border-t border-border" />
                        )}
                        <div className="space-y-0.5">
                          {/* Category Header */}
                          <button
                            onClick={() => toggleCategory(cat.category)}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent text-sm font-semibold group"
                          >
                            <div className="flex items-center gap-2">
                              <span>{cat.label}</span>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1"
                              >
                                {categoryPlaygrounds.length}
                              </Badge>
                            </div>
                            <Icon
                              name={
                                isExpanded ? "chevron-down" : "chevron-right"
                              }
                              size={14}
                              className="text-muted-foreground"
                            />
                          </button>

                          {/* Playground List */}
                          {isExpanded && categoryPlaygrounds.length > 0 && (
                            <div className="ml-3 space-y-0.5">
                              {categoryPlaygrounds.map((playground) => {
                                const isActive =
                                  playground.id === activePlaygroundId;

                                return (
                                  <button
                                    key={playground.id}
                                    onClick={() =>
                                      handlePlaygroundClick(playground)
                                    }
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
                                    <Icon
                                      name={playground.icon}
                                      size={16}
                                      className="flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate text-xs">
                                        {playground.name}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground truncate">
                                        {playground.description}
                                      </div>
                                    </div>
                                    {playground.status === "experimental" && (
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
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Stats Footer */}
              <div className="pt-4 border-t text-[10px] text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Total Playgrounds</span>
                  <span className="font-mono">
                    {playgroundRegistry.playgrounds.length}
                  </span>
                </div>
                {activePlaygroundId && (
                  <div className="flex justify-between">
                    <span>Active</span>
                    <span className="font-mono truncate max-w-[120px]">
                      {activePlaygroundId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-background">
          {isLoading && <PlaygroundLoadingSkeleton />}

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
                    Try selecting a different playground or refresh the page.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {!isLoading && !error && !ActivePlayground && (
            <div className="overflow-auto h-full p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold">Playground Hub</h1>
                  <p className="text-muted-foreground">
                    Interactive testing environments for AI services, media
                    processing, and development tools. Select a playground to
                    begin.
                  </p>
                </div>

                {/* Playground Glossary */}
                <div className="space-y-6">
                  {categoriesWithCounts.map((cat) => {
                    const categoryPlaygrounds =
                      playgroundsByCategory.get(cat.category) || [];

                    if (categoryPlaygrounds.length === 0) return null;

                    return (
                      <div key={cat.category} className="space-y-3">
                        <div className="flex items-center gap-2 border-b pb-2">
                          <span className="text-2xl">{cat.icon}</span>
                          <h2 className="text-xl font-semibold">{cat.label}</h2>
                          <Badge variant="secondary">
                            {categoryPlaygrounds.length}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {categoryPlaygrounds.map((playground) => (
                            <Card
                              key={playground.id}
                              className="hover:border-primary/50 transition-colors cursor-pointer group"
                              onClick={() => handlePlaygroundClick(playground)}
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-start gap-3">
                                  <Icon
                                    name={playground.icon}
                                    size={32}
                                    className="text-primary flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                                      {playground.name}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {playground.description}
                                    </p>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="flex flex-wrap gap-1">
                                  {playground.tags?.map((tag) => (
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
                                      playground.status === "active"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {playground.status}
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

          {!isLoading && !error && ActivePlayground && (
            <Suspense fallback={<PlaygroundLoadingSkeleton />}>
              <ActivePlayground />
            </Suspense>
          )}
        </div>
      </div>
    </QueryClientProvider>
  );
}
