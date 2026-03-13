/**
 * AudioAdapter
 *
 * Handles audio/* MIME types and audio file URLs (e.g. .mp3, .wav, .flac).
 * Uses ffprobe to extract metadata (duration, codec, bitrate, sample rate,
 * channels) and FFmpeg to convert to 16 kHz mono WAV before transcription.
 *
 * Three built-in TranscriptionProvider implementations are included:
 *   - GroqProvider       — free, uses GROQ_API_KEY (default)
 *   - OpenAIProvider     — uses OPENAI_API_KEY
 *   - LocalWhisperProvider — faster-whisper HTTP server at port 8020
 *
 * When the source is a URL the audio file is downloaded via streaming to
 * MinIO (evidence-temp bucket) and then retrieved for local processing.
 */

import { execFile } from "node:child_process";
import {
  writeFile,
  readFile,
  mkdtemp,
  readdir,
  unlink,
  rmdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";
import { promisify } from "node:util";

import { Client } from "minio";

import type {
  ExtractionResult,
  IngestSource,
  MediaAdapter,
} from "@proto/types";

const execFileAsync = promisify(execFile);

// ==================== Audio MIME / URL detection ====================

const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".wav",
  ".flac",
  ".ogg",
  ".m4a",
  ".aac",
  ".opus",
  ".wma",
  ".aiff",
  ".aif",
  ".oga",
  ".webm",
]);

function isAudioMimeType(mediaType: string): boolean {
  return mediaType.startsWith("audio/");
}

function isAudioUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return AUDIO_EXTENSIONS.has(extname(pathname));
  } catch {
    return false;
  }
}

// ==================== FFprobe metadata ====================

interface AudioMetadata {
  duration?: number;
  codec?: string;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  format?: string;
  size?: number;
}

interface FfprobeOutput {
  streams?: Array<{
    codec_type?: string;
    codec_name?: string;
    sample_rate?: string;
    channels?: number;
    bit_rate?: string;
    duration?: string;
  }>;
  format?: {
    duration?: string;
    bit_rate?: string;
    size?: string;
    format_name?: string;
  };
}

async function extractAudioMetadata(filePath: string): Promise<AudioMetadata> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);

  const data = JSON.parse(stdout) as FfprobeOutput;
  const audioStream = data.streams?.find((s) => s.codec_type === "audio");
  const fmt = data.format;

  return {
    duration:
      fmt?.duration !== undefined ? parseFloat(fmt.duration) : undefined,
    codec: audioStream?.codec_name,
    bitrate:
      fmt?.bit_rate !== undefined ? parseInt(fmt.bit_rate, 10) : undefined,
    sampleRate:
      audioStream?.sample_rate !== undefined
        ? parseInt(audioStream.sample_rate, 10)
        : undefined,
    channels: audioStream?.channels,
    format: fmt?.format_name,
    size: fmt?.size !== undefined ? parseInt(fmt.size, 10) : undefined,
  };
}

// ==================== FFmpeg WAV conversion ====================

async function convertToWav16kHz(
  inputPath: string,
  outputPath: string
): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-i",
    inputPath,
    "-ar",
    "16000",
    "-ac",
    "1",
    "-f",
    "wav",
    "-y",
    outputPath,
  ]);
}

// ==================== TranscriptionProvider interface ====================

export interface TranscriptionSegment {
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Transcribed text for this segment */
  text: string;
}

export interface TranscriptionResult {
  /** Full transcript text */
  text: string;
  /** Timestamped segments (may be empty if provider does not support them) */
  segments: TranscriptionSegment[];
  /** Detected language code, if available */
  language?: string;
}

export interface TranscriptionProvider {
  /**
   * Transcribe the given 16 kHz mono WAV file and return the result.
   * @param wavFilePath Absolute path to the WAV file on disk.
   */
  transcribe(wavFilePath: string): Promise<TranscriptionResult>;
}

// ==================== GroqProvider ====================

