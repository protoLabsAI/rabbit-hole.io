/**
 * Playground Registry
 *
 * Central registry of all available playgrounds.
 * Uses dynamic imports to enable lazy loading.
 */

import type { PlaygroundRegistry } from "./types";

export const playgroundRegistry: PlaygroundRegistry = {
  categories: {
    "ai-services": {
      label: "AI Services",
      icon: "bot",
      description: "AI-powered APIs and language models",
    },
    "media-processing": {
      label: "Media Processing",
      icon: "film",
      description: "Audio and video processing tools",
    },
    "data-extraction": {
      label: "Data Extraction",
      icon: "bar-chart",
      description: "Text extraction and structured data",
    },
    "research-tools": {
      label: "Research Tools",
      icon: "microscope",
      description: "Research and knowledge discovery",
    },
    utilities: {
      label: "Utilities",
      icon: "wrench",
      description: "General-purpose utilities",
    },
  },

  playgrounds: [
    // AI Services
    {
      id: "llm-providers",
      name: "LLM Providers",
      description:
        "Test and compare different LLM providers with real-time metrics",
      category: "ai-services",
      icon: "bot",
      importFn: async () => {
        const { LLMProviderPlayground } = await import(
          "../../LLMProviderPlaygroundLoader"
        );
        return { default: LLMProviderPlayground };
      },
      status: "active",
      tags: ["llm", "openai", "anthropic", "groq", "testing", "metrics"],
      estimatedSize: 85,
    },

    // Research Tools
    {
      id: "wikipedia",
      name: "Wikipedia",
      description: "Wikipedia API integration and search",
      category: "research-tools",
      icon: "book-open",
      importFn: () =>
        import("@proto/llm-tools/playgrounds").then((m) => ({
          default: m.WikipediaPlayground,
        })),
      status: "active",
      tags: ["api", "search", "knowledge", "wikipedia"],
      estimatedSize: 50,
    },

    // Data Extraction
    {
      id: "langextract",
      name: "LangExtract",
      description: "Structured entity extraction from text",
      category: "data-extraction",
      icon: "search",
      importFn: () =>
        import("@proto/llm-tools/playgrounds").then((m) => ({
          default: m.LangExtractPlayground,
        })),
      healthCheckUrl: "/api/langextract/health",
      status: "active",
      tags: ["ai", "extraction", "gemini", "llm"],
      estimatedSize: 75,
    },

    // Media Processing
    {
      id: "youtube",
      name: "YouTube Processor",
      description: "YouTube video downloading and processing",
      category: "media-processing",
      icon: "video",
      importFn: () =>
        import("@proto/llm-tools/playgrounds").then((m) => ({
          default: m.YouTubePlayground,
        })),
      healthCheckUrl: "/api/youtube/health",
      status: "active",
      tags: ["video", "youtube", "ffmpeg", "download"],
      estimatedSize: 100,
    },
    {
      id: "transcription",
      name: "Transcription",
      description: "Audio transcription with multiple providers",
      category: "media-processing",
      icon: "mic",
      importFn: () =>
        import("@proto/llm-tools/playgrounds").then((m) => ({
          default: m.TranscriptionPlayground,
        })),
      healthCheckUrl: "/api/transcribe/health",
      status: "active",
      tags: ["audio", "whisper", "groq", "openai", "transcription"],
      estimatedSize: 120,
    },
    {
      id: "research-agent",
      name: "Research Agent",
      description:
        "Autonomous entity research with 6 specialized subagents, chat interface and real-time force graph visualization",
      category: "research-tools",
      icon: "sparkles",
      importFn: async () => {
        // Uses local loader (../../DeepAgentPlaygroundLoader) instead of
        // centralized @proto/llm-tools/playgrounds to avoid SSR issues with
        // client-only hooks and browser-specific APIs (CopilotKit, React Query)
        const { DeepAgentPlayground } = await import(
          "../../DeepAgentPlaygroundLoader"
        );
        return { default: DeepAgentPlayground };
      },
      status: "active",
      tags: [
        "ai",
        "autonomous",
        "research",
        "chat",
        "visualization",
        "graph",
        "entities",
        "extraction",
      ],
      estimatedSize: 120,
    },
    {
      id: "core-tools",
      name: "Core Tools",
      description:
        "Test core entity extraction tools: discover, enrich, and extract relationships",
      category: "data-extraction",
      icon: "wrench",
      importFn: async () => {
        const { CoreToolsPlayground } = await import(
          "../../core-tools-playground"
        );
        return { default: CoreToolsPlayground };
      },
      status: "active",
      tags: ["tools", "entities", "relationships", "extraction", "core"],
      estimatedSize: 60,
    },
  ],
};
