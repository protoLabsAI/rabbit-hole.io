"use client";

/**
 * LangExtract Playground
 *
 * Interactive component for testing the LangExtract service.
 * Demonstrates the useLangExtract hook with real-time extraction.
 */

import { useState } from "react";

import { useEnqueueLangExtract } from "@proto/sidequest-utils/client";
import { JobStatusTracker } from "@proto/sidequest-utils/components";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
  Textarea,
} from "@proto/ui/atoms";
import { useToast } from "@proto/ui/hooks";

import {
  useLangExtract,
  useLangExtractHealth,
  langextractConfig,
} from "../../client";

import { BasicExamples } from "./components/BasicExamples";
import { RabbitHoleBundleExamples } from "./components/RabbitHoleBundleExamples";

interface LangExtractPlaygroundProps {
  defaultText?: string;
  defaultPrompt?: string;
  defaultModelId?: string;
  defaultWorkspaceId?: string;
}

const DEFAULT_EXAMPLES = JSON.stringify(
  [
    {
      input_text: "Sample input text",
      expected_output: {
        field_name: "value",
        another_field: "value",
      },
    },
  ],
  null,
  2
);

export function LangExtractPlayground({
  defaultText = "Elon Musk is the CEO of Tesla and SpaceX. He was born in South Africa in 1971 and studied at the University of Pennsylvania.",
  defaultPrompt = "Extract person information including name, occupation, birthplace, birth year, and education",
  defaultModelId = langextractConfig.defaults.modelId,
  defaultWorkspaceId = "demo_workspace",
}: LangExtractPlaygroundProps) {
  const [text, setText] = useState(defaultText);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [modelId, setModelId] = useState(defaultModelId);
  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId);
  const [examplesJson, setExamplesJson] = useState(DEFAULT_EXAMPLES);
  const [examplesError, setExamplesError] = useState<string | null>(null);
  const [useJobQueue, setUseJobQueue] = useState(true);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<{
    success: boolean;
    data: unknown;
    metadata?: Record<string, unknown>;
    source_grounding?: unknown;
  } | null>(null);

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState<number>(0.0);
  const [includeSourceGrounding, setIncludeSourceGrounding] = useState(false);
  const [useSchemaConstraints, setUseSchemaConstraints] = useState(false);
  const [customSchemaJson, setCustomSchemaJson] = useState("");
  const [customSchemaError, setCustomSchemaError] = useState<string | null>(
    null
  );

  const { toast } = useToast();

  // Direct processing hook
  const {
    mutate: extract,
    isPending: isDirectLoading,
    error: directError,
    data: directData,
    reset: resetDirect,
  } = useLangExtract({
    onSuccess: (result) => {
      console.log("Extraction successful:", result);
    },
  });

  // Job queue hook
  const {
    mutate: enqueueExtract,
    isPending: isEnqueuing,
    error: enqueueError,
    reset: resetEnqueue,
  } = useEnqueueLangExtract();

  const {
    data: isAvailable,
    isLoading: isChecking,
    refetch: checkAvailability,
  } = useLangExtractHealth();

  const handleExtract = async () => {
    if (!text.trim() || !prompt.trim()) {
      return;
    }

    // Parse and validate examples if provided
    let examples:
      | Array<{ input_text: string; expected_output: unknown }>
      | undefined = undefined;
    let outputFormat: Record<string, unknown> | undefined = undefined;

    if (examplesJson.trim()) {
      try {
        const parsed = JSON.parse(examplesJson);

        // Validate examples shape
        if (!Array.isArray(parsed)) {
          setExamplesError(
            "Invalid examples format: must be an array of {input_text, expected_output}"
          );
          return;
        }

        for (const example of parsed) {
          if (
            typeof example !== "object" ||
            example === null ||
            typeof example.input_text !== "string" ||
            !example.expected_output
          ) {
            setExamplesError(
              "Invalid examples format: each item must have string input_text and expected_output properties"
            );
            return;
          }
        }

        examples = parsed;
        // For job queue, pass full examples array as customSchema
        // The LangExtractJob will pass these as proper examples to the service
        outputFormat = parsed[0]?.expected_output;
        setExamplesError(null);
      } catch (_e) {
        setExamplesError("Invalid JSON format");
        return;
      }
    }

    if (useJobQueue) {
      // Clear previous results
      setJobResult(null);

      // Parse custom schema if provided
      let customSchema: Record<string, any> | undefined;
      if (customSchemaJson.trim()) {
        try {
          customSchema = JSON.parse(customSchemaJson);
          setCustomSchemaError(null);
        } catch {
          setCustomSchemaError("Invalid JSON format");
          return;
        }
      }

      // Enqueue job for background processing
      enqueueExtract(
        {
          textContent: text,
          extractionPrompt: prompt,
          // Pass full examples array so LangExtract service can learn the schema properly
          examples: examples && examples.length > 0 ? examples : undefined,
          // Only use outputFormat as fallback if no examples provided
          outputFormat:
            !examples || examples.length === 0 ? outputFormat : undefined,
          workspaceId,
          modelId,
          temperature: temperature > 0 ? temperature : undefined,
          includeSourceGrounding,
          useSchemaConstraints,
          customSchema,
        },
        {
          onSuccess: (data) => {
            setCurrentJobId(data.jobId);
            console.log("Job enqueued:", data.jobId);
            toast({
              title: "Job Enqueued",
              description: `Extraction started. Job ID: ${data.jobId.slice(0, 8)}...`,
            });
          },
        }
      );
    } else {
      // Direct processing (original behavior)
      extract({
        textOrDocuments: [text],
        promptDescription: prompt,
        modelId,
        examples,
      });
    }
  };

  const handleJobComplete = (result: {
    success: boolean;
    extractedEntities: unknown;
    metadata?: Record<string, unknown>;
    sourceGrounding?: unknown;
  }) => {
    console.log("Job completed:", result);

    // Transform job result to match direct extraction format
    const transformedResult = {
      success: result.success,
      data: result.extractedEntities,
      metadata: result.metadata,
      source_grounding: result.sourceGrounding,
    };

    setJobResult(transformedResult);
    setCurrentJobId(null); // Clear job ID so tracker unmounts
    toast({
      title: "Extraction Complete",
      description: "The extraction job finished successfully.",
    });
  };

  const handleJobError = (error: string) => {
    console.error("Job failed:", error);
    toast({
      variant: "destructive",
      title: "Extraction Failed",
      description: error,
    });
  };

  const handleReset = () => {
    resetDirect();
    resetEnqueue();
    setCurrentJobId(null);
    setJobResult(null);
    setText(defaultText);
    setPrompt(defaultPrompt);
    setExamplesJson(DEFAULT_EXAMPLES);
    setExamplesError(null);
    setTemperature(0.0);
    setIncludeSourceGrounding(true);
    setUseSchemaConstraints(true);
    setCustomSchemaJson("");
    setCustomSchemaError(null);
    setShowAdvanced(false);
  };

  const isLoading = useJobQueue ? isEnqueuing : isDirectLoading;
  const error = useJobQueue ? enqueueError : directError;
  const data = useJobQueue ? jobResult : directData;

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">LangExtract Playground</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => checkAvailability()}
            disabled={isChecking}
          >
            {isChecking ? "Checking..." : "Check Service"}
          </Button>
          {isAvailable !== undefined && (
            <Badge variant={isAvailable ? "default" : "destructive"}>
              {isAvailable ? "Service Online" : "Service Offline"}
            </Badge>
          )}
        </div>
      </div>

      {/* Processing Mode Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="job-queue-mode" className="text-sm font-medium">
                Background Job Queue
              </Label>
              <p className="text-xs text-muted-foreground">
                {useJobQueue
                  ? "Jobs are processed in background queue with rate limiting (recommended)"
                  : "Direct processing with immediate response (testing only)"}
              </p>
            </div>
            <Switch
              id="job-queue-mode"
              checked={useJobQueue}
              onCheckedChange={(checked) => {
                setUseJobQueue(checked);
                setCurrentJobId(null);
                setJobResult(null);
                resetDirect();
                resetEnqueue();
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text">Text to Extract From</Label>
              <Textarea
                id="text"
                placeholder="Enter text to extract information from..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Extraction Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Describe what information to extract..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelId">Model ID</Label>
              <Input
                id="modelId"
                placeholder={`e.g., ${langextractConfig.defaults.modelId}`}
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspaceId">Workspace ID</Label>
              <Input
                id="workspaceId"
                placeholder="e.g., demo_workspace"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="examples">Output Format Examples (JSON)</Label>
                {examplesError && (
                  <span className="text-xs text-destructive">
                    {examplesError}
                  </span>
                )}
              </div>
              <Textarea
                id="examples"
                placeholder='[{"input_text": "...", "expected_output": {...}}]'
                value={examplesJson}
                onChange={(e) => {
                  setExamplesJson(e.target.value);
                  setExamplesError(null);
                }}
                rows={8}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Provide examples showing the exact output structure you want.
                This guides the LLM to format responses correctly.
              </p>
            </div>

            {/* Advanced Settings */}
            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm font-medium hover:underline"
              >
                {showAdvanced ? "▼" : "▶"} Advanced Settings
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4 pl-4 border-l-2">
                  <div className="space-y-2">
                    <Label htmlFor="temperature">
                      Temperature: {temperature.toFixed(2)}
                    </Label>
                    <input
                      type="range"
                      id="temperature"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onChange={(e) =>
                        setTemperature(parseFloat(e.target.value))
                      }
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Controls randomness. 0 = deterministic, 2 = very creative
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="source-grounding" className="text-sm">
                        Include Source Grounding
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Return text spans that support each extraction
                      </p>
                    </div>
                    <Switch
                      id="source-grounding"
                      checked={includeSourceGrounding}
                      onCheckedChange={setIncludeSourceGrounding}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="schema-constraints" className="text-sm">
                        Use Schema Constraints
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Enforce strict schema validation on output
                      </p>
                    </div>
                    <Switch
                      id="schema-constraints"
                      checked={useSchemaConstraints}
                      onCheckedChange={setUseSchemaConstraints}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="custom-schema">
                        Custom JSON Schema (Optional)
                      </Label>
                      {customSchemaError && (
                        <span className="text-xs text-destructive">
                          {customSchemaError}
                        </span>
                      )}
                    </div>
                    <Textarea
                      id="custom-schema"
                      placeholder='{"type": "object", "properties": {...}}'
                      value={customSchemaJson}
                      onChange={(e) => {
                        setCustomSchemaJson(e.target.value);
                        setCustomSchemaError(null);
                      }}
                      rows={6}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Override examples with explicit JSON Schema. Takes
                      precedence over examples.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleExtract}
                disabled={isLoading || !text.trim() || !prompt.trim()}
                className="flex-1"
              >
                {isLoading
                  ? useJobQueue
                    ? "Enqueueing..."
                    : "Extracting..."
                  : useJobQueue
                    ? "Enqueue Job"
                    : "Extract"}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>

            {/* Job Queue Status Tracker */}
            {useJobQueue && currentJobId && (
              <JobStatusTracker
                jobId={currentJobId}
                onComplete={handleJobComplete}
                onError={handleJobError}
              />
            )}
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card>
          <CardHeader>
            <CardTitle>Output</CardTitle>
          </CardHeader>
          <CardContent>
            {!useJobQueue && isLoading && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Extracting information...
                  </p>
                </div>
              </div>
            )}

            {!useJobQueue && error && (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                <h3 className="font-semibold text-destructive mb-2">Error</h3>
                <p className="text-sm text-destructive/90">{error.message}</p>
              </div>
            )}

            {useJobQueue && !currentJobId && (
              <div className="flex items-center justify-center h-64 text-center">
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Click &quot;Enqueue Job&quot; to start extraction via job
                    queue
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Jobs are processed sequentially to respect rate limits
                  </p>
                </div>
              </div>
            )}

            {data &&
              !isLoading &&
              !error &&
              (() => {
                const isEmpty =
                  (typeof data.data === "object" &&
                    !Array.isArray(data.data) &&
                    Object.keys(data.data).length === 0) ||
                  (Array.isArray(data.data) && data.data.length === 0);

                if (isEmpty) {
                  return (
                    <div className="flex items-center justify-center h-64 text-center">
                      <div className="space-y-2">
                        <p className="text-muted-foreground font-semibold">
                          No Data Extracted
                        </p>
                        <p className="text-sm text-muted-foreground">
                          The extraction returned no results. Try adjusting your
                          prompt or examples.
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h3 className="font-semibold mb-2">Extracted Data</h3>
                      <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap bg-background p-3 rounded border">
                        {JSON.stringify(data.data, null, 2)}
                      </pre>
                    </div>

                    {"source_grounding" in data &&
                      data.source_grounding &&
                      Array.isArray(data.source_grounding) &&
                      data.source_grounding.length > 0 && (
                        <div className="bg-muted/50 rounded-lg p-4">
                          <h3 className="font-semibold mb-2">
                            Source Grounding
                          </h3>
                          <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap bg-background p-3 rounded border">
                            {JSON.stringify(data.source_grounding, null, 2)}
                          </pre>
                        </div>
                      )}

                    {data.metadata && Object.keys(data.metadata).length > 0 && (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Metadata</h3>
                        <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap bg-background p-3 rounded border">
                          {JSON.stringify(data.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })()}

            {!useJobQueue && !data && !isLoading && !error && (
              <div className="flex items-center justify-center h-64 text-center">
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Enter text and click Extract to see results
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Examples Section */}
      <Card>
        <CardHeader>
          <CardTitle>Example Prompts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <BasicExamples
            onApply={(text, prompt, examples) => {
              setText(text);
              setPrompt(prompt);
              if (examples) setExamplesJson(examples);
            }}
          />
          <RabbitHoleBundleExamples
            onApply={(text, prompt, examples) => {
              setText(text);
              setPrompt(prompt);
              if (examples) setExamplesJson(examples);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
