/**
 * Media Processing Tools
 *
 * Ingest and extract text from various media formats:
 * text, HTML, markdown, PDF, audio, video, DOCX.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const mediaTools: Tool[] = [
  {
    name: "ingest_url",
    description:
      "Ingest content from a URL. Automatically detects format (HTML, PDF, audio, video, etc.) and extracts text. For YouTube URLs, downloads and transcribes the video. Returns extracted text and metadata.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "URL to ingest (webpage, PDF, YouTube video, audio file, etc.)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "ingest_file",
    description:
      "Ingest a local file and extract text content. Supports: text, HTML, markdown, PDF, DOCX, audio (mp3/wav/flac/ogg), video (mp4/mov/mkv). Audio/video files are transcribed.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Absolute path to the file to ingest",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "transcribe_audio",
    description:
      "Transcribe an audio file to text with timestamps. Supports mp3, wav, flac, ogg, m4a, aac, opus, wma, aiff, webm. Uses Groq (free), OpenAI, or local Whisper for transcription.",
    inputSchema: {
      type: "object",
      properties: {
        source: {
          type: "string",
          description: "URL or file path to the audio file",
        },
        provider: {
          type: "string",
          enum: ["groq", "openai", "local"],
          description:
            "Transcription provider (default: groq, free tier)",
          default: "groq",
        },
      },
      required: ["source"],
    },
  },
  {
    name: "extract_pdf",
    description:
      "Extract text from a PDF file with per-page output. Returns page-separated text, page count, and PDF metadata (title, author, dates).",
    inputSchema: {
      type: "object",
      properties: {
        source: {
          type: "string",
          description: "URL or file path to the PDF",
        },
      },
      required: ["source"],
    },
  },
];
