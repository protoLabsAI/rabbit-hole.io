/**
 * Media Processing Tools Tests
 */

import { describe, it, expect, vi } from "vitest";

import {
  enqueueYouTubeJobTool,
  transcribeAudioTool,
  submitMediaOutputTool,
} from "../media-processing-tools.js";

// Mock dependencies
vi.mock("@proto/sidequest-utils/server", () => ({
  enqueueYouTubeJob: vi.fn().mockResolvedValue({
    jobId: "test_job_123",
  }),
}));

vi.mock("minio", () => ({
  Client: vi.fn().mockImplementation(() => ({
    getObject: vi.fn().mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield Buffer.from("mock audio data");
      },
    }),
  })),
}));

global.fetch = vi.fn();

describe("Media Processing Tools", () => {
  describe("enqueueYouTubeJobTool", () => {
    it("enqueues YouTube job successfully", async () => {
      const result = await enqueueYouTubeJobTool.invoke({
        url: "https://youtube.com/watch?v=test123",
        userId: "user_1",
        workspaceId: "ws_1",
      });

      expect(result.success).toBe(true);
      expect(result.jobId).toBe("test_job_123");
      expect(result.videoId).toBe("test123");
    });

    it("extracts video ID from different URL formats", async () => {
      const urls = [
        "https://youtube.com/watch?v=abc123xyz",
        "https://youtu.be/abc123xyz",
        "https://youtube.com/embed/abc123xyz",
        "https://youtube.com/shorts/abc123xyz",
      ];

      for (const url of urls) {
        const result = await enqueueYouTubeJobTool.invoke({
          url,
          userId: "user_1",
          workspaceId: "ws_1",
        });

        expect(result.videoId).toBe("abc123xyz");
      }
    });

    it("throws error for invalid URL", async () => {
      await expect(
        enqueueYouTubeJobTool.invoke({
          url: "https://invalid.com/video",
          userId: "user_1",
          workspaceId: "ws_1",
        })
      ).rejects.toThrow("Invalid YouTube URL");
    });
  });

  describe("submitMediaOutputTool", () => {
    it("returns structured output", async () => {
      const result = await submitMediaOutputTool.invoke({
        transcript: "Test transcript...",
        summary: "Test summary...",
        metadata: { duration: 120 },
      });

      expect(result.success).toBe(true);
      expect(result.transcript).toBe("Test transcript...");
      expect(result.summary).toBe("Test summary...");
      expect(result.metadata).toEqual({ duration: 120 });
    });
  });

  describe("transcribeAudioTool", () => {
    it("transcribes audio successfully", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: "Transcribed text",
          duration: 60,
          segments: [],
          language: "en",
        }),
      });

      const result = await transcribeAudioTool.invoke({
        audioKey: "audio/test.mp3",
        provider: "groq",
      });

      expect(result.success).toBe(true);
      expect(result.text).toBe("Transcribed text");
      expect(result.duration).toBe(60);
    });

    it("throws error on API failure", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: "Service Unavailable",
        text: async () => "Service Unavailable",
      });

      await expect(
        transcribeAudioTool.invoke({
          audioKey: "audio/test.mp3",
        })
      ).rejects.toThrow("Transcription failed");
    });
  });
});