/**
 * GroqProvider — transcribes audio using the Groq Whisper API (free tier).
 * Requires the GROQ_API_KEY environment variable.
 */
export class GroqProvider implements TranscriptionProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey?: string, model = "whisper-large-v3") {
    this.apiKey = apiKey ?? process.env.GROQ_API_KEY ?? "";
    this.model = model;
  }

  async transcribe(wavFilePath: string): Promise<TranscriptionResult> {
    if (!this.apiKey) {
      throw new Error(
        "GroqProvider: GROQ_API_KEY is not set. " +
          "Set the environment variable or pass an API key to the constructor."
      );
    }

    const audioBuffer = await readFile(wavFilePath);
    const blob = new Blob([audioBuffer], { type: "audio/wav" });

    const formData = new FormData();
    formData.append("file", blob, "audio.wav");
    formData.append("model", this.model);
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "segment");

    const response = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `GroqProvider: transcription failed (HTTP ${response.status}): ${error}`
      );
    }

    const data = (await response.json()) as {
      text: string;
      segments?: Array<{ start: number; end: number; text: string }>;
      language?: string;
    };

    return {
      text: data.text,
      segments:
        data.segments?.map((s) => ({
          start: s.start,
          end: s.end,
          text: s.text,
        })) ?? [],
      language: data.language,
    };
  }
}

// ==================== OpenAIProvider ====================

/**
 * OpenAIProvider — transcribes audio using the OpenAI Whisper API.
 * Requires the OPENAI_API_KEY environment variable.
 */
export class OpenAIProvider implements TranscriptionProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey?: string, model = "whisper-1") {
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.model = model;
  }

  async transcribe(wavFilePath: string): Promise<TranscriptionResult> {
    if (!this.apiKey) {
      throw new Error(
        "OpenAIProvider: OPENAI_API_KEY is not set. " +
          "Set the environment variable or pass an API key to the constructor."
      );
    }

    const audioBuffer = await readFile(wavFilePath);
    const blob = new Blob([audioBuffer], { type: "audio/wav" });

    const formData = new FormData();
    formData.append("file", blob, "audio.wav");
    formData.append("model", this.model);
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "segment");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `OpenAIProvider: transcription failed (HTTP ${response.status}): ${error}`
      );
    }

    const data = (await response.json()) as {
      text: string;
      segments?: Array<{ start: number; end: number; text: string }>;
      language?: string;
    };

    return {
      text: data.text,
      segments:
        data.segments?.map((s) => ({
          start: s.start,
          end: s.end,
          text: s.text,
        })) ?? [],
      language: data.language,
    };
  }
}

// ==================== LocalWhisperProvider ====================

/**
 * LocalWhisperProvider — transcribes audio via a locally running
 * faster-whisper HTTP server (default: http://localhost:8020).
 *
 * The server is expected to expose a POST /asr endpoint that accepts
 * multipart/form-data with an `audio_file` field and returns JSON with
 * at least a `text` field, and optionally `segments` and `language`.
 */
export class LocalWhisperProvider implements TranscriptionProvider {
  private readonly baseUrl: string;

  constructor(host = "localhost", port = 8020) {
    this.baseUrl = `http://${host}:${port}`;
  }

  async transcribe(wavFilePath: string): Promise<TranscriptionResult> {
    const audioBuffer = await readFile(wavFilePath);
    const blob = new Blob([audioBuffer], { type: "audio/wav" });

    const formData = new FormData();
    formData.append("audio_file", blob, "audio.wav");

    const response = await fetch(`${this.baseUrl}/asr`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `LocalWhisperProvider: transcription failed (HTTP ${response.status}): ${error}`
      );
    }

    const data = (await response.json()) as {
      text?: string;
      output?: string;
      segments?: Array<{ start: number; end: number; text: string }>;
      language?: string;
    };

    const text = data.text ?? data.output ?? "";

    return {
      text,
      segments:
        data.segments?.map((s) => ({
          start: s.start,
          end: s.end,
          text: s.text,
        })) ?? [],
      language: data.language,
    };
  }
}

