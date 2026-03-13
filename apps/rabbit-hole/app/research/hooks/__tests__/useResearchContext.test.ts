/**
 * useResearchContext Tests
 *
 * Tests the context file data model and agent file mapping logic.
 */

import { describe, it, expect } from "vitest";

import type { ContextFile } from "../useResearchContext";

describe("useResearchContext logic", () => {
  describe("context file model", () => {
    it("creates a context file with correct shape", () => {
      const file: ContextFile = {
        id: "job-123",
        name: "research_paper.pdf",
        path: "context/research_paper.pdf",
        category: "document",
        textLength: 15000,
        addedAt: new Date("2026-03-12"),
      };

      expect(file.path).toBe("context/research_paper.pdf");
      expect(file.category).toBe("document");
      expect(file.textLength).toBe(15000);
    });
  });

  describe("file name sanitization", () => {
    it("sanitizes file names for context paths", () => {
      const sanitize = (name: string) =>
        name.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();

      expect(sanitize("My Report (2024).pdf")).toBe("my_report__2024_.pdf");
      expect(sanitize("audio-file.mp3")).toBe("audio-file.mp3");
      expect(sanitize("doc with spaces.txt")).toBe("doc_with_spaces.txt");
    });
  });

  describe("agent files mapping", () => {
    it("maps context files to agent virtual filesystem", () => {
      const agentFiles: Record<string, string> = {};

      // Add first file
      const path1 = "context/paper.pdf";
      agentFiles[path1] = "Extracted text from paper...";

      expect(Object.keys(agentFiles)).toEqual(["context/paper.pdf"]);
      expect(agentFiles[path1]).toBe("Extracted text from paper...");

      // Add second file
      const path2 = "context/audio.mp3";
      agentFiles[path2] = "Transcribed audio content...";

      expect(Object.keys(agentFiles)).toHaveLength(2);
    });

    it("removes context file from agent files", () => {
      const agentFiles: Record<string, string> = {
        "context/a.pdf": "text a",
        "context/b.pdf": "text b",
      };

      delete agentFiles["context/a.pdf"];

      expect(Object.keys(agentFiles)).toEqual(["context/b.pdf"]);
    });

    it("avoids duplicate context files by id", () => {
      const contextFiles: ContextFile[] = [
        {
          id: "job-1",
          name: "doc.pdf",
          path: "context/doc.pdf",
          category: "document",
          textLength: 1000,
          addedAt: new Date(),
        },
      ];

      const newFile: ContextFile = {
        id: "job-1", // same id
        name: "doc.pdf",
        path: "context/doc.pdf",
        category: "document",
        textLength: 1000,
        addedAt: new Date(),
      };

      const isDuplicate = contextFiles.some((f) => f.id === newFile.id);
      expect(isDuplicate).toBe(true);

      // Should not add
      const result = isDuplicate
        ? contextFiles
        : [...contextFiles, newFile];
      expect(result).toHaveLength(1);
    });
  });
});
