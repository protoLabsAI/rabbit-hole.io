# Transcription Playground

Interactive component for testing OpenAI-compatible transcription services.

## Features

- **Multi-Provider Support**: OpenAI, Groq (FREE), Local (faster-whisper)
- **Transcription**: Convert audio to text with timestamps
- **Translation**: Translate audio to English (OpenAI only)
- **Speaker Diarization**: Identify different speakers (OpenAI/Local)
- **Flexible Configuration**: Model selection, language, prompts, temperature
- **Real-time Status**: Provider health checks and availability
- **Multiple Formats**: JSON, text, SRT, VTT, verbose JSON, diarized JSON

## Usage

```typescript
import { TranscriptionPlayground } from "@/components/transcription-playground";

// With default provider (Groq - FREE)
<TranscriptionPlayground />

// With specific provider
<TranscriptionPlayground defaultProvider="openai" />
<TranscriptionPlayground defaultProvider="local" />
```

## Providers

### Groq (Recommended for MVP)

- **Cost**: FREE (10,000 minutes/day)
- **Speed**: Very fast (GPU-optimized)
- **Limitations**: English-only, no diarization
- **Models**: distil-whisper-large-v3-en, whisper-large-v3-turbo

### OpenAI

- **Cost**: $0.006/minute ($0.36/hour)
- **Features**: All languages, diarization support
- **Models**: gpt-4o-transcribe, gpt-4o-mini-transcribe, gpt-4o-transcribe-diarize

### Local (faster-whisper)

- **Cost**: Infrastructure only
- **Features**: Full control, diarization, all languages
- **Setup**: Requires local server running at `localhost:8020`
- **Models**: large-v3, large-v2, medium, small, base, tiny

## Configuration

Set server-side environment variables (no NEXT*PUBLIC* prefix needed for API keys):

```bash
# .env (server-side only - API proxy handles authentication)
# IMPORTANT: API keys below are SERVER-ONLY environment variables.
# They are used in API routes and NEVER exposed to the browser.
# Do NOT prefix API keys with NEXT_PUBLIC_ as that would expose them to clients.
# (CORS origins with NEXT_PUBLIC_ prefix are safe and intended for browser access.)

TRANSCRIPTION_PROVIDER=groq
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk_...
TRANSCRIPTION_BASE_URL=http://localhost:8020/v1

# CORS config (optional - these are safe with NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_STORYBOOK_ORIGIN=http://localhost:6006

# NOTE: Transcription uses API proxy pattern
# - API keys stay on server (never exposed to browser)
# - Calls go through /api/transcribe route
# - Works in Storybook, dev, and production
```

## Supported Audio Formats

- MP3
- MP4/M4A
- WAV
- WEBM
- MPEG/MPGA

## Response Formats

- **json**: Standard JSON with text
- **text**: Plain text only
- **verbose_json**: JSON with segments and metadata
- **srt**: SubRip subtitle format
- **vtt**: WebVTT subtitle format
- **diarized_json**: JSON with speaker labels (OpenAI only)

## Examples

### Basic Transcription

```typescript
const { mutate } = useTranscribe();

mutate({
  file: audioFile,
  provider: "groq",
  language: "en",
});
```

### With Timestamps and Diarization

```typescript
mutate({
  file: audioFile,
  provider: "openai",
  model: "gpt-4o-transcribe-diarize",
  timestampGranularities: ["word", "segment"],
  diarize: true,
  chunkingStrategy: "auto",
});
```

### Translation

```typescript
const { mutate } = useTranslate();

mutate({
  file: germanAudio,
  provider: "openai",
  model: "whisper-1",
});
```

## Testing in Storybook

```bash
pnpm storybook
# Navigate to: Tools > Transcription Playground
```

## API Reference

See `packages/proto-llm-tools/src/hooks/useTranscription.ts` for full API documentation.