// ==================== Provider factory ====================

function createDefaultProvider(): TranscriptionProvider {
  const providerName = process.env.TRANSCRIPTION_PROVIDER?.toLowerCase();
  if (providerName === "openai") return new OpenAIProvider();
  if (providerName === "local") return new LocalWhisperProvider();
  // Default: Groq (free)
  return new GroqProvider();
}

// ==================== MinIO helpers ====================

function createMinioClient(): Client {
  return new Client({
    endPoint:
      (process.env.MINIO_ENDPOINT ?? "localhost")
        .replace("http://", "")
        .replace("https://", "")
        .split(":")[0] ?? "localhost",
    port: parseInt(process.env.MINIO_PORT ?? "9000", 10),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "minio",
    secretKey: process.env.MINIO_SECRET_KEY ?? "minio123",
  });
}

async function ensureBucket(client: Client, bucket: string): Promise<void> {
  try {
    await client.makeBucket(bucket);
  } catch {
    // Bucket already exists — ignore
  }
}

/**
 * Stream the content at `url` into MinIO at `bucket/key`.
 */
async function streamUrlToMinio(
  url: string,
  client: Client,
  bucket: string,
  key: string
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `AudioAdapter: failed to download URL (HTTP ${response.status}): ${url}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await ensureBucket(client, bucket);
  await client.putObject(bucket, key, buffer, buffer.length, {
    "Content-Type": "application/octet-stream",
  });
}

// ==================== Utility ====================

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
}

async function cleanupTmpDir(dirPath: string): Promise<void> {
  try {
    const entries = await readdir(dirPath);
    await Promise.all(
      entries.map((e) => unlink(join(dirPath, e)).catch(() => {}))
    );
    await rmdir(dirPath).catch(() => {});
  } catch {
    // Best-effort cleanup
  }
}

// ==================== AudioAdapter ====================

/**
 * AudioAdapter — a MediaAdapter that handles audio/* MIME types and
 * audio file URLs.  It transcribes audio using the configured
 * TranscriptionProvider and returns timestamped transcript text.
 */
export class AudioAdapter implements MediaAdapter {
  private readonly provider: TranscriptionProvider;
  private readonly minioClient: Client;
  private readonly tempBucket: string;

  constructor(provider?: TranscriptionProvider) {
    this.provider = provider ?? createDefaultProvider();
    this.minioClient = createMinioClient();
    this.tempBucket = process.env.MINIO_TEMP_BUCKET ?? "evidence-temp";
  }

  canHandle(source: IngestSource): boolean {
    if (source.mediaType && isAudioMimeType(source.mediaType)) return true;
    if (source.type === "url") return isAudioUrl(source.url);
    return false;
  }

  async extract(source: IngestSource): Promise<ExtractionResult> {
    const tmpDir = await mkdtemp(join(tmpdir(), "audio-adapter-"));
    const inputPath = join(tmpDir, "input");
    const wavPath = join(tmpDir, "output.wav");

    try {
      // 1. Materialise the audio onto local disk
      await this.writeAudioToFile(source, inputPath);

      // 2. Extract metadata via ffprobe (best-effort)
      const audioMeta = await extractAudioMetadata(inputPath).catch(
        () => ({}) as AudioMetadata
      );

      // 3. Convert to 16 kHz mono WAV
      await convertToWav16kHz(inputPath, wavPath);

      // 4. Transcribe
      const transcription = await this.provider.transcribe(wavPath);

      // 5. Build formatted transcript with timestamps
      const formattedText =
        transcription.segments.length > 0
          ? transcription.segments
              .map(
                (s) =>
                  `[${formatTimestamp(s.start)} --> ${formatTimestamp(s.end)}] ${s.text.trim()}`
              )
              .join("\n")
          : transcription.text;

      const artifacts =
        transcription.segments.length > 0
          ? transcription.segments.map((s, i) => ({
              key: `segment-${i + 1}`,
              mediaType: "text/plain",
              label: `[${formatTimestamp(s.start)} - ${formatTimestamp(s.end)}] Segment ${i + 1}`,
            }))
          : [];

      const metadata: Record<string, unknown> = {
        mediaType: source.mediaType ?? "audio/*",
        ...(source.type === "file" && source.fileName
          ? { fileName: source.fileName }
          : {}),
        ...(source.type === "url" ? { sourceUrl: source.url } : {}),
        ...(audioMeta.duration !== undefined
          ? { duration: audioMeta.duration }
          : {}),
        ...(audioMeta.codec ? { codec: audioMeta.codec } : {}),
        ...(audioMeta.bitrate !== undefined
          ? { bitrate: audioMeta.bitrate }
          : {}),
        ...(audioMeta.sampleRate !== undefined
          ? { sampleRate: audioMeta.sampleRate }
          : {}),
        ...(audioMeta.channels !== undefined
          ? { channels: audioMeta.channels }
          : {}),
        ...(audioMeta.format ? { format: audioMeta.format } : {}),
        ...(transcription.language ? { language: transcription.language } : {}),
        segmentCount: transcription.segments.length,
      };

      return {
        text: formattedText || transcription.text,
        metadata,
        artifacts,
        category: "audio",
      };
    } finally {
      await cleanupTmpDir(tmpDir);
    }
  }

  async getMetadata(source: IngestSource): Promise<Record<string, unknown>> {
    const tmpDir = await mkdtemp(join(tmpdir(), "audio-meta-"));
    const inputPath = join(tmpDir, "input");

    try {
      await this.writeAudioToFile(source, inputPath);
      const audioMeta = await extractAudioMetadata(inputPath).catch(
        () => ({}) as AudioMetadata
      );

      return {
        mediaType: source.mediaType ?? "audio/*",
        ...(source.type === "file" && source.fileName
          ? { fileName: source.fileName }
          : {}),
        ...(source.type === "url" ? { sourceUrl: source.url } : {}),
        ...(audioMeta.duration !== undefined
          ? { duration: audioMeta.duration }
          : {}),
        ...(audioMeta.codec ? { codec: audioMeta.codec } : {}),
        ...(audioMeta.bitrate !== undefined
          ? { bitrate: audioMeta.bitrate }
          : {}),
        ...(audioMeta.sampleRate !== undefined
          ? { sampleRate: audioMeta.sampleRate }
          : {}),
        ...(audioMeta.channels !== undefined
          ? { channels: audioMeta.channels }
          : {}),
        ...(audioMeta.format ? { format: audioMeta.format } : {}),
      };
    } finally {
      await cleanupTmpDir(tmpDir);
    }
  }

  /**
   * Writes the audio source to `inputPath` on disk.
   *
   * For file sources the buffer is written directly.
   * For URL sources the content is streamed to MinIO first (so callers can
   * benefit from caching / object-store durability), then retrieved and
   * written to the local temp path, and finally the temp MinIO object is
   * removed.
   */
  private async writeAudioToFile(
    source: IngestSource,
    inputPath: string
  ): Promise<void> {
    if (source.type === "file") {
      await writeFile(inputPath, source.buffer);
      return;
    }

    // URL source — stream to MinIO, then retrieve locally
    const minioKey = `audio-temp/${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await streamUrlToMinio(
      source.url,
      this.minioClient,
      this.tempBucket,
      minioKey
    );

    // Retrieve from MinIO and write to local temp path
    const objectStream = await this.minioClient.getObject(
      this.tempBucket,
      minioKey
    );
    const chunks: Buffer[] = [];
    for await (const chunk of objectStream) {
      chunks.push(
        Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
      );
    }
    await writeFile(inputPath, Buffer.concat(chunks));

    // Remove the temporary MinIO object (best-effort)
    this.minioClient.removeObject(this.tempBucket, minioKey).catch(() => {});
  }
}
