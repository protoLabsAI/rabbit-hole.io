"use client";

import type Graph from "graphology";
import { useState, useCallback, useEffect } from "react";

import { useToast } from "@protolabsai/ui/hooks";
import {
  MultiStepDialog,
  MultiStepDialogStep,
} from "@protolabsai/ui/organisms";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "@/graph-visualizer/model/graph";

import {
  FileExtractionConfigStep,
  FileExtractionProgressStep,
  FileExtractionReviewStep,
  type FileExtractionConfig,
  type ExtractionResult,
} from "../steps/file-extraction";

interface ExtractedEntity {
  uid: string;
  type: string;
  name: string;
  properties: Record<string, any>;
  _confidence: number;
}

interface FileExtractionWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>;
  onComplete: (entities: ExtractedEntity[], fileName: string) => void;
}

export function FileExtractionWizardDialog({
  open,
  onOpenChange,
  graph,
  onComplete,
}: FileExtractionWizardDialogProps) {
  const [currentStep, setCurrentStep] = useState<
    "config" | "loading" | "review"
  >("config");
  const [config, setConfig] = useState<FileExtractionConfig | null>(null);
  const [extractionResult, setExtractionResult] =
    useState<ExtractionResult | null>(null);
  const [loadingStatus, setLoadingStatus] = useState({
    message: "",
    progress: 0,
  });
  const { toast } = useToast();

  // Reset on open
  useEffect(() => {
    if (open) {
      setCurrentStep("config");
      setConfig(null);
      setExtractionResult(null);
      setLoadingStatus({ message: "", progress: 0 });
    }
  }, [open]);

  const steps = [
    {
      id: "config",
      title: "Extract Entities from File",
      description: "Select file and configure extraction",
    },
    {
      id: "loading",
      title: "Extracting Entities",
      description: "Processing file and discovering entities",
    },
    {
      id: "review",
      title: "Review Entities",
      description: "Review and select entities to import",
    },
  ];

  const handleConfigConfirm = useCallback(
    async (selectedConfig: FileExtractionConfig) => {
      setConfig(selectedConfig);
      setCurrentStep("loading");

      try {
        // Phase 1: Text extraction
        setLoadingStatus({
          message: "Uploading file...",
          progress: 5,
        });

        await new Promise((resolve) => setTimeout(resolve, 300));

        setLoadingStatus({
          message: "Extracting text from document...",
          progress: 10,
        });

        // Prepare form data
        const formData = new FormData();
        formData.append("file", selectedConfig.file);
        formData.append(
          "domains",
          JSON.stringify(selectedConfig.selectedDomains)
        );
        formData.append("maxEntities", String(selectedConfig.maxEntities));

        setLoadingStatus({
          message: "Text extraction complete",
          progress: 20,
        });

        // Phase 2: Entity discovery
        setLoadingStatus({
          message: "Discovering entities in text...",
          progress: 30,
        });

        // Call extraction API
        const response = await fetch("/api/research/extract-from-file", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();

          if (response.status === 403) {
            toast({
              title: "Upgrade Required",
              description: errorData.message,
              variant: "destructive",
            });
            setCurrentStep("config");
            return;
          }

          throw new Error(errorData.error || "Extraction failed");
        }

        setLoadingStatus({
          message: "Entity discovery complete",
          progress: 50,
        });

        // Phase 3: Structuring
        setLoadingStatus({
          message: "Structuring entity data...",
          progress: 60,
        });

        const result = await response.json();

        setLoadingStatus({
          message: "Structuring complete",
          progress: 80,
        });

        // Phase 4: Enrichment
        setLoadingStatus({
          message: "Enriching entity properties...",
          progress: 85,
        });

        await new Promise((resolve) => setTimeout(resolve, 500));

        setLoadingStatus({
          message: "Enrichment complete",
          progress: 95,
        });

        // Phase 5: Finalize
        setLoadingStatus({
          message: "Preparing results...",
          progress: 98,
        });

        await new Promise((resolve) => setTimeout(resolve, 300));

        // Deduplicate entities by uid
        const seenUids = new Set<string>();
        const deduplicatedEntities = result.entities.filter(
          (entity: ExtractedEntity) => {
            if (seenUids.has(entity.uid)) {
              return false;
            }
            seenUids.add(entity.uid);
            return true;
          }
        );

        const finalResult: ExtractionResult = {
          ...result,
          entities: deduplicatedEntities,
        };

        setExtractionResult(finalResult);
        setLoadingStatus({
          message: "Ready for review",
          progress: 100,
        });

        // Check if no entities found
        if (deduplicatedEntities.length === 0) {
          toast({
            title: "No Entities Found",
            description:
              "No extractable entities found in the file. Try a different file or adjust domain selection.",
          });
          setCurrentStep("config");
          return;
        }

        toast({
          title: "Extraction Complete",
          description: `Found ${deduplicatedEntities.length} entities`,
        });

        setCurrentStep("review");
      } catch (error) {
        console.error("Extraction error:", error);
        setCurrentStep("config");
        toast({
          title: "Extraction Failed",
          description:
            error instanceof Error ? error.message : "Extraction failed",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const handleReviewConfirm = useCallback(
    (selectedEntities: ExtractedEntity[]) => {
      if (!extractionResult) return;

      // Filter only new entities
      const newEntities = selectedEntities.filter(
        (entity) => !graph.hasNode(entity.uid)
      );

      if (newEntities.length === 0) {
        toast({
          title: "All Entities Exist",
          description: "All selected entities already exist in your graph",
        });
        onOpenChange(false);
        return;
      }

      onComplete(newEntities, extractionResult.fileName);
      onOpenChange(false);
    },
    [extractionResult, graph, onComplete, onOpenChange, toast]
  );

  const handleReviewBack = useCallback(() => {
    setCurrentStep("config");
  }, []);

  return (
    <MultiStepDialog
      open={open}
      onOpenChange={onOpenChange}
      steps={steps}
      currentStep={currentStep}
      onStepChange={(stepId) =>
        setCurrentStep(stepId as "config" | "loading" | "review")
      }
      allowClose={currentStep !== "loading"}
      showProgress={true}
    >
      <MultiStepDialogStep stepId="config" currentStep={currentStep}>
        <FileExtractionConfigStep
          onConfirm={handleConfigConfirm}
          onCancel={() => onOpenChange(false)}
        />
      </MultiStepDialogStep>

      <MultiStepDialogStep stepId="loading" currentStep={currentStep}>
        <FileExtractionProgressStep
          status={loadingStatus.message}
          progress={loadingStatus.progress}
        />
      </MultiStepDialogStep>

      <MultiStepDialogStep stepId="review" currentStep={currentStep}>
        {extractionResult && (
          <FileExtractionReviewStep
            extractionResult={extractionResult}
            graph={graph}
            onBack={handleReviewBack}
            onConfirm={handleReviewConfirm}
          />
        )}
      </MultiStepDialogStep>
    </MultiStepDialog>
  );
}
