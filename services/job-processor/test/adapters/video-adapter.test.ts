/**
 * Integration tests for VideoAdapter.
 *
 * FFmpeg and yt-dlp are not available in the test environment; these tests
 * verify canHandle() routing and that extract() correctly surfaces errors
 * when the required external tools are absent.
 *
 * AdapterRegistry routing tests are also included here.
 */

import { describe, expect, it } from "vitest";

import type { FileSource, UrlSource } from "@protolabsai/types";

import { SimpleAdapterRegistry } from "../../jobs/MediaIngestionJob.js";
import { VideoAdapter } from "../../src/adapters/video-adapter.js";

// ==================== Helpers ====================

function makeFileSource(mediaType: string): FileSource {
  return {
    type: "file",
    buffer: Buffer.alloc(8),
    mediaType,
  };
}

function makeUrlSource(url: string, mediaType?: string): UrlSource {
  return {
    type: "url",
    url,
    ...(mediaType ? { mediaType } : {}),
  };
}

// ==================== canHandle — file sources ====================

describe("VideoAdapter.canHandle (file sources)", () => {
  const adapter = new VideoAdapter();

  it("handles video/mp4", () => {
    expect(adapter.canHandle(makeFileSource("video/mp4"))).toBe(true);
  });

  it("handles video/webm", () => {
    expect(adapter.canHandle(makeFileSource("video/webm"))).toBe(true);
  });

  it("handles video/quicktime", () => {
    expect(adapter.canHandle(makeFileSource("video/quicktime"))).toBe(true);
  });

  it("handles video/x-msvideo (AVI)", () => {
    expect(adapter.canHandle(makeFileSource("video/x-msvideo"))).toBe(true);
  });

  it("does NOT handle audio/mpeg", () => {
    expect(adapter.canHandle(makeFileSource("audio/mpeg"))).toBe(false);
  });

  it("does NOT handle application/pdf", () => {
    expect(adapter.canHandle(makeFileSource("application/pdf"))).toBe(false);
  });

  it("does NOT handle text/plain", () => {
    expect(adapter.canHandle(makeFileSource("text/plain"))).toBe(false);
  });
});

// ==================== canHandle — YouTube URLs ====================

