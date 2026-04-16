"use client";

import { useState, useCallback, useEffect } from "react";

import { useToast } from "@protolabsai/ui/hooks";
import {
  MultiStepDialog,
  MultiStepDialogStep,
} from "@protolabsai/ui/organisms";

import type { GraphNodeAttributes } from "@/graph-visualizer/model/graph";

import {
  EnrichmentConfigStep,
  type EnrichmentConfig,
} from "../steps/enrichment/EnrichmentConfigStep";
import { EnrichmentProgressStep } from "../steps/enrichment/EnrichmentProgressStep";
import { EnrichmentReviewStep } from "../steps/enrichment/EnrichmentReviewStep";

interface EnrichmentData {
  enrichedProperties: Record<string, any>;
  fieldsAdded: string[];
  fieldsNotFound: string[];
  wikipediaUrl: string;
}

interface EnrichmentWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: GraphNodeAttributes | null;
  onComplete: (approvedProperties: Record<string, any>) => void;
}

export function EnrichmentWizardDialog({
  open,
  onOpenChange,
  entity,
  onComplete,
}: EnrichmentWizardDialogProps) {
  const [currentStep, setCurrentStep] = useState<
    "config" | "loading" | "review"
  >("config");
  const [config, setConfig] = useState<EnrichmentConfig | null>(null);
  const [enrichmentData, setEnrichmentData] = useState<EnrichmentData | null>(
    null
  );
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
      setEnrichmentData(null);
      setLoadingStatus({ message: "", progress: 0 });
    }
  }, [open]);

  const steps = [
    {
      id: "config",
      title: `Research Entity: ${entity?.name}`,
      description: "Configure which fields to research from Wikipedia",
    },
    {
      id: "loading",
      title: "Researching Entity",
      description: "Fetching and analyzing Wikipedia data",
    },
    {
      id: "review",
      title: "Review Wikipedia Data",
      description: "Approve changes before updating entity",
    },
  ];

  const handleConfigConfirm = useCallback(
    async (selectedConfig: EnrichmentConfig) => {
      if (!entity) return;

      setConfig(selectedConfig);
      setCurrentStep("loading");

      try {
        setLoadingStatus({
          message: "Fetching Wikipedia article...",
          progress: 20,
        });

        const response = await fetch("/api/research/enrich-entity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityName: entity.name,
            entityType: entity.type,
            selectedFields: selectedConfig.selectedFields,
            context: selectedConfig.context,
          }),
        });

        setLoadingStatus({
          message: "Extracting fields from article...",
          progress: 60,
        });

        if (!response.ok) {
          throw new Error("Enrichment failed");
        }

        const result = await response.json();

        setLoadingStatus({ message: "Preparing results...", progress: 90 });
        await new Promise((resolve) => setTimeout(resolve, 500));

        setEnrichmentData(result);
        setCurrentStep("review");
      } catch (error) {
        console.error("Enrichment error:", error);
        setCurrentStep("config");
        toast({
          title: "Error",
          description: "Failed to enrich entity. Please try again.",
          variant: "destructive",
        });
      }
    },
    [entity, toast]
  );

  const handleReviewConfirm = useCallback(
    (approvedProperties: Record<string, any>) => {
      onComplete(approvedProperties);
      onOpenChange(false);
    },
    [onComplete, onOpenChange]
  );

  const handleReviewBack = useCallback(() => {
    setCurrentStep("config");
  }, []);

  if (!entity) return null;

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
        <EnrichmentConfigStep
          entity={entity}
          onConfirm={handleConfigConfirm}
          onCancel={() => onOpenChange(false)}
        />
      </MultiStepDialogStep>

      <MultiStepDialogStep stepId="loading" currentStep={currentStep}>
        <EnrichmentProgressStep
          status={loadingStatus.message}
          progress={loadingStatus.progress}
        />
      </MultiStepDialogStep>

      <MultiStepDialogStep stepId="review" currentStep={currentStep}>
        {enrichmentData && (
          <EnrichmentReviewStep
            entity={entity}
            enrichedProperties={enrichmentData.enrichedProperties}
            fieldsFound={enrichmentData.fieldsAdded}
            fieldsNotFound={enrichmentData.fieldsNotFound}
            wikipediaUrl={enrichmentData.wikipediaUrl}
            onBack={handleReviewBack}
            onConfirm={handleReviewConfirm}
          />
        )}
      </MultiStepDialogStep>
    </MultiStepDialog>
  );
}
