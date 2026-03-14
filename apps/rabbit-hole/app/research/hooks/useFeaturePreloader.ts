/**
 * Feature Preloader Hook
 *
 * Preloads paid features in background after page interactive.
 * Uses requestIdleCallback for non-blocking loads.
 */

import { useEffect } from "react";

import { getUserTierClient, getTierLimitsClient } from "@proto/auth/client";

interface PreloadConfig {
  featureFlag: keyof ReturnType<typeof getTierLimitsClient>;
  importFn: () => Promise<any>;
  priority?: number;
}

const PRELOAD_CONFIG: PreloadConfig[] = [
  {
    featureFlag: "hasAIChatAccess",
    importFn: () => import("@copilotkit/react-core"),
    priority: 1,
  },
  {
    featureFlag: "hasAIChatAccess",
    importFn: () => import("@copilotkit/react-ui"),
    priority: 2,
  },
];

export function useFeaturePreloader() {
  const user = { id: "local-user", firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], primaryEmailAddress: { emailAddress: "local@localhost" } } as any;
  const userTier = getUserTierClient(user || null);
  const tierLimits = getTierLimitsClient(userTier);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const preloadFeatures = () => {
      const features = PRELOAD_CONFIG.filter((config) =>
        Boolean(tierLimits[config.featureFlag])
      ).sort((a, b) => (a.priority || 999) - (b.priority || 999));

      if (features.length === 0) return;

      const loadNext = (index: number) => {
        if (index >= features.length) return;

        features[index]
          .importFn()
          .then(() => {
            console.log(
              `[Preloader] Loaded feature ${index + 1}/${features.length}`
            );
          })
          .catch((error) => {
            console.warn(`[Preloader] Failed to preload feature:`, error);
          })
          .finally(() => {
            // Load next feature
            if (index + 1 < features.length) {
              if ("requestIdleCallback" in window) {
                window.requestIdleCallback(() => loadNext(index + 1));
              } else {
                setTimeout(() => loadNext(index + 1), 100);
              }
            }
          });
      };

      // Start preloading
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(() => loadNext(0));
      } else {
        setTimeout(() => loadNext(0), 2000);
      }
    };

    if (document.readyState === "complete") {
      preloadFeatures();
    } else {
      window.addEventListener("load", preloadFeatures);
      return () => window.removeEventListener("load", preloadFeatures);
    }
  }, [tierLimits]);
}
