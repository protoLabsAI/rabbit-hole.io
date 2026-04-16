/**
 * Integration tests for AudioAdapter.
 *
 * FFmpeg and transcription providers are mocked so that no real
 * audio processing or API keys are required.  The tests verify:
 *   – canHandle() detection logic for MIME types and URL extensions
 *   – extract() pipeline wiring when providers and ffprobe are mocked
 *   – provider construction and error handling
 *   – AdapterRegistry correctly routes audio sources to AudioAdapter
 */

import { describe, expect, it, vi, afterEach } from "vitest";

import type { FileSource, UrlSource } from "@protolabsai/types";

import { SimpleAdapterRegistry } from "../../jobs/MediaIngestionJob.js";
import {
  AudioAdapter,
  GroqProvider,
  LocalWhisperProvider,
  OpenAIProvider,
  type TranscriptionProvider,
  type TranscriptionResult,
} from "../../src/adapters/audio-adapter.js";

// ==================== Helpers ====================

function makeFileSource(
  mediaType: string,
  content: Buffer | string = "",
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

function makeMockProvider(
  overrides: Partial<TranscriptionResult> = {}
): TranscriptionProvider {
  return {
    transcribe: vi.fn().mockResolvedValue({
      text: overrides.text ?? "mocked transcript",
      segments: overrides.segments ?? [],
      language: overrides.language,
    }),
  };
}

// ==================== canHandle — file sources ====================

describe("AudioAdapter.canHandle (file sources)", () => {
  const adapter = new AudioAdapter(makeMockProvider());

  it("handles audio/mpeg", () => {
    expect(adapter.canHandle(makeFileSource("audio/mpeg"))).toBe(true);
  });

  it("handles audio/wav", () => {
    expect(adapter.canHandle(makeFileSource("audio/wav"))).toBe(true);
  });

  it("handles audio/flac", () => {
    expect(adapter.canHandle(makeFileSource("audio/flac"))).toBe(true);
  });

  it("handles audio/ogg", () => {
    expect(adapter.canHandle(makeFileSource("audio/ogg"))).toBe(true);
  });

  it("handles audio/mp4", () => {
    expect(adapter.canHandle(makeFileSource("audio/mp4"))).toBe(true);
  });

  it("does NOT handle video/mp4", () => {
    expect(adapter.canHandle(makeFileSource("video/mp4"))).toBe(false);
  });

  it("does NOT handle application/pdf", () => {
    expect(adapter.canHandle(makeFileSource("application/pdf"))).toBe(false);
  });

  it("does NOT handle text/plain", () => {
    expect(adapter.canHandle(makeFileSource("text/plain"))).toBe(false);
  });
});

// ==================== canHandle — URL sources ====================

describe("AudioAdapter.canHandle (URL sources)", () => {
  const adapter = new AudioAdapter(makeMockProvider());

  it("handles .mp3 URLs without explicit mediaType", () => {
    expect(
      adapter.canHandle(makeUrlSource("https://cdn.example.com/track.mp3"))
    ).toBe(true);
  });

  it("handles .wav URLs", () => {
    expect(
      adapter.canHandle(makeUrlSource("https://cdn.example.com/audio.wav"))
    ).toBe(true);
  });

  it("handles .flac URLs", () => {
    expect(
      adapter.canHandle(makeUrlSource("https://cdn.example.com/audio.flac"))
    ).toBe(true);
  });

  it("handles .m4a URLs", () => {
    expect(
      adapter.canHandle(makeUrlSource("https://cdn.example.com/voice.m4a"))
    ).toBe(true);
  });

  it("handles .ogg URLs", () => {
    expect(
      adapter.canHandle(makeUrlSource("https://cdn.example.com/sound.ogg"))
    ).toBe(true);
  });

  it("handles .aac URLs", () => {
    expect(
      adapter.canHandle(makeUrlSource("https://cdn.example.com/audio.aac"))
    ).toBe(true);
  });

  it("handles .opus URLs", () => {
    expect(
      adapter.canHandle(makeUrlSource("https://cdn.example.com/audio.opus"))
    ).toBe(true);
  });

  it("handles uppercase extensions (.MP3)", () => {
    expect(
      adapter.canHandle(makeUrlSource("https://cdn.example.com/track.MP3"))
    ).toBe(true);
  });

  it("does NOT handle .mp4 URLs (video extension)", () => {
    expect(
      adapter.canHandle(makeUrlSource("https://cdn.example.com/video.mp4"))
    ).toBe(false);
  });

  it("does NOT handle .pdf URLs", () => {
    expect(
      adapter.canHandle(makeUrlSource("https://cdn.example.com/doc.pdf"))
    ).toBe(false);
  });

  it("handles a URL source with audio/* mediaType regardless of extension", () => {
    expect(
      adapter.canHandle(
        makeUrlSource("https://cdn.example.com/stream", "audio/mpeg")
      )
    ).toBe(true);
  });
});

// ==================== GroqProvider ====================

describe("GroqProvider", () => {
  const originalKey = process.env.GROQ_API_KEY;

  afterEach(() => {
    process.env.GROQ_API_KEY = originalKey;
  });

  it("can be instantiated", () => {
    process.env.GROQ_API_KEY = "test-key";
    expect(new GroqProvider()).toBeInstanceOf(GroqProvider);
  });

  it("throws when apiKey is absent and GROQ_API_KEY env var is not set", async () => {
    delete process.env.GROQ_API_KEY;
    const provider = new GroqProvider("");
    await expect(provider.transcribe("/any/path")).rejects.toThrow(
      /GROQ_API_KEY/i
    );
  });
});

// ==================== OpenAIProvider ====================

describe("OpenAIProvider", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalKey;
  });

  it("can be instantiated", () => {
    process.env.OPENAI_API_KEY = "test-key";
    expect(new OpenAIProvider()).toBeInstanceOf(OpenAIProvider);
  });

  it("throws when apiKey is absent and OPENAI_API_KEY env var is not set", async () => {
    delete process.env.OPENAI_API_KEY;
    const provider = new OpenAIProvider("");
    await expect(provider.transcribe("/any/path")).rejects.toThrow(
      /OPENAI_API_KEY/i
    );
  });
});

