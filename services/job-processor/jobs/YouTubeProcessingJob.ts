/**
 * YouTube Processing Job
 *
 * Handles YouTube video download, audio extraction, and entity creation
 */

import { Job } from "sidequest";

import { getGlobalNeo4jClient } from "@protolabsai/database";

interface YouTubeJobData {
  url: string;
  quality: "720p" | "1080p";
  userId: string;
  orgId: string | null;
  workspaceId: string;
  // Transcription options
  includeTranscript?: boolean;
  transcriptionProvider?: "groq" | "openai" | "local";
  transcriptionLanguage?: string;
}

interface TranscriptData {
  text: string;
  language?: string;
  duration?: number;
  segments: Array<{ start: number; end: number; text: string }>;
  chunks_processed: number;
  provider: string;
}

interface YouTubeProcessingResult {
  success: boolean;
  error?: string;
  video_metadata: {
    video_id: string;
    title: string;
    description: string;
    upload_date: string;
    duration_seconds: number;
    channel_name: string;
    channel_id: string;
    view_count: number;
    like_count: number | null;
    tags: string[];
    thumbnail_url: string;
  };
  video_canonical_key: string;
  audio_canonical_key: string;
  quality: string;
  file_size_bytes: number;
  audio_size_bytes: number;
  // Transcription (optional)
  transcript?: TranscriptData;
  transcript_canonical_key?: string;
}

export class YouTubeProcessingJob extends Job {
  private neo4jClient = getGlobalNeo4jClient();

  async run(data: YouTubeJobData) {
    const {
      url,
      quality,
      userId,
      orgId,
      workspaceId,
      includeTranscript,
      transcriptionProvider,
      transcriptionLanguage,
    } = data;

    console.log(
      `🎥 Processing YouTube video: ${url} at ${quality}${includeTranscript ? ` (with ${transcriptionProvider || "groq"} transcription)` : ""}`
    );

    try {
      // 1. Call microservice to process video
      const youtubeServiceUrl =
        process.env.YOUTUBE_PROCESSOR_URL || "http://host.docker.internal:8001";
      const response = await fetch(`${youtubeServiceUrl}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          quality,
          user_id: userId,
          org_id: orgId,
          workspace_id: workspaceId,
          include_transcript: includeTranscript,
          transcription_provider: transcriptionProvider,
          transcription_language: transcriptionLanguage,
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { detail?: string };
        throw new Error(error.detail || "Processing failed");
      }

      const result = (await response.json()) as YouTubeProcessingResult;

      if (!result.success) {
        throw new Error(result.error || "Processing failed");
      }

      console.log(`✅ Video downloaded: ${result.video_metadata.title}`);

      // 2. Create Neo4j entity
      await this.createVideoEntity(result, userId, orgId, workspaceId);

      // 3. TODO: Update storage quota in PostgreSQL
      // await this.updateStorageQuota(userId, orgId, result.file_size_bytes);

      console.log(
        `✅ YouTube video processed: ${result.video_metadata.title}${result.transcript ? ` (transcript: ${result.transcript.text.length} chars)` : ""}`
      );

      return {
        success: true,
        videoId: result.video_metadata.video_id,
        title: result.video_metadata.title,
        videoKey: result.video_canonical_key,
        audioKey: result.audio_canonical_key,
        fileSize: result.file_size_bytes,
        audioSize: result.audio_size_bytes,
        // Include transcript if available
        transcript: result.transcript,
        transcriptKey: result.transcript_canonical_key,
      };
    } catch (error) {
      console.error(`❌ YouTube processing failed:`, error);
      throw error;
    }
  }

  private async createVideoEntity(
    result: YouTubeProcessingResult,
    userId: string,
    orgId: string | null,
    workspaceId: string
  ) {
    const metadata = result.video_metadata;

    await this.neo4jClient.executeWrite(
      `
      CREATE (v:Video:YouTubeVideo:Evidence {
        uid: $uid,
        videoId: $videoId,
        title: $title,
        description: $description,
        uploadDate: $uploadDate,
        duration: $duration,
        channelName: $channelName,
        channelId: $channelId,
        viewCount: $viewCount,
        likeCount: $likeCount,
        tags: $tags,
        thumbnailUrl: $thumbnailUrl,
        canonicalKey: $canonicalKey,
        audioKey: $audioKey,
        quality: $quality,
        fileSizeBytes: $fileSizeBytes,
        audioSizeBytes: $audioSizeBytes,
        createdBy: $userId,
        orgId: $orgId,
        workspaceId: $workspaceId,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      `,
      {
        uid: `youtube_${metadata.video_id}`,
        videoId: metadata.video_id,
        title: metadata.title,
        description: metadata.description,
        uploadDate: metadata.upload_date,
        duration: metadata.duration_seconds,
        channelName: metadata.channel_name,
        channelId: metadata.channel_id,
        viewCount: metadata.view_count,
        likeCount: metadata.like_count ?? null,
        tags: metadata.tags,
        thumbnailUrl: metadata.thumbnail_url,
        canonicalKey: result.video_canonical_key,
        audioKey: result.audio_canonical_key,
        quality: result.quality,
        fileSizeBytes: result.file_size_bytes,
        audioSizeBytes: result.audio_size_bytes,
        userId,
        orgId,
        workspaceId,
      }
    );

    console.log(`✅ Created Neo4j video entity: ${metadata.video_id}`);
  }
}
