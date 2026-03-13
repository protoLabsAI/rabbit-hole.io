"use client";

import type Graph from "graphology";
import { useState, useCallback, useEffect } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@proto/ui/atoms";
import { useToast } from "@proto/ui/hooks";
import { MultiStepDialog, MultiStepDialogStep } from "@proto/ui/organisms";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "@/graph-visualizer/model/graph";

import {
  EntityNameInputStep,
  EntityResearchProgressStep,
  EntityResearchReviewStep,
  type EntityResearchConfig,
  type EntityResearchResult,
} from "../steps/entity-research";
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
  properties: Record<string, unknown>;
  _confidence: number;
}

interface ResearchWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>;
  onComplete: (
    entities: ExtractedEntity[],
    source: string,
    bundle?: any
  ) => void;
}

export function ResearchWizardDialog({
  open,
  onOpenChange,
  graph,
  onComplete,
}: ResearchWizardDialogProps) {
  const [researchMode, setResearchMode] = useState<"entity" | "file">("entity");
  const [currentStep, setCurrentStep] = useState<
    "config" | "loading" | "review"
  >("config");

  // Entity research state
  const [entityConfig, setEntityConfig] = useState<EntityResearchConfig | null>(
    null
  );
  const [entityResult, setEntityResult] = useState<EntityResearchResult | null>(
    null
  );

  // File extraction state
  const [_fileConfig, setFileConfig] = useState<FileExtractionConfig | null>(
    null
  );
  const [fileResult, setFileResult] = useState<ExtractionResult | null>(null);

  const [loadingStatus, setLoadingStatus] = useState({
    message: "",
    progress: 0,
    phase: undefined as string | undefined,
    phaseDetails: [] as string[],
  });
  const { toast } = useToast();

  // Reset on open
  useEffect(() => {
    if (open) {
      setResearchMode("entity");
      setCurrentStep("config");
      setEntityConfig(null);
      setEntityResult(null);
      setFileConfig(null);
      setFileResult(null);
      setLoadingStatus({
        message: "",
        progress: 0,
        phase: undefined,
        phaseDetails: [],
      });
    }
  }, [open]);

  const steps = [
    {
      id: "config",
      title:
        researchMode === "entity" ? "Research Entity" : "Extract from File",
      description:
        researchMode === "entity"
          ? "Enter entity name to research from Wikipedia"
          : "Select file and configure extraction",
    },
    {
      id: "loading",
      title:
        researchMode === "entity"
          ? "Researching Entity"
          : "Extracting Entities",
      description:
        researchMode === "entity"
          ? "Fetching from Wikipedia and discovering relationships"
          : "Processing file and discovering entities",
    },
    {
      id: "review",
      title: "Review Results",
      description: "Review and select entities to import",
    },
  ];

  // Entity research flow - using streaming endpoint
  const handleEntityResearch = useCallback(
    async (selectedConfig: EntityResearchConfig) => {
      setEntityConfig(selectedConfig);
      setCurrentStep("loading");

      const phaseLog: string[] = [];

      try {
        setLoadingStatus({
          message: `Researching ${selectedConfig.entityNames?.length || 1} entities...`,
          progress: 5,
          phase: "init",
          phaseDetails: [],
        });

        // Use streaming research graph endpoint
        const formData = new FormData();
        formData.append(
          "entityNames",
          selectedConfig.entityNames?.join(", ") || selectedConfig.entityName
        );
        formData.append(
          "sources",
          JSON.stringify(selectedConfig.sources || ["wikipedia"])
        );
        if (selectedConfig.domains && selectedConfig.domains.length > 0) {
          formData.append("domains", JSON.stringify(selectedConfig.domains));
        }
        if (
          selectedConfig.entityTypes &&
          selectedConfig.entityTypes.length > 0
        ) {
          formData.append(
            "entityTypes",
            JSON.stringify(selectedConfig.entityTypes)
          );
        }
        formData.append(
          "maxEntities",
          String(selectedConfig.maxEntities || 50)
        );

        const response = await fetch("/api/research/graph/stream", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Research failed");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("Stream not available");
        }

        let finalData: any = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const eventData = JSON.parse(line.slice(6));

              // Add to phase log
              if (eventData.message && eventData.phase !== "done") {
                phaseLog.push(eventData.message);
              }

              setLoadingStatus({
                message: eventData.message,
                progress: eventData.progress,
                phase: eventData.phase,
                phaseDetails: [...phaseLog],
              });

              if (eventData.phase === "done") {
                finalData = eventData.details;
              }

              if (eventData.phase === "error") {
                throw new Error(eventData.message);
              }
            }
          }
        }

        if (!finalData) {
          throw new Error("No final data received");
        }

        // Convert bundle format to wizard result format
        const entities: ExtractedEntity[] = finalData.bundle.entities.map(
          (e: any) => ({
            uid: e.uid,
            type: e.type,
            name: e.name || e.displayName || "",
            properties: e.properties || {},
            _confidence: 0.9,
          })
        );

        const result: EntityResearchResult = {
          entity: entities[0] || {
            uid: `${selectedConfig.entityType}:${selectedConfig.entityName.toLowerCase().replace(/\s+/g, "_")}`,
            type: selectedConfig.entityType,
            name: selectedConfig.entityName,
            properties: {},
            _confidence: 0.5,
          },
          entities,
          relationships: finalData.bundle.relationships || [],
          wikipediaContent: "",
          source: selectedConfig.sources?.join(", ") || "Wikipedia",
          bundle: finalData.bundle, // Include full bundle with evidence
        };

        setEntityResult(result);

        toast({
          title: "Research Complete",
          description: `Found ${entities.length} entities from ${finalData.stats.sourcesUsed.join(", ")}`,
        });

        setCurrentStep("review");
      } catch (error) {
        console.error("Entity research error:", error);
        setCurrentStep("config");
        toast({
          title: "Research Failed",
          description:
            error instanceof Error ? error.message : "Research failed",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  // File extraction flow (existing)
  const handleFileExtraction = useCallback(
    async (selectedConfig: FileExtractionConfig) => {
      setFileConfig(selectedConfig);
      setCurrentStep("loading");

      try {
        setLoadingStatus({
          message: "Uploading file...",
          progress: 10,
          phase: undefined,
          phaseDetails: [],
        });

        const formData = new FormData();
        formData.append("file", selectedConfig.file);
        formData.append(
          "domains",
          JSON.stringify(selectedConfig.selectedDomains)
        );
        formData.append("maxEntities", String(selectedConfig.maxEntities));

        setLoadingStatus({
          message: "Extracting entities...",
          progress: 30,
          phase: undefined,
          phaseDetails: [],
        });

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
          message: "Processing results...",
          progress: 80,
          phase: undefined,
          phaseDetails: [],
        });

        const result = await response.json();

        // Deduplicate entities
        const seenUids = new Set<string>();
        const deduplicatedEntities = result.entities.filter(
          (entity: ExtractedEntity) => {
            if (seenUids.has(entity.uid)) return false;
            seenUids.add(entity.uid);
            return true;
          }
        );

        const finalResult: ExtractionResult = {
          ...result,
          entities: deduplicatedEntities,
        };

        setFileResult(finalResult);
        setLoadingStatus({
          message: "Ready for review",
          progress: 100,
          phase: undefined,
          phaseDetails: [],
        });

        if (deduplicatedEntities.length === 0) {
          toast({
            title: "No Entities Found",
            description: "No extractable entities found in the file.",
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
        console.error("File extraction error:", error);
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
      const result = researchMode === "entity" ? entityResult : fileResult;
      if (!result) return;

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

      const source =
        researchMode === "entity"
          ? `Wikipedia: ${entityConfig?.entityName}`
          : fileResult?.fileName || "File";

      // Pass full bundle if available (includes evidence nodes)
      const bundle = (result as any).bundle;
      onComplete(newEntities, source, bundle);
      onOpenChange(false);
    },
    [
      researchMode,
      entityResult,
      fileResult,
      entityConfig,
      _fileConfig,
      graph,
      onComplete,
      onOpenChange,
      toast,
    ]
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
        <div className="space-y-4">
          <Tabs
            value={researchMode}
            onValueChange={(value) =>
              setResearchMode(value as "entity" | "file")
            }
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entity">Entity Name</TabsTrigger>
              <TabsTrigger value="file">Upload File</TabsTrigger>
            </TabsList>

            <TabsContent value="entity" className="mt-4">
              <EntityNameInputStep
                onConfirm={handleEntityResearch}
                onCancel={() => onOpenChange(false)}
              />
            </TabsContent>

            <TabsContent value="file" className="mt-4">
              <FileExtractionConfigStep
                onConfirm={handleFileExtraction}
                onCancel={() => onOpenChange(false)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </MultiStepDialogStep>

      <MultiStepDialogStep stepId="loading" currentStep={currentStep}>
        {researchMode === "entity" ? (
          <EntityResearchProgressStep
            status={loadingStatus.message}
            progress={loadingStatus.progress}
            phase={loadingStatus.phase}
            phaseDetails={loadingStatus.phaseDetails}
          />
        ) : (
          <FileExtractionProgressStep
            status={loadingStatus.message}
            progress={loadingStatus.progress}
          />
        )}
      </MultiStepDialogStep>

      <MultiStepDialogStep stepId="review" currentStep={currentStep}>
        {researchMode === "entity" && entityResult ? (
          <EntityResearchReviewStep
            result={entityResult}
            graph={graph}
            onBack={handleReviewBack}
            onConfirm={handleReviewConfirm}
          />
        ) : researchMode === "file" && fileResult ? (
          <FileExtractionReviewStep
            extractionResult={fileResult}
            graph={graph}
            onBack={handleReviewBack}
            onConfirm={handleReviewConfirm}
          />
        ) : null}
      </MultiStepDialogStep>
    </MultiStepDialog>
  );
}
