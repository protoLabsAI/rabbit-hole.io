"use client";

import { useCopilotChatHeadless_c, useCoAgent } from "@copilotkit/react-core";
import { useState, useEffect } from "react";

import { Icon } from "@proto/icon-system";
import { DEFAULT_RESEARCH_SESSION_CONFIG } from "@proto/types";
import type {
  PartialBundle,
  ResearchPhase,
  ResearchSessionConfig,
} from "@proto/types";
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Badge,
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
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
  ReasoningStep,
  MarkdownContent,
} from "@proto/ui/organisms";
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  SourceItem,
  type Source,
} from "@proto/ui/organisms";

import { useMediaIngestion } from "../hooks/useMediaIngestion";
import { useResearchContext } from "../hooks/useResearchContext";

import { MediaUploadPanel } from "./MediaUploadPanel";
import { ResearchConfigPanel } from "./ResearchConfigPanel";
import { ResearchContextPanel } from "./ResearchContextPanel";

type Todo = {
  content: string;
  status: "pending" | "in_progress" | "completed" | "failed";
};

const PHASE_LABELS: Record<ResearchPhase, string> = {
  scoping: "Scoping research",
  "evidence-gathering": "Gathering evidence",
  "entity-extraction": "Extracting entities",
  "field-analysis": "Analyzing fields",
  "entity-creation": "Creating entities",
  "relationship-mapping": "Mapping relationships",
  "bundle-assembly": "Assembling bundle",
  complete: "Research complete",
};

interface ResearchChatInterfaceProps {
  className?: string;
  placeholder?: string;
  sessionConfig?: ResearchSessionConfig;
  onSessionConfigChange?: (config: ResearchSessionConfig) => void;
}

interface ExtendedMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
  reasoning?: string;
  sources?: Source[];
  isStreaming?: boolean;
  toolCalls?: Array<{
    id: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  generativeUI?: () => React.ReactNode;
}