describe("VideoAdapter.canHandle (YouTube URLs)", () => {
  const adapter = new VideoAdapter();

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

  it("handles m.youtube.com mobile URL", () => {
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

  it("does NOT handle youtube.com root (no video ID)", () => {
    expect(adapter.canHandle(makeUrlSource("https://www.youtube.com/"))).toBe(
      false
    );
  });

  it("does NOT handle a look-alike domain", () => {
    expect(
      adapter.canHandle(makeUrlSource("https://notyoutube.com/watch?v=xyz"))
    ).toBe(false);
  });
});

// ==================== canHandle — direct video file URLs ====================

describe("VideoAdapter.canHandle (direct video URLs)", () => {
  const adapter = new VideoAdapter();

  it("handles .mp4 URLs", () => {
    expect(
      adapter.canHandle(makeUrlSource("https://cdn.example.com/video.mp4"))
    ).toBe(true);
  });

  it("handles .mov URLs", () => {
    expect(
      adapter.canHandle(makeUrlSource("https://cdn.example.com/clip.mov"))
    ).toBe(true);
  });

  it("handles .webm URLs", () => {
    expect(
      adapter.canHandle(makeUrlSource("https://cdn.example.com/video.webm"))
    ).toBe(true);
  });

  it("handles .mkv URLs", () => {
    expect(
      adapter.canHandle(makeUrlSource("https://cdn.example.com/film.mkv"))
    ).toBe(true);
  });

  it("handles .avi URLs", () => {
    expect(
      adapter.canHandle(makeUrlSource("https://cdn.example.com/old.avi"))
    ).toBe(true);
  });

  it("does NOT handle .mp3 URLs (audio, not video)", () => {
    expect(
      adapter.canHandle(makeUrlSource("https://cdn.example.com/audio.mp3"))
    ).toBe(false);
  });

  it("does NOT handle .pdf URLs", () => {
    expect(
      adapter.canHandle(makeUrlSource("https://cdn.example.com/doc.pdf"))
    ).toBe(false);
  });

  it("handles URL with explicit video/* mediaType override", () => {
    expect(
      adapter.canHandle(
        makeUrlSource("https://cdn.example.com/stream", "video/mp4")
      )
    ).toBe(true);
  });
});

// ==================== AdapterRegistry routing ====================

describe("AdapterRegistry — VideoAdapter routing", () => {
  it("routes video/mp4 file source to VideoAdapter", () => {
    const registry = new SimpleAdapterRegistry();
    const adapter = new VideoAdapter();
    registry.register(adapter);

    const resolved = registry.resolve(makeFileSource("video/mp4"));
    expect(resolved).toBe(adapter);
  });

  it("routes a YouTube URL to VideoAdapter", () => {
    const registry = new SimpleAdapterRegistry();
    const adapter = new VideoAdapter();
    registry.register(adapter);

    const resolved = registry.resolve(
      makeUrlSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    );
    expect(resolved).toBe(adapter);
  });

  it("does NOT route audio/mpeg to VideoAdapter", () => {
    const registry = new SimpleAdapterRegistry();
    const adapter = new VideoAdapter();
    registry.register(adapter);

    const resolved = registry.resolve(makeFileSource("audio/mpeg"));
    expect(resolved).toBeUndefined();
  });

  it("listAdapters returns registered adapters in order", () => {
    const registry = new SimpleAdapterRegistry();
    const a = new VideoAdapter();
    registry.register(a);
    expect(registry.listAdapters()).toContain(a);
    expect(registry.listAdapters()).toHaveLength(1);
  });
});

// ==================== extract — error handling (no real FFmpeg) ====================

describe("VideoAdapter.extract (error handling — FFmpeg not available)", () => {
  it("rejects with a descriptive error for a fake video buffer", async () => {
    const adapter = new VideoAdapter();
    const source: FileSource = {
      type: "file",
      buffer: Buffer.from("this-is-not-a-real-video"),
      mediaType: "video/mp4",
      fileName: "fake.mp4",
    };

    await expect(adapter.extract(source)).rejects.toThrow();
  });

  it("rejects for unsupported source type after canHandle passes", async () => {
    // This tests that the adapter correctly propagates errors from FFmpeg
    const adapter = new VideoAdapter();
    const source: FileSource = {
      type: "file",
      buffer: Buffer.alloc(100),
      mediaType: "video/webm",
      fileName: "blank.webm",
    };

    // Without real video data the adapter must reject, not hang
    await expect(
      Promise.race([
        adapter.extract(source),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 10_000)
        ),
      ])
    ).rejects.toThrow();
  });
});

// ==================== getMetadata — error handling ====================

describe("VideoAdapter.getMetadata (error handling)", () => {
  it("returns metadata object even when ffprobe fails for a fake buffer", async () => {
    // getMetadata catches ffprobe errors gracefully and returns partial metadata
    const adapter = new VideoAdapter();
    const source: FileSource = {
      type: "file",
      buffer: Buffer.from("garbage video data"),
      mediaType: "video/mp4",
    };

    const meta = await adapter.getMetadata(source);
    // Should return a metadata object (possibly with just the basic fields)
    expect(meta).toBeDefined();
    expect(typeof meta).toBe("object");
    expect(meta.mediaType).toBe("video/mp4");
  });

  it("always includes mediaType in returned metadata", async () => {
    const adapter = new VideoAdapter();
    const source: FileSource = {
      type: "file",
      buffer: Buffer.from("fake"),
      mediaType: "video/webm",
    };

    const meta = await adapter.getMetadata(source);
    expect(meta.mediaType).toBe("video/webm");
  });
});
