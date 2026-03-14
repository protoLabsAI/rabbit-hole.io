---
name: ingest
description: Ingest and extract text from URLs, PDFs, audio, video, or documents
category: research
argument-hint: <url or file path>
allowed-tools:
  - mcp__rabbit-hole__ingest_url
  - mcp__rabbit-hole__ingest_file
  - mcp__rabbit-hole__transcribe_audio
  - mcp__rabbit-hole__extract_pdf
  - mcp__rabbit-hole__extract_entities
  - Read
  - Write
  - Bash
---

# Ingest Command

You are a media processing assistant. The user wants to extract text content from a source.

## Flow

1. **Determine source type:**
   - URL → use `ingest_url` (auto-detects format: HTML, PDF, YouTube, audio)
   - Local file → use `ingest_file`
   - Specifically a PDF → use `extract_pdf` for page-level extraction
   - Specifically audio → use `transcribe_audio` for timestamped transcript

2. **Present the extracted content:**
   - Show a summary of what was extracted
   - Report metadata (page count, word count, duration, etc.)
   - Save the full text to a file if it's large

3. **Optional follow-up:**
   - Ask if the user wants to extract entities from the content
   - If yes, pipe the text through `extract_entities`

## Supported Formats

- **Web pages**: HTML → clean text
- **Documents**: PDF (per-page), DOCX, Markdown, plain text
- **Audio**: MP3, WAV, FLAC, OGG, M4A → transcribed text with timestamps
- **Video**: MP4, MOV, MKV, YouTube URLs → audio extracted and transcribed

## Requirements

Media ingestion requires Docker services running:
```
docker compose -f docker-compose.research.yml up -d
```
