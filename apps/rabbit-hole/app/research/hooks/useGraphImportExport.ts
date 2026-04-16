/**
 * Graph Import/Export Hook
 *
 * Extracted from GraphCanvasIntegrated to reduce file size.
 * Handles bundle import/export logic with validation and user prompts.
 */

import type Graph from "graphology";
import { useCallback, useRef, useState } from "react";

import type { UserTier } from "@protolabsai/auth/client";
import { logUserAction } from "@protolabsai/logger";
import type { RabbitHoleBundleData } from "@protolabsai/types";
import { useToast } from "@protolabsai/ui/hooks";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "@/graph-visualizer/model/graph";

import { useConfirmDialog } from "../components/ConfirmDialog";
import {
  exportBundleFiltered,
  downloadRabbitHoleBundle,
} from "../lib/bundle-exporter";
import { importBundle, parseImportFile } from "../lib/bundle-importer";

interface UseGraphImportExportOptions {
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>;
  data: any;
  hiddenEntityTypes: string[];
  userId?: string;
  userTier?: UserTier;
  onGraphChange: () => void;
  onDataChange: (data: any) => void;
}

export function useGraphImportExport({
  graph,
  data,
  hiddenEntityTypes,
  userId,
  userTier,
  onGraphChange,
  onDataChange,
}: UseGraphImportExportOptions) {
  const { toast } = useToast();
  const { confirm: confirmDialog } = useConfirmDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const handleImport = useCallback(() => {
    setShowImportDialog(true);
  }, []);

  const handleExport = useCallback(() => {
    try {
      const bundle = exportBundleFiltered(
        graph,
        {
          sessionId: Date.now().toString(),
          sessionName: "Research Export",
        },
        {
          hiddenEntityTypes: new Set(hiddenEntityTypes),
          includeHidden: false,
        }
      );

      if (userId) {
        const sessionId =
          typeof window !== "undefined"
            ? sessionStorage.getItem("sessionId") || undefined
            : undefined;

        logUserAction({
          action: "graph_export",
          page: "/research",
          userId,
          tier: userTier,
          sessionId,
          value: {
            entityCount: bundle.entities.length,
            relationshipCount: bundle.relationships.length,
          },
        });
      }

      const timestamp = new Date().toISOString().split("T")[0];
      downloadRabbitHoleBundle(bundle, `research-export-${timestamp}.json`);

      toast({
        title: "Export Complete",
        description: `Downloaded ${bundle.entities.length} entities, ${bundle.relationships.length} relationships`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [graph, hiddenEntityTypes, toast, userId, userTier]);

  const handleImportComplete = useCallback(
    (result: any) => {
      const totalImported =
        (result.entitiesAdded || 0) +
        (result.contentAdded || 0) +
        (result.evidenceAdded || 0) +
        (result.filesAdded || 0);

      if (totalImported > 0 || (result.relationshipsAdded || 0) > 0) {
        toast({
          title: "Import Complete",
          description: `Imported ${totalImported} entities, ${result.relationshipsAdded || 0} relationships`,
        });
      }

      if (result.warnings && result.warnings.length > 0) {
        toast({
          title: "Import Warnings",
          description: `${result.warnings.length} warning(s) during import`,
          variant: "default",
        });
      }

      if (result.errors && result.errors.length > 0) {
        toast({
          title: "Import Errors",
          description: `${result.errors.length} error(s) during import`,
          variant: "destructive",
        });
      }

      setTimeout(() => {
        setShowImportDialog(false);
      }, 2000);
    },
    [toast]
  );

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      let bundleData: RabbitHoleBundleData;
      try {
        const { data, validation } = await parseImportFile(file);

        if (!validation.isValid) {
          toast({
            title: "Import Failed",
            description: `Validation errors: ${validation.errors.map((e: any) => e.message).join(", ")}`,
            variant: "destructive",
          });
          return;
        }

        bundleData = data;
      } catch (error) {
        toast({
          title: "Import Failed",
          description: error instanceof Error ? error.message : "Invalid file",
          variant: "destructive",
        });
        return;
      }

      let importMode: "merge" | "replace" | "overwrite" = "merge";

      if (graph.order > 0) {
        const entityCount = bundleData.entities?.length || 0;
        const currentCount = graph.order;

        // First confirmation: offer merge as safe default
        const mergeConfirmed = await confirmDialog({
          title: "Import to existing graph",
          description: `Current graph has ${currentCount} entities. Import will add ${entityCount} entities from "${file.name}". Merge will keep all existing entities.`,
          confirmText: "Merge (Recommended)",
          cancelText: "Cancel",
          variant: "default",
        });

        if (!mergeConfirmed) {
          // User canceled the import
          return;
        }

        importMode = "merge";
      }

      setIsImporting(true);

      try {
        const result = await importBundle(graph, bundleData, {
          mode: importMode,
        });

        if (userId) {
          const sessionId =
            typeof window !== "undefined"
              ? sessionStorage.getItem("sessionId") || undefined
              : undefined;

          logUserAction({
            action: "graph_import",
            page: "/research",
            userId,
            tier: userTier,
            sessionId,
            value: {
              mode: importMode,
              entitiesImported: result.entitiesAdded,
              relationshipsImported: result.relationshipsAdded,
            },
          });
        }

        onGraphChange();

        const totalImported =
          result.entitiesAdded +
          result.contentAdded +
          result.evidenceAdded +
          result.filesAdded;

        toast({
          title: "Import Complete",
          description: `Imported ${totalImported} entities, ${result.relationshipsAdded} relationships`,
        });

        console.log("✅ Import completed:", {
          entitiesAdded: result.entitiesAdded,
          contentAdded: result.contentAdded,
          evidenceAdded: result.evidenceAdded,
          filesAdded: result.filesAdded,
          relationshipsAdded: result.relationshipsAdded,
        });

        if (result.warnings.length > 0) {
          console.warn("⚠️ Import warnings:", result.warnings);
        }

        if (result.errors.length > 0) {
          console.error("❌ Import errors:", result.errors);
        }
      } catch (error) {
        toast({
          title: "Import Failed",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [graph, onGraphChange, toast, userId, userTier, confirmDialog]
  );

  return {
    fileInputRef,
    isImporting,
    showImportDialog,
    setShowImportDialog,
    handleImport,
    handleExport,
    handleFileSelect,
    handleImportComplete,
  };
}
