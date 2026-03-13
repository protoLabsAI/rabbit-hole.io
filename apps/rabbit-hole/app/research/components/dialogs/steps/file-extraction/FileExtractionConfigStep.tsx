"use client";

import { useState, useCallback, useRef } from "react";

import { domainRegistry } from "@proto/types";
import { Button, Slider } from "@proto/ui/atoms";
import { DomainEntityTypeSelector } from "@proto/ui/organisms";

export interface FileExtractionConfig {
  file: File;
  selectedDomains: string[];
  selectedEntityTypes?: string[];
  maxEntities: number;
}

interface FileExtractionConfigStepProps {
  onConfirm: (config: FileExtractionConfig) => void;
  onCancel: () => void;
}

export function FileExtractionConfigStep({
  onConfirm,
  onCancel,
}: FileExtractionConfigStepProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>([]);
  const [maxEntities, setMaxEntities] = useState(25);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setError(null);

      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        setError("File exceeds 10MB limit");
        return;
      }

      // Validate file type
      const supportedTypes = [".txt", ".pdf", ".docx", ".md"];
      const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (!supportedTypes.includes(fileExt)) {
        setError(
          `Unsupported file type. Please use: ${supportedTypes.join(", ")}`
        );
        return;
      }

      setSelectedFile(file);
    },
    []
  );

  const handleConfirm = () => {
    if (!selectedFile) {
      setError("Please select a file");
      return;
    }

    // Get domains from selected entity types
    const selectedDomains =
      selectedEntityTypes.length > 0
        ? Array.from(
            new Set(
              selectedEntityTypes
                .map((t) => domainRegistry.getDomainFromEntityType(t))
                .filter(Boolean) as string[]
            )
          )
        : [];

    onConfirm({
      file: selectedFile,
      selectedDomains,
      selectedEntityTypes:
        selectedEntityTypes.length > 0 ? selectedEntityTypes : undefined,
      maxEntities,
    });
  };

  return (
    <div className="space-y-4">
      {/* File Selection */}
      <div className="space-y-3">
        <div className="text-sm font-medium">Select File</div>
        <div className="text-xs text-muted-foreground">
          Supported formats: .txt, .pdf, .docx, .md (max 10MB)
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf,.docx,.md"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="w-full"
        >
          {selectedFile ? "Change File" : "Choose File"}
        </Button>

        {selectedFile && (
          <div className="p-3 rounded-lg bg-muted">
            <div className="font-medium text-sm">{selectedFile.name}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </div>
          </div>
        )}
      </div>

      {/* Entity Type Selection */}
      <div className="space-y-3">
        <div className="text-sm font-medium">
          Entity Types to Extract ({selectedEntityTypes.length} selected)
        </div>
        <div className="border border-border rounded-lg h-72 overflow-hidden">
          <DomainEntityTypeSelector
            selectedEntityTypes={selectedEntityTypes}
            onSelectionChange={setSelectedEntityTypes}
            mode="select"
            compact
            minSelection={1}
            presets={[
              {
                label: "Common",
                types: ["Person", "Organization", "Event", "Location"],
                icon: "users",
              },
            ]}
          />
        </div>
      </div>

      {/* Max Entities Slider */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Max Entities</span>
          <span className="text-muted-foreground">{maxEntities}</span>
        </div>
        <Slider
          value={[maxEntities]}
          onValueChange={([value]) => setMaxEntities(value)}
          min={10}
          max={100}
          step={5}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!selectedFile || selectedEntityTypes.length === 0}
        >
          Extract Entities
        </Button>
      </div>
    </div>
  );
}
