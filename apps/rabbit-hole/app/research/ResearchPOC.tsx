"use client";

/**
 * Research POC — Minimal viable research page
 *
 * Canvas (React Flow) + Chat stub. CopilotKit removed (M4 milestone).
 * Chat will be re-wired to native deep research API in a follow-up milestone.
 */

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useState, useCallback } from "react";

// ─── Canvas Component ───────────────────────────────────────────────────────

function ResearchCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
}: {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
}) {
  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

// ─── Chat Component ─────────────────────────────────────────────────────────

function ResearchChat({
  onEntitiesReceived,
}: {
  onEntitiesReceived: (nodes: Node[], edges: Edge[]) => void;
}) {
  const [input, setInput] = useState("");
  // CopilotKit removed (M4) — stubs until native API wired in
  const messages: any[] = [];
  const sendMessage = (_msg: any) => {};
  const isLoading = false;
  const agentState: any = null;

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      sendMessage({ id: Date.now().toString(), role: "user", content: input });
      setInput("");
    }
  };

  return (
    <div className="w-[400px] border-l border-border flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Research Agent</h2>
        <p className="text-xs text-muted-foreground">
          Ask a research question to populate the graph
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            <p className="mb-2">Ask something like:</p>
            <p className="italic">
              &ldquo;Research the key figures in the Apollo space program&rdquo;
            </p>
          </div>
        )}
        {messages.map((msg: any) => (
          <div
            key={msg.id}
            className={`text-sm p-3 rounded-lg ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground ml-8"
                : "bg-muted mr-8"
            }`}
          >
            {msg.content ||
              (isLoading && msg.role === "assistant" ? "Thinking..." : "")}
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="bg-muted text-sm p-3 rounded-lg mr-8 animate-pulse">
            Researching...
          </div>
        )}
      </div>

      {/* Agent status */}
      {agentState?.partialBundle && (
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
          Phase: {agentState.partialBundle.phase || "working"} |{" "}
          {agentState.partialBundle.entityCount || 0} entities
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="What would you like to research?"
            className="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main POC Component ─────────────────────────────────────────────────────

function ResearchWorkspace() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const handleEntitiesReceived = useCallback(
    (newNodes: Node[], newEdges: Edge[]) => {
      setNodes((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const unique = newNodes.filter((n) => !existingIds.has(n.id));
        return [...prev, ...unique];
      });
      setEdges((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const unique = newEdges.filter((e) => !existingIds.has(e.id));
        return [...prev, ...unique];
      });
    },
    [setNodes, setEdges]
  );

  return (
    <div className="h-screen flex">
      <ResearchCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
      />
      <ResearchChat onEntitiesReceived={handleEntitiesReceived} />
    </div>
  );
}

// ─── Entry ───────────────────────────────────────────────────────────────────

export default function ResearchPOC() {
  return <ResearchWorkspace />;
}
