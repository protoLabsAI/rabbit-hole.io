"use client";

import { useCopilotChatHeadless_c } from "@copilotkit/react-core";
import { useState, useEffect } from "react";

import { AILoader } from "@proto/ui/organisms";

import { ProgressCard, type Todo } from "./components/ProgressCard";
import {
  ResearchInputForm,
  type ResearchDepth,
} from "./components/ResearchInputForm";

interface ResearchControlPanelProps {
  entityName: string;
  entityType: string;
  researchDepth: ResearchDepth;
  todos: Todo[];
  confidence?: number;
  completeness?: number;
  isRunning?: boolean;
  isStopping?: boolean;
  hasStopped?: boolean;
  onEntityNameChange: (value: string) => void;
  onEntityTypeChange: (value: string) => void;
  onResearchDepthChange: (value: ResearchDepth) => void;
  onStartResearch: (
    entityName: string,
    entityType: string,
    researchDepth: ResearchDepth
  ) => void;
  onStopResearch?: () => void;
}

export function ResearchControlPanel({
  entityName,
  entityType,
  researchDepth,
  todos,
  confidence,
  completeness,
  isRunning,
  isStopping,
  hasStopped,
  onEntityNameChange,
  onEntityTypeChange,
  onResearchDepthChange,
  onStartResearch,
  onStopResearch,
}: ResearchControlPanelProps) {
  const [mounted, setMounted] = useState(false);
  const { sendMessage, isLoading } = useCopilotChatHeadless_c();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleResearch = () => {
    console.log("[Research Agent UI] Starting research:", {
      entityName,
      entityType,
      researchDepth,
    });

    // First, update agent state with entity details
    onStartResearch(entityName, entityType, researchDepth);

    // Then send message to trigger agent (required for LangGraph workflow)
    const message = {
      id: Date.now().toString(),
      role: "user" as const,
      content: `Research the entity "${entityName}" as type "${entityType}" with ${researchDepth} depth. Produce a complete, evidence-backed knowledge graph bundle.`,
    };
    console.log("[Research Agent UI] Sending message:", message);
    sendMessage(message);
  };

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center">
        <AILoader variant="typing" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 p-4 overflow-y-auto">
      {/* Research Input Form */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Research Agent</h2>
        <ResearchInputForm
          entityName={entityName}
          entityType={entityType}
          researchDepth={researchDepth}
          isLoading={isLoading}
          isRunning={isRunning}
          isStopping={isStopping}
          hasStopped={hasStopped}
          onEntityNameChange={onEntityNameChange}
          onEntityTypeChange={onEntityTypeChange}
          onResearchDepthChange={onResearchDepthChange}
          onSubmit={handleResearch}
          onStop={onStopResearch}
        />
      </div>

      {/* Progress Card */}
      {todos.length > 0 && (
        <ProgressCard
          todos={todos}
          confidence={confidence}
          completeness={completeness}
        />
      )}
    </div>
  );
}
