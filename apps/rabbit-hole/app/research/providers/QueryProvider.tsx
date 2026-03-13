"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

/**
 * QueryProvider for Research page
 *
 * Manages React Query client with optimized defaults for research workflows:
 * - 5s stale time for balance between freshness and performance
 * - Single retry attempt to fail fast
 * - Automatic garbage collection for inactive queries
 * - DevTools enabled in development
 *
 * @example
 * ```tsx
 * <QueryProvider>
 *   <ResearchPage />
 * </QueryProvider>
 * ```
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 5 seconds before marking as stale
            staleTime: 5000,
            // Retry failed queries once before giving up
            retry: 1,
            // Keep unused data for 5 minutes before garbage collection
            gcTime: 5 * 60 * 1000,
            // Don't refetch on window focus by default (opt-in per query)
            refetchOnWindowFocus: false,
            // Don't refetch on reconnect by default (opt-in per query)
            refetchOnReconnect: false,
          },
          mutations: {
            // Don't retry mutations by default (mutations should be idempotent or explicit)
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  );
}
