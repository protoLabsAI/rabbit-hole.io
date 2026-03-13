/**
 * Deep Extraction Agent Playground
 *
 * Multi-turn conversational entity extraction with:
 * - Chat interface (left panel)
 * - ReactFlow visualization (right panel)
 * - Real-time state updates via CopilotKit
 * - EntityCard integration for entity display
 */

"use client";

import { useCopilotChatHeadless_c } from "@copilotkit/react-core";
import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import React, { useState, useMemo, useCallback } from "react";
import "@xyflow/react/dist/style.css";

import { Icon } from "@proto/icon-system";
import {
  Button,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@proto/ui/atoms";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  AILoader,
  Message,
  MessageAvatar,
  MessageContent,
  MessageBubble,
  MessageHeader,
  MessageTimestamp,
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputToolbar,
  PromptInputActions,
} from "@proto/ui/organisms";
import { getEntityColor } from "@proto/utils/atlas";

import {
  EntityDiscoveryCard,
  RelationshipMapCard,
  BundlePreview,
  ProgressIndicator,
} from "./components";

interface DeepExtractionAgentPlaygroundProps {
  initialText?: string;
}

export function DeepExtractionAgentPlayground({
  initialText = "",
}: DeepExtractionAgentPlaygroundProps) {
  const [inputText, setInputText] = useState("");

  // CopilotKit headless hook
  const {
    messages,
    sendMessage,
    isLoading,
    stopGeneration,
    reset,
    suggestions,
    generateSuggestions,
    isLoadingSuggestions,
  } = useCopilotChatHeadless_c();

  // Extract agent state from messages (CopilotKit streams state updates)
  const agentState = useMemo(() => {
    // Look for latest agent state in messages
    const lastAgentMessage = messages
      .slice()
      .reverse()
      .find((m) => m.role === "assistant" && (m as any).state);

    return (
      (lastAgentMessage as any)?.state || {
        discoveredEntities: [],
        structuredEntities: [],
        enrichedEntities: [],
        relationships: [],
        focusEntityUids: [],
        currentPhase: "",
        completedPhases: [],
        todos: [],
        bundle: null,
      }
    );
  }, [messages]);

  // Convert entities to ReactFlow nodes
  const nodes = useMemo(() => {
    const entities =
      agentState.enrichedEntities.length > 0
        ? agentState.enrichedEntities
        : agentState.structuredEntities.length > 0
          ? agentState.structuredEntities
          : agentState.discoveredEntities;

    return entities.map((entity: any, index: number) => ({
      id: entity.uid,
      type: "default",
      position: {
        x: (index % 5) * 200,
        y: Math.floor(index / 5) * 150,
      },
      data: {
        label: entity.name,
      },
      style: {
        background: getEntityColor(entity.type),
        color: "white",
        border: "2px solid",
        borderColor: getEntityColor(entity.type),
        padding: "10px",
        borderRadius: "8px",
        fontSize: "12px",
        fontWeight: 600,
      },
    }));
  }, [agentState]);

  // Convert relationships to ReactFlow edges
  const edges = useMemo(() => {
    return agentState.relationships.map((rel: any) => ({
      id: rel.uid,
      source: rel.source,
      target: rel.target,
      label: rel.type?.replace(/_/g, " "),
      type: "smoothstep",
      animated: true,
      style: { stroke: "#94a3b8" },
    }));
  }, [agentState.relationships]);

  // Handle message send
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    await sendMessage({
      id: `user-${Date.now()}`,
      role: "user",
      content: inputText,
    });

    setInputText("");
  }, [inputText, isLoading, sendMessage]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback(
    async (suggestion: string) => {
      await sendMessage({
        id: `suggestion-${Date.now()}`,
        role: "user",
        content: suggestion,
      });
    },
    [sendMessage]
  );

  // Download bundle
  const handleDownload = useCallback(() => {
    if (!agentState.bundle) return;

    const blob = new Blob([JSON.stringify(agentState.bundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extraction-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [agentState.bundle]);

  // Render generative UI based on agent state
  const renderGenerativeUI = useCallback(
    (message: any) => {
      const state = message.state || agentState;

      // Progress indicator during extraction
      if (state.currentPhase && !state.bundle) {
        return (
          <ProgressIndicator
            currentPhase={state.currentPhase}
            completedPhases={state.completedPhases || []}
            totalPhases={state.phasesToRun?.length || 4}
          />
        );
      }

      // Discovery results
      if (state.discoveredEntities?.length > 0 && !state.bundle) {
        return (
          <EntityDiscoveryCard
            entities={state.discoveredEntities}
            focusEntityUids={state.focusEntityUids || []}
            stats={{
              totalFound: state.discoveredEntities.length,
              returned: state.discoveredEntities.length,
              limited: false,
            }}
          />
        );
      }

      // Relationship results
      if (state.relationships?.length > 0 && !state.bundle) {
        return (
          <RelationshipMapCard
            relationships={state.relationships}
            focusEntityUids={state.focusEntityUids || []}
            stats={{
              totalFound: state.relationships.length,
              focusEntityCount: state.focusEntityUids?.length || 0,
            }}
          />
        );
      }

      // Final bundle
      if (state.bundle) {
        return (
          <BundlePreview
            entityCount={state.bundle.entities?.length || 0}
            relationshipCount={state.bundle.relationships?.length || 0}
            isValid={true}
            onDownload={handleDownload}
          />
        );
      }

      return null;
    },
    [agentState, handleDownload]
  );

  return (
    <div className="h-screen flex flex-col">
      <ResizablePanelGroup direction="horizontal">
        {/* Left Panel: Chat Interface */}
        <ResizablePanel defaultSize={40} minSize={30}>
          <div className="h-full flex flex-col border-r">
            {/* Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="sparkles" size={20} className="text-primary" />
                  <h2 className="text-lg font-semibold">
                    Deep Extraction Agent
                  </h2>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={reset}
                  disabled={messages.length === 0}
                >
                  <Icon name="refresh" size={14} className="mr-1" />
                  Reset
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Conversational entity extraction with multi-turn support
              </p>
            </div>

            {/* Chat Messages */}
            <Conversation className="flex-1">
              <ConversationContent>
                {messages
                  .filter(
                    (msg) => msg.role === "user" || msg.role === "assistant"
                  )
                  .map((msg) => (
                    <Message
                      key={msg.id}
                      role={msg.role as "user" | "assistant"}
                    >
                      <MessageAvatar
                        name={msg.role === "user" ? "You" : "Agent"}
                      />
                      <MessageContent>
                        <MessageHeader>
                          {msg.role === "user"
                            ? "You"
                            : "Deep Extraction Agent"}
                          <MessageTimestamp timestamp={new Date()} />
                        </MessageHeader>
                        <MessageBubble>{msg.content}</MessageBubble>

                        {/* Generative UI */}
                        {msg.role === "assistant" && renderGenerativeUI(msg)}
                      </MessageContent>
                    </Message>
                  ))}

                {/* Loading indicator */}
                {isLoading && (
                  <Message role="assistant">
                    <MessageAvatar name="Agent" />
                    <MessageContent>
                      <MessageHeader>Deep Extraction Agent</MessageHeader>
                      <div className="py-2">
                        <AILoader variant="typing" />
                      </div>
                    </MessageContent>
                  </Message>
                )}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-3 border-t bg-muted/30">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Suggestions:
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion: any, i: number) => (
                    <Button
                      key={i}
                      size="sm"
                      variant="outline"
                      onClick={() => handleSuggestionClick(suggestion.title)}
                      disabled={isLoading}
                    >
                      {suggestion.title}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <PromptInput
              value={inputText}
              onChange={setInputText}
              onSubmit={handleSendMessage}
              isLoading={isLoading}
            >
              <PromptInputTextarea
                placeholder="Describe what you want to extract..."
                maxRows={5}
                minRows={2}
              />
              <PromptInputToolbar>
                <PromptInputActions>
                  <span className="text-xs text-muted-foreground">
                    Press Enter to send
                  </span>
                </PromptInputActions>
                {isLoading ? (
                  <Button size="sm" variant="outline" onClick={stopGeneration}>
                    <Icon name="square" size={14} className="mr-1" />
                    Stop
                  </Button>
                ) : (
                  <PromptInputSubmit />
                )}
              </PromptInputToolbar>
            </PromptInput>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Right Panel: Graph Visualization */}
        <ResizablePanel defaultSize={60} minSize={40}>
          <div className="h-full flex flex-col">
            {/* Graph Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Graph Visualization</h3>
                  <p className="text-xs text-muted-foreground">
                    {nodes.length} entities, {edges.length} relationships
                  </p>
                </div>
                {agentState.bundle && (
                  <Button size="sm" onClick={handleDownload}>
                    <Icon name="download" size={14} className="mr-1" />
                    Download Bundle
                  </Button>
                )}
              </div>
            </div>

            {/* ReactFlow */}
            <div className="flex-1">
              {nodes.length > 0 ? (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  fitView
                  minZoom={0.1}
                  maxZoom={4}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background />
                  <Controls />
                  <MiniMap />
                </ReactFlow>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Icon
                      name="network"
                      size={48}
                      className="mx-auto mb-2 opacity-20"
                    />
                    <p className="text-sm">No entities extracted yet</p>
                    <p className="text-xs mt-1">
                      Send a message to start extraction
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