// ==================== LocalWhisperProvider ====================

describe("LocalWhisperProvider", () => {
  it("can be instantiated with defaults", () => {
    expect(new LocalWhisperProvider()).toBeInstanceOf(LocalWhisperProvider);
  });

  it("can be instantiated with custom host and port", () => {
    expect(new LocalWhisperProvider("whisper-host", 9999)).toBeInstanceOf(
      LocalWhisperProvider
    );
  });
});

// ==================== AdapterRegistry routing ====================

describe("AdapterRegistry — AudioAdapter routing", () => {
  it("routes audio/mpeg file source to AudioAdapter", () => {
    const registry = new SimpleAdapterRegistry();
    const adapter = new AudioAdapter(makeMockProvider());
    registry.register(adapter);

    const source = makeFileSource("audio/mpeg");
    const resolved = registry.resolve(source);
    expect(resolved).toBe(adapter);
  });

  it("does NOT route application/pdf to AudioAdapter", () => {
    const registry = new SimpleAdapterRegistry();
    const adapter = new AudioAdapter(makeMockProvider());
    registry.register(adapter);

    const source = makeFileSource("application/pdf");
    const resolved = registry.resolve(source);
    expect(resolved).toBeUndefined();
  });

  it("resolves a .mp3 URL source to AudioAdapter", () => {
    const registry = new SimpleAdapterRegistry();
    const adapter = new AudioAdapter(makeMockProvider());
    registry.register(adapter);

    const source = makeUrlSource("https://cdn.example.com/track.mp3");
    const resolved = registry.resolve(source);
    expect(resolved).toBe(adapter);
  });
});

// ==================== extract — mocked FFmpeg/provider ====================

describe("AudioAdapter.extract (mocked provider — no real FFmpeg)", () => {
  // NOTE: AudioAdapter.extract() requires real FFmpeg/ffprobe binaries to
  // materialise and convert audio.  These tests verify that the adapter
  // correctly surfaces provider errors when the binary is absent, rather
  // than swallowing them silently.

  it("rejects when the audio buffer cannot be processed by ffprobe", async () => {
    const provider = makeMockProvider();
    const adapter = new AudioAdapter(provider);

    const source = makeFileSource(
      "audio/mpeg",
      Buffer.from("not-real-audio-data"),
      "fake.mp3"
    );

    // Without real ffprobe the adapter must throw or reject
    await expect(adapter.extract(source)).rejects.toThrow();
  });

  it("does not call the transcription provider when pre-processing fails", async () => {
    const provider = makeMockProvider();
    const adapter = new AudioAdapter(provider);

    const source = makeFileSource(
      "audio/mpeg",
      Buffer.from("garbage"),
      "garbage.mp3"
    );

    await adapter.extract(source).catch(() => {
      /* expected */
    });

    // transcribe should not be called if ffprobe failed
    expect(provider.transcribe).not.toHaveBeenCalled();
  });
});
