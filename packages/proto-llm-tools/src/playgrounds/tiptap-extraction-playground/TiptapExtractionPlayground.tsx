"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@proto/ui";

import {
  useExtractionWorkflow,
  type ExtractionMode,
  type Entity,
} from "../../client";

import { EntitySidebar } from "./components/EntitySidebar";
import { ExtractionControls } from "./components/ExtractionControls";
import { ExtractionStats } from "./components/ExtractionStats";
import { EntityHighlight } from "./extensions/EntityHighlight";

export interface TiptapExtractionPlaygroundProps {
  defaultText?: string;
  defaultDomains?: string[];
  defaultMode?: ExtractionMode;
}

export function TiptapExtractionPlayground({
  defaultText = "",
  defaultDomains = ["social"],
  defaultMode = "enrich",
}: TiptapExtractionPlaygroundProps) {
  const [text, setText] = useState(defaultText);
  const [selectedDomains, setSelectedDomains] =
    useState<string[]>(defaultDomains);
  const [mode, setMode] = useState<ExtractionMode>(defaultMode);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.75);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, EntityHighlight],
    content: text,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4",
      },
    },
    onUpdate: ({ editor }) => {
      setText(editor.getText());
    },
  });

  const {
    mutate: runExtraction,
    isPending,
    data: extractionResult,
  } = useExtractionWorkflow({
    onSuccess: (result) => {
      // Apply annotations to editor
      if (editor && result.annotations) {
        result.annotations.forEach((annotation) => {
          editor
            .chain()
            .focus()
            .setTextSelection({ from: annotation.from, to: annotation.to })
            .setEntityHighlight(annotation.mark.attrs)
            .run();
        });
      }
    },
  });

  const handleExtract = () => {
    if (!editor) return;

    runExtraction({
      text: editor.getText(),
      domains: selectedDomains,
      mode,
      confidenceThreshold,
    });
  };

  const handleEntityClick = (entity: Entity) => {
    setSelectedEntity(entity);
  };

  const handleAddToGraph = async (entity: Entity) => {
    try {
      const response = await fetch("/api/ingest-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entities: [entity],
          relationships: [],
        }),
      });

      if (response.ok) {
        console.log("✅ Entity added to knowledge graph");
      }
    } catch (error) {
      console.error("❌ Failed to add entity to graph:", error);
    }
  };

  const handleReExtract = async (entity: Entity) => {
    if (!editor) return;

    // Re-run extraction focused on this entity
    runExtraction({
      text: editor.getText(),
      domains: selectedDomains,
      mode: "enrich",
      confidenceThreshold: 0.5, // Lower threshold for re-extraction
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Editor Column */}
      <div className="lg:col-span-2">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Multi-Phase Entity Extraction</CardTitle>
            <ExtractionControls
              domains={selectedDomains}
              onDomainsChange={setSelectedDomains}
              mode={mode}
              onModeChange={setMode}
              confidenceThreshold={confidenceThreshold}
              onThresholdChange={setConfidenceThreshold}
              onExtract={handleExtract}
              isLoading={isPending}
            />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 border rounded-md overflow-auto">
              <EditorContent editor={editor} />
            </div>
            {extractionResult && (
              <div className="mt-4">
                <ExtractionStats result={extractionResult} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar Column */}
      <div className="lg:col-span-1">
        <EntitySidebar
          selectedEntity={selectedEntity}
          allEntities={extractionResult?.enrichedEntities}
          onEntityClick={handleEntityClick}
          onAddToGraph={handleAddToGraph}
          onReExtract={handleReExtract}
        />
      </div>
    </div>
  );
}
