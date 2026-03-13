/**
 * useGraphCanvasBundleImport - Auto-import bundle from URL
 *
 * Handles automatic import of pending bundles (entities from URL params)
 */

import type Graph from "graphology";
import { useEffect, useRef } from "react";

import type { RabbitHoleBundleData } from "@proto/types";
import { useToast } from "@proto/ui/hooks";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "@/graph-visualizer/model/graph";
import { vlog } from "@/lib/verbose-logger";

import type { GraphLayout } from "../../../hooks/useGraphLayout";
import { importBundle } from "../../../lib/bundle-importer";
import { applyForceLayout } from "../../../lib/layoutAlgorithms";

interface UseGraphCanvasBundleImportProps {
  pendingBundle: RabbitHoleBundleData | null;
  importMode: "merge" | "replace" | "overwrite";
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>;
  pendingBundleImported: React.MutableRefObject<boolean>;
  setCurrentLayout: (layout: GraphLayout) => void;
  setGraphVersion: React.Dispatch<React.SetStateAction<number>>;
}

export function useGraphCanvasBundleImport({
  pendingBundle,
  importMode,
  graph,
  pendingBundleImported,
  setCurrentLayout,
  setGraphVersion,
}: UseGraphCanvasBundleImportProps) {
  const { toast } = useToast();
  const lastImportedBundle = useRef<RabbitHoleBundleData | null>(null);

  // Auto-import pending bundle from URL
  useEffect(() => {
    if (pendingBundle !== lastImportedBundle.current) {
      pendingBundleImported.current = false;
      lastImportedBundle.current = pendingBundle;
    }

    if (!pendingBundle || pendingBundleImported.current) return;

    let isMounted = true;

    const performImport = async () => {
      try {
        pendingBundleImported.current = true;
        const entityCount = pendingBundle.entities?.length ?? 0;
        vlog.log("📥 Auto-importing bundle", { entityCount });

        const result = await importBundle(graph, pendingBundle, {
          mode: importMode,
          applyLayout: false,
          skipEnforcement: false,
        });

        if (!isMounted) return;

        vlog.log("✅ Auto-import complete", {
          entitiesAdded: result.entitiesAdded,
          relationshipsAdded: result.relationshipsAdded,
          warnings: result.warnings.length,
          errors: result.errors.length,
        });

        const layoutApplied = applyForceLayout(graph, {
          strength: -800,
          distance: 250,
          collisionRadius: 120,
        });

        if (layoutApplied) {
          vlog.log("✨ Force layout applied");
          setCurrentLayout("manual");
        }

        toast({
          title: "Entity Imported",
          description: `Loaded ${result.entitiesAdded} entities, ${result.relationshipsAdded} relationships`,
        });

        setGraphVersion((v) => v + 1);

        setTimeout(() => {
          if (isMounted) {
            window.dispatchEvent(new CustomEvent("research:canvas:fit-view"));
          }
        }, 100);
      } catch (error) {
        if (!isMounted) return;

        pendingBundleImported.current = false;
        vlog.error("❌ Auto-import failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        toast({
          title: "Import Failed",
          description:
            error instanceof Error ? error.message : "Failed to import entity",
          variant: "destructive",
        });
      }
    };

    performImport();

    return () => {
      isMounted = false;
    };
  }, [
    pendingBundle,
    importMode,
    graph,
    toast,
    setCurrentLayout,
    setGraphVersion,
  ]);

  return {
    isImporting: pendingBundle && !pendingBundleImported.current,
  };
}
