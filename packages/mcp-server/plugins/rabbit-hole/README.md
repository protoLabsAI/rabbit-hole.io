# Rabbit Hole Plugin for Claude Code

Deep research and media processing tools for Claude Code. Search the web, extract entities, build knowledge graphs, and ingest any media format — all from your CLI.

## Installation

```bash
# 1. Clone the repo
git clone https://github.com/protoLabsAI/rabbit-hole.io
cd rabbit-hole.io

# 2. Build the MCP server
pnpm install
cd packages/mcp-server && pnpm build && cd ../..

# 3. Add the plugin marketplace
claude plugin marketplace add $(pwd)/packages/mcp-server/plugins

# 4. Install the plugin
claude plugin install rabbit-hole

# 5. Configure your environment
cp ~/.claude/plugins/rabbit-hole/.env.example ~/.claude/plugins/rabbit-hole/.env
# Edit .env and set RABBIT_HOLE_ROOT and ANTHROPIC_API_KEY
```

## Configuration

Edit `~/.claude/plugins/rabbit-hole/.env`:

| Variable | Required | Purpose |
|----------|----------|---------|
| `RABBIT_HOLE_ROOT` | Yes | Absolute path to your rabbit-hole.io repo |
| `ANTHROPIC_API_KEY` | For entity extraction | Powers LLM-based entity extraction |
| `TAVILY_API_KEY` | No | Premium web search (free tier via DuckDuckGo) |
| `GROQ_API_KEY` | No | Free audio transcription |
| `JOB_PROCESSOR_URL` | No | Media ingestion API (default: localhost:8680) |

## Commands

### /research `<topic>`
Research an entity or topic. Searches multiple sources, extracts entities, and builds a knowledge graph.

```
/research Apollo space program
/research "quantum computing applications"
```

### /ingest `<url or file>`
Extract text from any source — URLs, PDFs, audio, video, documents.

```
/ingest https://arxiv.org/pdf/2301.00001
/ingest ./interview.mp3
/ingest https://youtube.com/watch?v=...
```

### /graph `<topic or action>`
Build, validate, or extend knowledge graph bundles.

```
/graph Tesla Inc
/graph validate ./research-bundle.json
/graph extend ./bundle.json "add competitors"
```

## Agents

### deep-research
Comprehensive multi-source research agent. Use via the Task tool:

```
Task(subagent_type: "rabbit-hole:deep-research",
     prompt: "Research the history of artificial intelligence")
```

### entity-extractor
Focused entity extraction from text. Fast, uses Haiku:

```
Task(subagent_type: "rabbit-hole:entity-extractor",
     prompt: "Extract entities from ./document.txt")
```

## Available MCP Tools (10)

| Tool | Description | Requires |
|------|-------------|----------|
| `wikipedia_search` | Fetch Wikipedia articles | Nothing |
| `web_search` | DuckDuckGo instant answers | Nothing |
| `tavily_search` | Premium web search | TAVILY_API_KEY |
| `extract_entities` | LLM entity extraction from text | ANTHROPIC_API_KEY |
| `validate_bundle` | Bundle integrity validation | Nothing |
| `research_entity` | Full research pipeline | ANTHROPIC_API_KEY |
| `ingest_url` | Ingest content from URL | Docker services |
| `ingest_file` | Ingest local file | Docker services |
| `transcribe_audio` | Audio transcription | Docker + GROQ_API_KEY |
| `extract_pdf` | PDF text extraction | Docker services |

## Media Processing (Optional)

For media tools (ingest, transcribe, PDF), start Docker services:

```bash
cd /path/to/rabbit-hole.io
docker compose -f docker-compose.research.yml --env-file .env.research up -d
```

Research tools (Wikipedia, web search, entity extraction) work without Docker.

## Troubleshooting

**"RABBIT_HOLE_ROOT is not set"**
Edit `~/.claude/plugins/rabbit-hole/.env` and set the absolute path to your repo.

**"MCP server not built"**
Run `cd packages/mcp-server && pnpm build`.

**"Job processor unavailable"**
Start Docker services for media tools. Research tools still work without Docker.

**"Entity extraction disabled"**
Set `ANTHROPIC_API_KEY` in your plugin `.env` file.
