/**
 * Research Mode Import Dialog
 *
 * Configuration dialog for importing Atlas entities into Research Mode.
 * Validates tier limits, previews entity counts, and allows customization
 * before opening in new tab.
 */

"use client";

import { useCallback, useState } from "react";

import type { UserTier } from "@proto/auth/client";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@proto/ui/atoms";

import { generateResearchUrl } from "@/research/utils/researchUrlGenerator";

import { ImportPreview } from "./ImportPreview";
import { TierLimitWarning } from "./TierLimitWarning";
import { useResearchImportValidation } from "./useResearchImportValidation";

interface ResearchModeImportDialogProps {
  isOpen: boolean;
  entityUid: string | null;
  entityName: string | null;
  onClose: () => void;
  userTier: UserTier;
}

export function ResearchModeImportDialog({
  isOpen,
  entityUid,
  entityName,
  onClose,
  userTier,
}: ResearchModeImportDialogProps) {
  // Configuration state
  const [hops, setHops] = useState(1);
  const [nodeLimit, setNodeLimit] = useState(50);
  const [entityTypes, setEntityTypes] = useState<string[] | null>(null);
  const [sentiments, setSentiments] = useState<string[] | null>(null);

  // Validation hook
  const { validation, isLoading, error } = useResearchImportValidation({
    entityUid: entityUid || "",
    hops,
    nodeLimit,
    entityTypes,
    sentiments,
    enabled: isOpen && !!entityUid,
  });

  const handleConfirm = useCallback(() => {
    if (!entityUid) return;

    const url = generateResearchUrl({
      entity: entityUid,
      settings: {
        hops,
        nodeLimit,
        sentiments,
        entityTypes,
      },
      showLabels: true,
      showEdgeLabels: true,
    });

    window.open(url, "_blank");
    onClose();
  }, [entityUid, hops, nodeLimit, sentiments, entityTypes, onClose]);

  const isBlocked =
    validation?.limits.entities.wouldExceed ||
    validation?.limits.relationships.wouldExceed;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import to Research Mode</DialogTitle>
          <DialogDescription>
            Configure ego network import for {entityName || "selected entity"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tier Limit Warning */}
          {validation && (
            <TierLimitWarning
              usage={{
                entities: validation.limits.entities.current,
                relationships: validation.limits.relationships.current,
              }}
              incoming={{
                entities: validation.preview.entities,
                relationships: validation.preview.relationships,
              }}
              limits={{
                maxEntities: validation.limits.entities.max,
                maxRelationships: validation.limits.relationships.max,
              }}
              tier={validation.tier}
            />
          )}

          {/* Configuration Controls */}
          <div className="space-y-4">
            <div>
              <label htmlFor="hops-range" className="text-sm font-medium">
                Hops: {hops} {hops === 0 ? "(center only)" : ""}
              </label>
              <input
                id="hops-range"
                type="range"
                min="0"
                max="3"
                value={hops}
                onChange={(e) => setHops(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="nodeLimit-range" className="text-sm font-medium">
                Node Limit: {nodeLimit}
              </label>
              <input
                id="nodeLimit-range"
                type="range"
                min="10"
                max="150"
                step="10"
                value={nodeLimit}
                onChange={(e) => setNodeLimit(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Preview */}
          <ImportPreview
            isLoading={isLoading}
            data={validation?.preview}
            limits={validation?.limits}
            error={error}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isBlocked || isLoading || validation === null || !!error}
          >
            {isBlocked ? "Upgrade Required" : "Open in Research Mode"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
