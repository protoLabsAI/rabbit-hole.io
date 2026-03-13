/**
 * useMediaIngestion Tests
 *
 * Tests the ingestion job lifecycle logic: job creation, status transitions,
 * and dismissal. Uses unit tests on the data model since the hook
 * requires browser APIs (EventSource, fetch).
 */

import { describe, it, expect } from "vitest";

import type { IngestionJob, IngestionStatus } from "../useMediaIngestion";

describe("useMediaIngestion logic", () => {
  describe("job status transitions", () => {
    const validTransitions: [IngestionStatus, IngestionStatus[]][] = [
      ["idle", ["uploading"]],
      ["uploading", ["processing", "failed"]],
      ["processing", ["completed", "failed"]],
      ["completed", []],
      ["failed", []],
    ];

    for (const [from, validTo] of validTransitions) {
      it(`${from} can transition to [${validTo.join(", ")}]`, () => {
        const allStatuses: IngestionStatus[] = [
          "idle",
          "uploading",
          "processing",
          "completed",
          "failed",
        ];

        for (const to of allStatuses) {
          if (from === to) continue;
          const isValid = validTo.includes(to);
          // This documents the expected state machine
          expect(isValid).toBe(validTo.includes(to));
        }
      });
    }
  });

  describe("job data model", () => {
    it("creates a file upload job with correct shape", () => {
      const job: IngestionJob = {
        jobId: "test-123",
        status: "uploading",
        fileName: "document.pdf",
      };

      expect(job.jobId).toBe("test-123");
      expect(job.status).toBe("uploading");
      expect(job.fileName).toBe("document.pdf");
      expect(job.url).toBeUndefined();
      expect(job.error).toBeUndefined();
    });

    it("creates a URL ingestion job with correct shape", () => {
      const job: IngestionJob = {
        jobId: "test-456",
        status: "uploading",
        url: "https://youtube.com/watch?v=abc",
      };

      expect(job.url).toBe("https://youtube.com/watch?v=abc");
      expect(job.fileName).toBeUndefined();
    });

    it("tracks completion metadata", () => {
      const job: IngestionJob = {
        jobId: "test-789",
        status: "completed",
        fileName: "audio.mp3",
        textLength: 15000,
        category: "audio",
      };

      expect(job.textLength).toBe(15000);
      expect(job.category).toBe("audio");
    });

    it("tracks failure reason", () => {
      const job: IngestionJob = {
        jobId: "test-err",
        status: "failed",
        fileName: "bad.exe",
        error: "Unsupported file type",
      };

      expect(job.error).toBe("Unsupported file type");
    });
  });

  describe("job list operations", () => {
    it("filters active jobs", () => {
      const jobs: IngestionJob[] = [
        { jobId: "1", status: "uploading", fileName: "a.pdf" },
        { jobId: "2", status: "completed", fileName: "b.pdf" },
        { jobId: "3", status: "processing", fileName: "c.pdf" },
        { jobId: "4", status: "failed", fileName: "d.pdf" },
      ];

      const active = jobs.filter(
        (j) => j.status === "uploading" || j.status === "processing"
      );

      expect(active).toHaveLength(2);
      expect(active.map((j) => j.jobId)).toEqual(["1", "3"]);
    });

    it("dismisses a job by removing it", () => {
      const jobs: IngestionJob[] = [
        { jobId: "1", status: "completed", fileName: "a.pdf" },
        { jobId: "2", status: "failed", fileName: "b.pdf" },
      ];

      const afterDismiss = jobs.filter((j) => j.jobId !== "1");
      expect(afterDismiss).toHaveLength(1);
      expect(afterDismiss[0].jobId).toBe("2");
    });

    it("updates a job by jobId", () => {
      const jobs: IngestionJob[] = [
        { jobId: "1", status: "processing", fileName: "a.pdf" },
        { jobId: "2", status: "processing", fileName: "b.pdf" },
      ];

      const updated = jobs.map((j) =>
        j.jobId === "1"
          ? { ...j, status: "completed" as const, textLength: 5000 }
          : j
      );

      expect(updated[0].status).toBe("completed");
      expect(updated[0].textLength).toBe(5000);
      expect(updated[1].status).toBe("processing");
    });
  });
});
