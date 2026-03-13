"use client";

/**
 * useResearchContext
 *
 * Manages research context files — extracted text from ingested media
 * that the agent can access via its virtual filesystem (read_file tool).
 *
 * Context files are stored locally in state and injected into the
 * CopilotKit agent's files state.
 */

import { useCallback, useState } from "react";

export interface ContextFile {
  id: string;
  name: string;
  path: string;
  category: string;
  textLength: number;
  addedAt: Date;
}

interface UseResearchContextOptions {
  onFilesChanged?: (files: Record<string, string>) => void;
}

export function useResearchContext(options: UseResearchContextOptions = {}) {
  const [contextFiles, setContextFiles] = useState<ContextFile[]>([]);
  const [agentFiles, setAgentFiles] = useState<Record<string, string>>({});

  const addContextFromJob = useCallback(
    async (jobId: string, fileName: string) => {
      try {
        const response = await fetch(`/api/ingest/${jobId}/result`);
        if (!response.ok) {
          throw new Error(`Failed to fetch result: ${response.statusText}`);
        }

        const data = await response.json();
        const result = data.result;

        if (!result?.text) {
          throw new Error("No extracted text in result");
        }

        const sanitizedName = fileName
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .toLowerCase();
        const contextPath = `context/${sanitizedName}`;

        const contextFile: ContextFile = {
          id: jobId,
          name: fileName,
          path: contextPath,
          category: result.category || "document",
          textLength: result.text.length,
          addedAt: new Date(),
        };

        setContextFiles((prev) => {
          // Avoid duplicates
          if (prev.some((f) => f.id === jobId)) return prev;
          return [...prev, contextFile];
        });

        const newFiles = {
          ...agentFiles,
          [contextPath]: result.text,
        };
        setAgentFiles(newFiles);
        options.onFilesChanged?.(newFiles);

        return contextFile;
      } catch (error) {
        console.error("[useResearchContext] Failed to add context:", error);
        throw error;
      }
    },
    [agentFiles, options]
  );

  const removeContext = useCallback(
    (fileId: string) => {
      setContextFiles((prev) => {
        const file = prev.find((f) => f.id === fileId);
        if (file) {
          const newAgentFiles = { ...agentFiles };
          delete newAgentFiles[file.path];
          setAgentFiles(newAgentFiles);
          options.onFilesChanged?.(newAgentFiles);
        }
        return prev.filter((f) => f.id !== fileId);
      });
    },
    [agentFiles, options]
  );

  return {
    contextFiles,
    agentFiles,
    addContextFromJob,
    removeContext,
  };
}