export function ResearchChatInterface({
  className = "",
  placeholder = "Start researching entities, relationships, or ask questions about the graph...",
  sessionConfig: externalConfig,
  onSessionConfigChange: externalOnChange,
}: ResearchChatInterfaceProps) {
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const [internalConfig, setInternalConfig] = useState(
    DEFAULT_RESEARCH_SESSION_CONFIG
  );
  const config = externalConfig ?? internalConfig;
  const onConfigChange = externalOnChange ?? setInternalConfig;
  const user = {
    id: "local-user",
    firstName: "Local",
    lastName: "User",
    username: "local-user",
    fullName: "Local User",
    emailAddresses: [{ emailAddress: "local@localhost" }],
    publicMetadata: { tier: "pro" },
    privateMetadata: { stats: {} },
    isSignedIn: true,
  };
  const { contextFiles, addContextFromJob, removeContext } =
    useResearchContext();
  const { jobs, ingestFile, ingestUrl, dismissJob } = useMediaIngestion({
    onComplete: (job) => {
      if (job.fileName || job.url) {
        addContextFromJob(job.jobId, job.fileName || job.url || job.jobId);
      }
    },
  });

  const { messages, sendMessage, isLoading } = useCopilotChatHeadless_c();

  const { state: agentState } = useCoAgent({
    name: "research_agent",
  });

  const [todoOpen, setTodoOpen] = useState(true);

  const hasTodos = agentState?.todos && agentState.todos.length > 0;
  const hasActiveTasks = agentState?.todos?.some(
    (t: Todo) => t.status === "pending" || t.status === "in_progress"
  );

  // Extract partial bundle state
  const partialBundle = (agentState?.partialBundle as PartialBundle) ?? null;
  const isResearching = partialBundle != null && !partialBundle.isComplete;
  const isComplete = partialBundle?.isComplete ?? false;
  const currentPhase = partialBundle?.phase;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      sendMessage({
        id: Date.now().toString(),
        role: "user",
        content: input,
      });
      setInput("");
    }
  };

  if (!mounted) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading chat interface...</span>
        </div>
      </div>
    );
  }

  const typedMessages = messages as ExtendedMessage[];

  const displayMessages = typedMessages.filter((msg) => {
    if (msg.role === "system") return false;
    if (msg.role === "assistant") {
      return Boolean(
        msg.content ||
          msg.generativeUI ||
          msg.isStreaming ||
          isLoading ||
          (msg.toolCalls && msg.toolCalls.length > 0)
      );
    }
    return true;
  });

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <Conversation className="flex-1 min-h-0">
        <ConversationContent>
          {typedMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Icon name="sparkles" size={32} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Research Agent</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                I can help you discover entities, relationships, and build
                knowledge graphs. What would you like to research?
              </p>
            </div>
          )}

          {displayMessages.map((message) => (
            <Message key={message.id} role={message.role}>
              <MessageAvatar
                src={message.role === "user" ? user?.imageUrl : undefined}
                name={
                  message.role === "user"
                    ? user?.fullName || "You"
                    : "Research Agent"
                }
              />
              <MessageContent>
                <MessageHeader>
                  {message.role === "user"
                    ? user?.fullName || "You"
                    : "Research Agent"}
                  {message.timestamp && (
                    <>
                      {" · "}
                      <MessageTimestamp timestamp={message.timestamp} />
                    </>
                  )}
                </MessageHeader>

                {message.role === "assistant" &&
                  !message.content &&
                  !message.generativeUI &&
                  isLoading && (
                    <div className="py-2">
                      <AILoader variant="typing" />
                    </div>
                  )}

                {message.content && (
                  <MessageBubble>
                    {message.role === "assistant" ? (
                      <MarkdownContent content={message.content} />
                    ) : (
                      message.content
                    )}
                  </MessageBubble>
                )}

                {message.role === "assistant" && message.generativeUI?.()}

                {message.reasoning && (
                  <Reasoning
                    isStreaming={message.isStreaming}
                    defaultOpen={false}
                    className="mt-2"
                  >
                    <ReasoningTrigger />
                    <ReasoningContent>
                      <ReasoningStep>{message.reasoning}</ReasoningStep>
                    </ReasoningContent>
                  </Reasoning>
                )}

                {message.sources && message.sources.length > 0 && (
                  <Sources
                    sources={message.sources}
                    defaultOpen={false}
                    className="mt-2"
                  >
                    <SourcesTrigger count={message.sources.length} />
                    <SourcesContent>
                      {message.sources.map((source) => (
                        <SourceItem key={source.id} source={source} />
                      ))}
                    </SourcesContent>
                  </Sources>
                )}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Research Progress Panel — shows phase, entity counts, and completion actions */}
      {partialBundle && (
        <div className="border-t border-border bg-muted/30">
          <Collapsible open={todoOpen} onOpenChange={setTodoOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between px-4 py-2 h-auto font-normal"
              >
                <div className="flex items-center gap-2">
                  <Icon
                    name={isResearching ? "loader" : "check-circle"}
                    size={16}
                    className={
                      isResearching
                        ? "text-primary animate-spin"
                        : "text-green-500"
                    }
                  />
                  <span className="text-sm font-medium">
                    {currentPhase
                      ? PHASE_LABELS[currentPhase] || currentPhase
                      : "Research in progress..."}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {partialBundle.entityCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {partialBundle.entityCount} entities
                    </Badge>
                  )}
                  {partialBundle.relationshipCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {partialBundle.relationshipCount} rels
                    </Badge>
                  )}
                  <Icon
                    name="chevron-down"
                    size={16}
                    className={`transition-transform ${todoOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-3">
              {/* Todo items */}
              {hasTodos && (
                <div className="space-y-1.5 mb-2">
                  {agentState.todos.map((todo: Todo, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {todo.status === "completed" && (
                        <Icon
                          name="check"
                          size={12}
                          className="text-green-500"
                        />
                      )}
                      {todo.status === "in_progress" && (
                        <Icon
                          name="loader"
                          size={12}
                          className="text-primary animate-spin"
                        />
                      )}
                      {todo.status === "pending" && (
                        <Icon
                          name="circle"
                          size={12}
                          className="text-muted-foreground"
                        />
                      )}
                      {todo.status === "failed" && (
                        <Icon name="x" size={12} className="text-destructive" />
                      )}
                      <span
                        className={
                          todo.status === "completed"
                            ? "text-muted-foreground line-through"
                            : ""
                        }
                      >
                        {todo.content}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center justify-between text-xs border-t border-border/50 pt-2">
                <div className="flex items-center gap-3 text-muted-foreground">
                  {partialBundle.evidenceCount > 0 && (
                    <span>{partialBundle.evidenceCount} sources</span>
                  )}
                  {partialBundle.entityCount > 0 && (
                    <span>{partialBundle.entityCount} entities</span>
                  )}
                  {partialBundle.relationshipCount > 0 && (
                    <span>{partialBundle.relationshipCount} relationships</span>
                  )}
                </div>
                {typeof agentState?.confidence === "number" && (
                  <span className="font-medium">
                    {Math.round(agentState.confidence * 100)}% confidence
                  </span>
                )}
              </div>

              {/* Completion message */}
              {isComplete && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Research complete — entities are on the canvas. Use
                    &ldquo;Merge to Neo4j&rdquo; in the toolbar to save
                    permanently.
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Legacy todo section — only show when no partial bundle (backwards compatibility) */}
      {!partialBundle && hasTodos && (
        <Collapsible
          open={todoOpen}
          onOpenChange={setTodoOpen}
          className="border-t border-border bg-muted/30"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between px-4 py-2 h-auto font-normal"
            >
              <div className="flex items-center gap-2">
                <Icon
                  name={hasActiveTasks ? "loader" : "check-circle"}
                  size={16}
                  className={
                    hasActiveTasks
                      ? "text-primary animate-spin"
                      : "text-green-500"
                  }
                />
                <span className="text-sm font-medium">
                  {hasActiveTasks
                    ? "Research in progress..."
                    : "Research complete"}
                </span>
              </div>
              <Icon
                name="chevron-down"
                size={16}
                className={`transition-transform ${todoOpen ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-3">
            <div className="space-y-1.5">
              {agentState.todos.map((todo: Todo, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {todo.status === "completed" && (
                    <Icon name="check" size={12} className="text-green-500" />
                  )}
                  {todo.status === "in_progress" && (
                    <Icon
                      name="loader"
                      size={12}
                      className="text-primary animate-spin"
                    />
                  )}
                  {todo.status === "pending" && (
                    <Icon
                      name="circle"
                      size={12}
                      className="text-muted-foreground"
                    />
                  )}
                  {todo.status === "failed" && (
                    <Icon name="x" size={12} className="text-destructive" />
                  )}
                  <span
                    className={
                      todo.status === "completed"
                        ? "text-muted-foreground line-through"
                        : ""
                    }
                  >
                    {todo.content}
                  </span>
                </div>
              ))}
            </div>
            {typeof agentState.confidence === "number" && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-medium">
                    {Math.round(agentState.confidence * 100)}%
                  </span>
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      <ResearchConfigPanel config={config} onConfigChange={onConfigChange} />

      <MediaUploadPanel
        jobs={jobs}
        onFileUpload={ingestFile}
        onUrlSubmit={ingestUrl}
        onDismissJob={dismissJob}
      />

      <ResearchContextPanel
        contextFiles={contextFiles}
        onRemove={removeContext}
      />

      <PromptInput
        value={input}
        onChange={setInput}
        onSubmit={handleSend}
        isLoading={isLoading}
      >
        <div className="flex items-end gap-2">
          <PromptInputTextarea
            placeholder={placeholder}
            maxRows={5}
            minRows={1}
            className="flex-1"
          />
          <PromptInputSubmit />
        </div>
      </PromptInput>
    </div>
  );
}
