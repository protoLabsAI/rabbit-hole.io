/**
 * VideoAdapter
 *
 * Handles video/* MIME types, YouTube URLs, and direct video file URLs.
 *
 * Three ingestion paths:
 *   1. YouTube URL  — use yt-dlp to download video (at requested quality)
 *                     and extract audio track.
 *   2. Direct URL   — stream video to MinIO, then download locally and use
 *                     FFmpeg to extract audio.
 *   3. File upload  — use FFmpeg to extract audio directly from the buffer.
 *
 * In all cases ffprobe extracts video metadata (duration, resolution, codec,
 * fps) and the extracted audio is routed through AudioAdapter for
 * transcription.
 *
 * Artifacts returned:
 *   - "video"      — reference to the original video
 *   - "audio"      — reference to the extracted audio track
 *   - "transcript" — reference to the full transcript text
 *   - "segment-N"  — one per timestamped transcript segment (if available)
 */

import { execFile } from "node:child_process";
import {
  mkdtemp,
  readdir,
  readFile,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { Client } from "minio";

import type {
  ExtractionResult,
  IngestSource,
  MediaAdapter,
} from "@proto/types";

import { AudioAdapter } from "./audio-adapter.js";

const execFileAsync = promisify(execFile);

// ==================== Video MIME / URL detection ====================

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".avi",
  ".mkv",
  ".webm",
  ".flv",
  ".wmv",
  ".m4v",
  ".mpeg",
  ".mpg",
  ".3gp",
  ".ogv",
  ".ts",
]);

function isVideoMimeType(mediaType: string): boolean {
  return mediaType.startsWith("video/");
}

function isYouTubeUrl(url: string): boolean {
  try {
    const { hostname, pathname, searchParams } = new URL(url);
    const host = hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (host === "youtube.com") {
      return (
        (pathname === "/watch" && !!searchParams.get("v")) ||
        pathname.startsWith("/shorts/") ||
        pathname.startsWith("/embed/")
      );
    }
    if (host === "youtu.be") {
      return pathname.length > 1;
    }
    return false;
  } catch {
    return false;
  }
}

function isVideoUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const ext = pathname.substring(pathname.lastIndexOf("."));
    return VIDEO_EXTENSIONS.has(ext);
  } catch {
    return false;
  }
}

// ==================== Video quality ====================

export type VideoQuality = "720p" | "1080p" | "480p" | "360p" | "best";

function ytDlpFormatSelector(quality: VideoQuality): string {
  switch (quality) {
    case "1080p":
      return "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[height<=1080]/best";
    case "720p":
      return "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]/best";
    case "480p":
      return "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best[height<=480]/best";
    case "360p":
      return "bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best[height<=360]/best";
    case "best":
    default:
      return "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
  }
}

// ==================== FFprobe metadata ====================

interface VideoMetadata {
  duration?: number;
  width?: number;
  height?: number;
  codec?: string;
  fps?: number;
  bitrate?: number;
  format?: string;
  size?: number;
  audioCodec?: string;
}

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  bit_rate?: string;
  duration?: string;
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: {
    duration?: string;
    bit_rate?: string;
    size?: string;
    format_name?: string;
  };
}

async function extractVideoMetadata(filePath: string): Promise<VideoMetadata> {
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
  const videoStream = data.streams?.find((s) => s.codec_type === "video");
  const audioStream = data.streams?.find((s) => s.codec_type === "audio");
  const fmt = data.format;

  // Parse frame rate from "num/den" string
  let fps: number | undefined;
  const fpsStr = videoStream?.avg_frame_rate ?? videoStream?.r_frame_rate;
  if (fpsStr && fpsStr !== "0/0") {
    const [num, den] = fpsStr.split("/").map(Number);
    if (den && den !== 0) fps = num / den;
  }

  return {
    duration:
      fmt?.duration !== undefined ? parseFloat(fmt.duration) : undefined,
    width: videoStream?.width,
    height: videoStream?.height,
    codec: videoStream?.codec_name,
    fps,
    bitrate:
      fmt?.bit_rate !== undefined ? parseInt(fmt.bit_rate, 10) : undefined,
    format: fmt?.format_name,
    size: fmt?.size !== undefined ? parseInt(fmt.size, 10) : undefined,
    audioCodec: audioStream?.codec_name,
  };
}

// ==================== FFmpeg audio extraction ====================

