import { describe, expect, it, vi } from "vitest";

import type { FileSource, UrlSource } from "@protolabsai/types";

import {
  AudioAdapter,
  GatewayProvider,
  LocalWhisperProvider,
  type TranscriptionProvider,
  type TranscriptionResult,
} from "../audio-adapter.js";

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

// A no-op TranscriptionProvider that does not require real ffmpeg/API keys.
function makeMockProvider(
  result: Partial<TranscriptionResult> = {}
): TranscriptionProvider {
  return {
    transcribe: vi.fn().mockResolvedValue({
      text: result.text ?? "hello world",
      segments: result.segments ?? [],
      language: result.language,
    }),
  };
}

// ==================== canHandle ====================

describe("AudioAdapter.canHandle", () => {
  const adapter = new AudioAdapter(makeMockProvider());

  describe("file sources — MIME type detection", () => {
    it("handles audio/mpeg", () => {
      expect(adapter.canHandle(makeFileSource("", "audio/mpeg"))).toBe(true);
    });

    it("handles audio/wav", () => {
      expect(adapter.canHandle(makeFileSource("", "audio/wav"))).toBe(true);
    });

    it("handles audio/flac", () => {
      expect(adapter.canHandle(makeFileSource("", "audio/flac"))).toBe(true);
    });

    it("handles audio/ogg", () => {
      expect(adapter.canHandle(makeFileSource("", "audio/ogg"))).toBe(true);
    });

    it("handles audio/mp4", () => {
      expect(adapter.canHandle(makeFileSource("", "audio/mp4"))).toBe(true);
    });

    it("does NOT handle video/mp4", () => {
      expect(adapter.canHandle(makeFileSource("", "video/mp4"))).toBe(false);
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

  describe("URL sources — file extension detection", () => {
    it("handles .mp3 URLs without mediaType", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://example.com/audio.mp3"))
      ).toBe(true);
    });

    it("handles .wav URLs without mediaType", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://example.com/recording.wav"))
      ).toBe(true);
    });

    it("handles .flac URLs", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://example.com/track.flac"))
      ).toBe(true);
    });

    it("handles .m4a URLs", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://cdn.example.com/voice.m4a"))
      ).toBe(true);
    });

    it("handles .ogg URLs", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://example.com/sound.ogg"))
      ).toBe(true);
    });

    it("handles .aac URLs", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://example.com/audio.aac"))
      ).toBe(true);
    });

    it("handles .opus URLs", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://example.com/audio.opus"))
      ).toBe(true);
    });

    it("does NOT handle .mp4 URLs without mediaType (video extension)", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://example.com/video.mp4"))
      ).toBe(false);
    });

    it("does NOT handle .pdf URLs", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://example.com/doc.pdf"))
      ).toBe(false);
    });

    it("handles URL source with audio/* mediaType regardless of extension", () => {
      expect(
        adapter.canHandle(
          makeUrlSource("https://example.com/track", "audio/mpeg")
        )
      ).toBe(true);
    });

    it("handles uppercase extensions in URLs", () => {
      expect(
        adapter.canHandle(makeUrlSource("https://example.com/audio.MP3"))
      ).toBe(true);
    });
  });
});

// ==================== GatewayProvider configuration ====================

describe("GatewayProvider", () => {
  it("defaults base URL to the gateway and uses OPENAI_API_KEY", () => {
    const originalKey = process.env.OPENAI_API_KEY;
    const originalBase = process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_BASE_URL;
    process.env.OPENAI_API_KEY = "gw-key";
    const provider = new GatewayProvider();
    expect(provider).toBeInstanceOf(GatewayProvider);
    process.env.OPENAI_API_KEY = originalKey;
    process.env.OPENAI_BASE_URL = originalBase;
  });

  it("throws when the gateway key is unset", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const provider = new GatewayProvider({ apiKey: "" });
    await expect(provider.transcribe("/any/path")).rejects.toThrow(
      /OPENAI_API_KEY/
    );
    process.env.OPENAI_API_KEY = originalKey;
  });
});

// ==================== LocalWhisperProvider configuration ====================

describe("LocalWhisperProvider", () => {
  it("can be instantiated with custom host and port", () => {
    const provider = new LocalWhisperProvider("whisper-host", 9999);
    expect(provider).toBeInstanceOf(LocalWhisperProvider);
  });

  it("defaults to localhost:8020", () => {
    const provider = new LocalWhisperProvider();
    expect(provider).toBeInstanceOf(LocalWhisperProvider);
  });
});

// ==================== AudioAdapter — extract with mock provider ====================

// We cannot call extract() without real ffprobe/ffmpeg, so we skip those tests
// in the unit-test suite.  Integration tests requiring the CLI tools are
// excluded here and would live in a separate e2e/integration suite.
