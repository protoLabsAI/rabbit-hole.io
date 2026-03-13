"use client";

import { useCoAgent } from "@copilotkit/react-core";
import { useState, useEffect } from "react";

import { Icon } from "@proto/icon-system";

import type { ResearchDepth, Todo } from "./deep-agent";
import { DeepAgentForceGraph } from "./deep-agent/DeepAgentForceGraph";
import { ResearchControlPanel } from "./deep-agent/ResearchControlPanel";

interface DeepAgentState {
  entityName: string;
  entityType: string;
  researchDepth: ResearchDepth;
  todos: Todo[];
  files: Record<string, string>;
  confidence: number;
  completeness: number;
  evidenceNodes: any[];
  relatedEntities: any[];
  relationships: any[];
  bundle?: any;
}

export function DeepAgentPlayground() {
  const [entityName, setEntityName] = useState("Albert Einstein");
  const [entityType, setEntityType] = useState("Person");
  const [researchDepth, setResearchDepth] = useState<ResearchDepth>("detailed");

  // Panel collapse state
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);

  // Local stopping state (since CopilotKit stop() has known issues)
  const [isStopping, setIsStopping] = useState(false);
  const [hasStopped, setHasStopped] = useState(false);

  // Real-time agent state via CopilotKit
  const { state, setState, stop, running } = useCoAgent<DeepAgentState>({
    name: "research_agent",
    initialState: {
      entityName: "",
      entityType: "Person",
      researchDepth: "detailed",
      todos: [],
      files: {},
      confidence: 0,
      completeness: 0,
      evidenceNodes: [],
      relatedEntities: [],
      relationships: [],
    },
    config: {
      streamSubgraphs: false,
    },
  });

  // Detect actual completion from state (bundle file exists = research done)
  const isResearchComplete = Boolean(state.files?.["/research/bundle.json"]);

  // Reset stopped state when agent finishes naturally
  useEffect(() => {
    if (!running && hasStopped) {
      setHasStopped(false);
      setIsStopping(false);
    }
  }, [running, hasStopped]);

  // Stop research handler
  const handleStopResearch = async () => {
    console.log("[Research Agent UI] Stopping research...");
    setIsStopping(true);

    try {
      // CopilotKit stop() - stops frontend from receiving updates
      // Note: Backend may continue until current operation completes
      stop();
      setHasStopped(true);
    } catch (error) {
      console.error("[Research Agent UI] Stop failed:", error);
    } finally {
      setIsStopping(false);
    }
  };

  // Effective running state: agent says running AND research not complete AND user hasn't stopped
  const effectivelyRunning = running && !isResearchComplete && !hasStopped;

  // Debug state updates
  useEffect(() => {
    console.log("[Research Agent UI] State updated:", {
      todoCount: state.todos?.length || 0,
      entityCount: state.relatedEntities?.length || 0,
      filesCount: Object.keys(state.files || {}).length,
      fileKeys: Object.keys(state.files || {}),
      confidence: state.confidence,
      completeness: state.completeness,
    });
  }, [state]);

  // Delay content visibility when expanding panel
  useEffect(() => {
    if (panelCollapsed) {
      setContentVisible(false);
    } else {
      const timer = setTimeout(() => setContentVisible(true), 150);
      return () => clearTimeout(timer);
    }
  }, [panelCollapsed]);

  return (
    <div className="flex h-full">
      {/* Collapsible Control Panel */}
      <div
        className={`border-r bg-card flex-shrink-0 transition-all duration-200 relative ${
          panelCollapsed ? "w-12" : "w-[420px]"
        }`}
      >
        {/* Collapse Toggle Button */}
        <button
          type="button"
          onClick={() => setPanelCollapsed(!panelCollapsed)}
          className="absolute top-3 right-2 z-10 p-1 rounded hover:bg-accent transition-colors"
          title={panelCollapsed ? "Expand panel" : "Collapse panel"}
        >
          <Icon
            name={panelCollapsed ? "chevron-right" : "chevron-left"}
            size={16}
            className="text-muted-foreground"
          />
        </button>

        {/* Collapsed View */}
        {panelCollapsed && (
          <div
            className={`p-2 pt-12 flex flex-col items-center gap-2 transition-opacity duration-150 ${
              !contentVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <Icon name="search" size={20} className="text-muted-foreground" />
            {effectivelyRunning && (
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </div>
        )}

        {/* Expanded View */}
        {!panelCollapsed && (
          <div
            className={`h-full pr-6 transition-opacity duration-150 ${
              contentVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <ResearchControlPanel
              entityName={entityName}
              entityType={entityType}
              researchDepth={researchDepth}
              todos={state.todos || []}
              confidence={state.confidence}
              completeness={state.completeness}
              isRunning={effectivelyRunning}
              isStopping={isStopping}
              hasStopped={hasStopped}
              onEntityNameChange={setEntityName}
              onEntityTypeChange={setEntityType}
              onResearchDepthChange={setResearchDepth}
              onStartResearch={(name, type, depth) => {
                // Reset stop state when starting new research
                setHasStopped(false);
                setIsStopping(false);
                // Set agent state before triggering research
                setState(
                  (prev) =>
                    ({
                      entityName: name,
                      entityType: type,
                      researchDepth: depth,
                      todos: prev?.todos || [],
                      files: prev?.files || {},
                      confidence: prev?.confidence || 0,
                      completeness: prev?.completeness || 0,
                      evidenceNodes: prev?.evidenceNodes || [],
                      relatedEntities: prev?.relatedEntities || [],
                      relationships: prev?.relationships || [],
                      bundle: prev?.bundle,
                    }) as DeepAgentState
                );
              }}
              onStopResearch={handleStopResearch}
            />
          </div>
        )}
      </div>

      {/* Force Graph Visualization */}
      <div className="flex-1 h-full">
        <DeepAgentForceGraph
          files={state.files || {}}
          primaryEntityName={state.entityName || entityName}
          primaryEntityType={state.entityType || entityType}
          isResearchComplete={isResearchComplete}
          entities={
            state.bundle?.bundle?.entities || state.relatedEntities || []
          }
          relationships={
            state.bundle?.bundle?.relationships || state.relationships || []
          }
          evidenceCount={
            state.bundle?.bundle?.evidence?.length ||
            state.evidenceNodes?.length ||
            0
          }
          confidence={state.confidence}
          completeness={state.completeness}
          bundle={state.bundle}
        />
      </div>
    </div>
  );
}
