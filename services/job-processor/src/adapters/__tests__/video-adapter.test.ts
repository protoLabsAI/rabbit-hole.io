import { describe, expect, it } from "vitest";

import type { FileSource, UrlSource } from "@protolabsai/types";

import { VideoAdapter } from "../video-adapter.js";

// ==================== Helpers ====================

function makeFileSource(
  content: string | Buffer,
  mediaType: string,
  fileName?: string
): FileSource {
  return {
    type: "file",
    buffer: Buffer.isBuffer(content) ? content : Buffer.from(content, "utf-8"),
    mediaType,
    ...(fileName ? { fileName } : {}),
  };
}

function makeUrlSource(url: string, mediaType?: string): UrlSource {
  return {
    type: "url",
    url,
    ...(mediaType ? { mediaType } : {}),
  };
}

// ==================== canHandle ====================

describe("VideoAdapter.canHandle", () => {
  const adapter = new VideoAdapter();

  describe("file sources — MIME type detection", () => {
    it("handles video/mp4", () => {
      expect(adapter.canHandle(makeFileSource("", "video/mp4"))).toBe(true);
    });

    it("handles video/webm", () => {
      expect(adapter.canHandle(makeFileSource("", "video/webm"))).toBe(true);
    });

    it("handles video/quicktime", () => {
      expect(adapter.canHandle(makeFileSource("", "video/quicktime"))).toBe(
        true
      );
    });

    it("handles video/x-msvideo (AVI)", () => {
      expect(adapter.canHandle(makeFileSource("", "video/x-msvideo"))).toBe(
        true
      );
    });

    it("does NOT handle audio/mpeg", () => {
      expect(adapter.canHandle(makeFileSource("", "audio/mpeg"))).toBe(false);
    });

    it("does NOT handle application/pdf", () => {
      expect(adapter.canHandle(makeFileSource("", "application/pdf"))).toBe(
        false
      );
    });

    it("does NOT handle text/plain", () => {
      expect(adapter.canHandle(makeFileSource("", "text/plain"))).toBe(false);
    });
  });

  describe("URL sources — YouTube detection", () => {
    it("handles standard youtube.com/watch URL", () => {
      expect(
        adapter.canHandle(
          makeUrlSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        )
      ).toBe(true);
    });

    it("handles youtu.be short URL", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://youtu.be/dQw4w9WgXcQ"))
      ).toBe(true);
    });

    it("handles mobile m.youtube.com URL", () => {
      expect(
        adapter.canHandle(
          makeUrlSource("https://m.youtube.com/watch?v=dQw4w9WgXcQ")
        )
      ).toBe(true);
    });

    it("handles youtube.com/shorts URL", () => {
      expect(
        adapter.canHandle(
          makeUrlSource("https://www.youtube.com/shorts/dQw4w9WgXcQ")
        )
      ).toBe(true);
    });

    it("does NOT handle youtube.com without video ID", () => {
      expect(adapter.canHandle(makeUrlSource("https://www.youtube.com/"))).toBe(
        false
      );
    });

    it("does NOT handle unrelated video-like domain", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://notyoutube.com/watch?v=xyz"))
      ).toBe(false);
    });
  });

  describe("URL sources — direct video file detection", () => {
    it("handles .mp4 URL", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://example.com/video/movie.mp4"))
      ).toBe(true);
    });

    it("handles .mov URL", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://example.com/clip.mov"))
      ).toBe(true);
    });

    it("handles .webm URL", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://cdn.example.com/video.webm"))
      ).toBe(true);
    });

    it("handles .mkv URL", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://cdn.example.com/film.mkv"))
      ).toBe(true);
    });

    it("handles .avi URL", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://cdn.example.com/old.avi"))
      ).toBe(true);
    });

    it("does NOT handle .mp3 URL", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://example.com/audio.mp3"))
      ).toBe(false);
    });

    it("does NOT handle .pdf URL", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://example.com/doc.pdf"))
      ).toBe(false);
    });

    it("does NOT handle .txt URL", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://example.com/notes.txt"))
      ).toBe(false);
    });

    it("handles URL with mediaType video/* override", () => {
      expect(
        adapter.canHandle(
          makeUrlSource("https://example.com/stream", "video/mp4")
        )
      ).toBe(true);
    });
  });
});