/**
 * Extract audio from video file and write to `outputPath` as a WAV file
 * (16 kHz mono — ready for Whisper transcription).
 */
async function extractAudioFromVideo(
  inputPath: string,
  outputPath: string
): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-i",
    inputPath,
    "-vn", // strip video
    "-ar",
    "16000", // 16 kHz sample rate
    "-ac",
    "1", // mono
    "-f",
    "wav",
    "-y",
    outputPath,
  ]);
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

async function streamUrlToMinio(
  url: string,
  client: Client,
  bucket: string,
  key: string
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `VideoAdapter: failed to download URL (HTTP ${response.status}): ${url}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await ensureBucket(client, bucket);
  await client.putObject(bucket, key, buffer, buffer.length, {
    "Content-Type": "application/octet-stream",
  });
}

// ==================== Cleanup helper ====================

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

// ==================== VideoAdapter ====================

export interface VideoAdapterOptions {
  /** Default quality when downloading from YouTube. Default: "720p". */
  quality?: VideoQuality;
}

/**
 * VideoAdapter — a MediaAdapter that handles video/* MIME types,
 * YouTube URLs, and direct video file URLs.
 */
export class VideoAdapter implements MediaAdapter {
  private readonly quality: VideoQuality;
  private readonly minioClient: Client;
  private readonly tempBucket: string;
  private readonly audioAdapter: AudioAdapter;

  constructor(options: VideoAdapterOptions = {}) {
    this.quality = options.quality ?? "720p";
    this.minioClient = createMinioClient();
    this.tempBucket = process.env.MINIO_TEMP_BUCKET ?? "evidence-temp";
    this.audioAdapter = new AudioAdapter();
  }

  canHandle(source: IngestSource): boolean {
    if (source.mediaType && isVideoMimeType(source.mediaType)) return true;
    if (source.type === "url") {
      return isYouTubeUrl(source.url) || isVideoUrl(source.url);
    }
    return false;
  }

  async extract(source: IngestSource): Promise<ExtractionResult> {
    const tmpDir = await mkdtemp(join(tmpdir(), "video-adapter-"));
    const videoPath = join(tmpDir, "video.mp4");
    const audioPath = join(tmpDir, "audio.wav");

    try {
      // 1. Materialise the video onto local disk
      await this.writeVideoToFile(source, videoPath, tmpDir);

      // 2. Extract video metadata via ffprobe (best-effort)
      const videoMeta = await extractVideoMetadata(videoPath).catch(
        () => ({}) as VideoMetadata
      );

      // 3. Extract audio track via FFmpeg
      await extractAudioFromVideo(videoPath, audioPath);

      // 4. Route audio through AudioAdapter for transcription
      const audioBuffer = await readFile(audioPath);
      const audioSource: IngestSource = {
        type: "file",
        mediaType: "audio/wav",
        buffer: audioBuffer,
        fileName: "audio.wav",
      };
      const audioResult = await this.audioAdapter.extract(audioSource);

      // 5. Build metadata combining video + audio fields
      const metadata: Record<string, unknown> = {
        mediaType: source.mediaType ?? "video/*",
        ...(source.type === "file" && source.fileName
          ? { fileName: source.fileName }
          : {}),
        ...(source.type === "url" ? { sourceUrl: source.url } : {}),
        ...(isYouTubeUrl((source as { url?: string }).url ?? "")
          ? { youtubeUrl: (source as { url: string }).url }
          : {}),
        quality: this.quality,
        ...(videoMeta.duration !== undefined
          ? { duration: videoMeta.duration }
          : {}),
        ...(videoMeta.width !== undefined && videoMeta.height !== undefined
          ? { resolution: `${videoMeta.width}x${videoMeta.height}` }
          : {}),
        ...(videoMeta.width !== undefined ? { width: videoMeta.width } : {}),
        ...(videoMeta.height !== undefined ? { height: videoMeta.height } : {}),
        ...(videoMeta.codec ? { videoCodec: videoMeta.codec } : {}),
        ...(videoMeta.fps !== undefined ? { fps: videoMeta.fps } : {}),
        ...(videoMeta.bitrate !== undefined
          ? { bitrate: videoMeta.bitrate }
          : {}),
        ...(videoMeta.format ? { format: videoMeta.format } : {}),
        ...(videoMeta.audioCodec ? { audioCodec: videoMeta.audioCodec } : {}),
        // Pass through audio metadata from AudioAdapter
        ...Object.fromEntries(
          Object.entries(audioResult.metadata).filter(
            ([k]) => !["mediaType", "fileName", "sourceUrl"].includes(k)
          )
        ),
      };

      // 6. Build artifacts: video + audio + transcript + segments
      const segmentArtifacts = audioResult.artifacts;
      const artifacts = [
        {
          key: "video",
          mediaType: source.mediaType ?? "video/mp4",
          label: "Original Video",
        },
        {
          key: "audio",
          mediaType: "audio/wav",
          label: "Extracted Audio Track",
        },
        {
          key: "transcript",
          mediaType: "text/plain",
          label: "Video Transcript",
        },
        ...segmentArtifacts,
      ];

      return {
        text: audioResult.text,
        metadata,
        artifacts,
        category: "video",
      };
    } finally {
      await cleanupTmpDir(tmpDir);
    }
  }

  async getMetadata(source: IngestSource): Promise<Record<string, unknown>> {
    const tmpDir = await mkdtemp(join(tmpdir(), "video-meta-"));
    const videoPath = join(tmpDir, "video.mp4");

    try {
      await this.writeVideoToFile(source, videoPath, tmpDir);
      const videoMeta = await extractVideoMetadata(videoPath).catch(
        () => ({}) as VideoMetadata
      );

      return {
        mediaType: source.mediaType ?? "video/*",
        ...(source.type === "file" && source.fileName
          ? { fileName: source.fileName }
          : {}),
        ...(source.type === "url" ? { sourceUrl: source.url } : {}),
        ...(isYouTubeUrl((source as { url?: string }).url ?? "")
          ? { youtubeUrl: (source as { url: string }).url }
          : {}),
        quality: this.quality,
        ...(videoMeta.duration !== undefined
          ? { duration: videoMeta.duration }
          : {}),
        ...(videoMeta.width !== undefined && videoMeta.height !== undefined
          ? { resolution: `${videoMeta.width}x${videoMeta.height}` }
          : {}),
        ...(videoMeta.codec ? { videoCodec: videoMeta.codec } : {}),
        ...(videoMeta.fps !== undefined ? { fps: videoMeta.fps } : {}),
        ...(videoMeta.bitrate !== undefined
          ? { bitrate: videoMeta.bitrate }
          : {}),
        ...(videoMeta.format ? { format: videoMeta.format } : {}),
        ...(videoMeta.audioCodec ? { audioCodec: videoMeta.audioCodec } : {}),
      };
    } finally {
      await cleanupTmpDir(tmpDir);
    }
  }

  /**
   * Write video data to `videoPath` on disk.
   *
   * - File source: write buffer directly.
   * - YouTube URL: invoke yt-dlp to download to `videoPath`.
   * - Direct video URL: stream to MinIO, retrieve locally, delete temp object.
   */
  private async writeVideoToFile(
    source: IngestSource,
    videoPath: string,
    tmpDir: string
  ): Promise<void> {
    if (source.type === "file") {
      await writeFile(videoPath, source.buffer);
      return;
    }

    if (isYouTubeUrl(source.url)) {
      await this.downloadYouTubeVideo(source.url, videoPath, tmpDir);
      return;
    }

    // Direct video URL — stream to MinIO then retrieve locally
    const minioKey = `video-temp/${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await streamUrlToMinio(
      source.url,
      this.minioClient,
      this.tempBucket,
      minioKey
    );

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
    await writeFile(videoPath, Buffer.concat(chunks));

    // Remove temporary MinIO object (best-effort)
    this.minioClient.removeObject(this.tempBucket, minioKey).catch(() => {});
  }

  /**
   * Download a YouTube video using yt-dlp.
   * The output is written to `outputPath` (MP4 container).
   */
  private async downloadYouTubeVideo(
    url: string,
    outputPath: string,
    tmpDir: string
  ): Promise<void> {
    const format = ytDlpFormatSelector(this.quality);

    // yt-dlp writes to the specified output template; we use a fixed name
    // inside tmpDir and rename if needed.
    await execFileAsync("yt-dlp", [
      "--format",
      format,
      "--merge-output-format",
      "mp4",
      "--output",
      outputPath,
      "--no-playlist",
      "--quiet",
      url,
    ]);
  }
}
