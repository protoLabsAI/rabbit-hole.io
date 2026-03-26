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
Comprehensive multi-source research agent with a structured 7-phase pipeline:
1. Scope & research brief
2. Evidence gathering with reflection
3. Entity extraction
4. Cross-reference & gap filling
5. Bundle assembly & validation
6. Ingestion to Neo4j
7. Summary report

Uses a supervisor-researcher pattern inspired by LangChain's open_deep_research.

```
Agent(subagent_type: "rabbit-hole:deep-research",
      prompt: "Research the Apollo space program ecosystem")
```

### entity-extractor
Focused entity extraction from text. Fast, uses Haiku:

```
Agent(subagent_type: "rabbit-hole:entity-extractor",
      prompt: "Extract entities from ./document.txt")
```

## Available MCP Tools (12)

| Tool | Description | Requires |
|------|-------------|----------|
| `wikipedia_search` | Fetch Wikipedia articles | Nothing |
| `web_search` | DuckDuckGo instant answers | Nothing |
| `tavily_search` | Premium web search | TAVILY_API_KEY |
| `extract_entities` | LLM entity extraction from text | ANTHROPIC_API_KEY |
| `validate_bundle` | Bundle integrity validation | Nothing |
| `ingest_bundle` | Ingest bundle into Neo4j graph | App running |
| `graph_search` | Search existing entities in Neo4j | App running |
| `research_entity` | Full research pipeline | ANTHROPIC_API_KEY |
| `ingest_url` | Ingest content from URL | Docker services |
| `ingest_file` | Ingest local file | Docker services |
| `transcribe_audio` | Audio transcription | Docker + GROQ_API_KEY |
| `extract_pdf` | PDF text extraction | Docker services |

## Network Access (HTTP Transport)

The MCP server also supports Streamable HTTP transport for network agents. Start the HTTP server on port 3398:

```bash
MCP_AUTH_TOKEN=$(openssl rand -hex 32) pnpm --filter @proto/mcp-server start:http
```

Remote clients connect via:

```json
{
  "mcpServers": {
    "rabbit-hole": {
      "url": "http://<host>:3398/mcp",
      "headers": { "Authorization": "Bearer <token>" }
    }
  }
}
```

OpenAPI spec available at `GET /openapi.json` for agent framework auto-discovery.

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
