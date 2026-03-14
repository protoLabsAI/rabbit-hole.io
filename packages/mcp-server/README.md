# Rabbit Hole MCP Server

MCP server for deep research and media processing. Lets any MCP client (Claude Code, Cursor, custom agents) search the web, extract entities, build knowledge graphs, and ingest media — all via tool calls.

## Quick Start

```bash
cd packages/mcp-server
pnpm install
pnpm build
```

## Claude Code Setup

Add to your project's `.claude/settings.json`:

```json
{
  "mcpServers": {
    "rabbit-hole": {
      "command": "node",
      "args": ["./packages/mcp-server/dist/index.js"],
      "env": {
        "JOB_PROCESSOR_URL": "http://localhost:8680",
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}",
        "TAVILY_API_KEY": "${TAVILY_API_KEY}",
        "GROQ_API_KEY": "${GROQ_API_KEY}"
      }
    }
  }
}
```

Or globally in `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "rabbit-hole": {
      "command": "node",
      "args": ["/absolute/path/to/rabbit-hole.io/packages/mcp-server/dist/index.js"],
      "env": {
        "JOB_PROCESSOR_URL": "http://localhost:8680",
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}",
        "TAVILY_API_KEY": "${TAVILY_API_KEY}",
        "GROQ_API_KEY": "${GROQ_API_KEY}"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `ANTHROPIC_API_KEY` | For entity extraction | — | Powers LLM-based entity extraction |
| `JOB_PROCESSOR_URL` | For media ingestion | `http://localhost:8680` | Job processor API for media processing |
| `TAVILY_API_KEY` | No | — | Premium web search (optional, free tier via DuckDuckGo) |
| `GROQ_API_KEY` | No | — | Free audio transcription via Groq |

## Available Tools (10)

### Research Tools

| Tool | Description |
|------|-------------|
| `wikipedia_search` | Fetch Wikipedia articles for any topic. Returns article text (up to 8K chars), URL, and related articles. |
| `web_search` | DuckDuckGo instant answers. No API key needed. Returns 5-8 results with snippets. |
| `tavily_search` | Premium web search with credibility scoring. Requires `TAVILY_API_KEY`. |
| `extract_entities` | LLM-based entity extraction from text. Identifies entities, types, properties, and relationships. Returns structured JSON. |
| `validate_bundle` | Validates a research bundle's structural integrity — entity schemas, relationship refs, completeness metrics. |
| `research_entity` | **Full pipeline.** Searches multiple sources → extracts entities → validates bundle. One tool call for complete research. |

### Media Processing Tools

| Tool | Description |
|------|-------------|
| `ingest_url` | Ingest any URL — auto-detects format (HTML, PDF, YouTube, audio). Extracts text and metadata. |
| `ingest_file` | Ingest a local file. Supports text, PDF, DOCX, audio (mp3/wav/flac), video (mp4/mov). |
| `transcribe_audio` | Transcribe audio with timestamps. Supports Groq (free), OpenAI, or local Whisper. |
| `extract_pdf` | Extract text from PDF with per-page output and document metadata. |

## Usage Examples

### Research an entity
```
Use the research_entity tool to research "Apollo space program" with detailed depth
```

### Search and extract
```
1. Use wikipedia_search to find info about "quantum computing"
2. Use extract_entities on the Wikipedia text to get structured data
3. Use validate_bundle to check the extraction quality
```

### Ingest media
```
Use ingest_url to extract text from https://example.com/paper.pdf
```

### Transcribe audio
```
Use transcribe_audio on /path/to/interview.mp3
```

## Infrastructure Requirements

For media processing tools, the job processor must be running:

```bash
docker compose -f docker-compose.research.yml --env-file .env.research up -d
```

This starts:
- **Job Processor** (port 8680) — media ingestion pipeline
- **PostgreSQL** (port 5432) — application database
- **Neo4j** (port 7687) — graph database
- **MinIO** (port 9000) — file storage

Research tools (`wikipedia_search`, `web_search`, `extract_entities`) work without Docker — they call external APIs directly.

## Development

```bash
# Run in dev mode (auto-reload)
pnpm dev

# Build for production
pnpm build

# Test tool listing
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

## Architecture

```
┌─────────────────────┐
│  MCP Client         │
│  (Claude Code, etc) │
└────────┬────────────┘
         │ stdio (JSON-RPC)
         ▼
┌─────────────────────┐
│  MCP Server         │
│  @proto/mcp-server  │
├─────────────────────┤
│  Research Tools     │──→ Wikipedia API, DuckDuckGo, Tavily, Anthropic
│  Media Tools        │──→ Job Processor (localhost:8680)
└─────────────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              ┌──────────┐  ┌──────────┐
              │ FFmpeg   │  │ Whisper  │
              │ yt-dlp   │  │ unpdf    │
              │ mammoth  │  │ etc.     │
              └──────────┘  └──────────┘
```
