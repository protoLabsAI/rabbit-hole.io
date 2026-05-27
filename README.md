# Rabbit Hole

> AI search you can self-host. Web + Wikipedia + your files, with a clean multi-protocol API.

Apache 2.0 — run it yourself, plug in your own LLM key, no subscription.

## What you get

- Perplexity-style web search agent (bring your own LLM — our gateway, or any OpenAI-compatible/Anthropic key) with streaming answers and inline citations.
- File / audio / video / PDF ingestion via the bundled job processor — uploaded media gets transcribed, parsed, and embedded into a searchable corpus (pgvector; ingest→embed pipeline landing, see issue #291).
- Two distribution surfaces: the chat **Web UI** and the **`rh` CLI** (`@protolabsai/rabbit-hole-cli`: `search`, `research`, `ingest`, `status`) for fleet agents to shell out to. An OpenAI-compatible API is also exposed.
- Optional Langfuse tracing.

The full graph / research workspace from earlier versions is being rebuilt. They're not part of the launch surface and are gated out of production builds; set `NEXT_PUBLIC_ENABLE_RESEARCH_ATLAS=true` if you want to poke at them in dev.

## Quick start (self-host)

You need Docker with the Compose plugin and an LLM provider key.

```bash
git clone https://github.com/protoLabsAI/rabbit-hole.io.git
cd rabbit-hole.io
cp .env.example .env
# edit .env — set ANTHROPIC_API_KEY (or OPENAI_API_KEY)
docker compose up -d
```

Open `http://localhost:3399`.

What's running:
- `rabbit-hole` — the Next.js search app
- `job-processor` — file/audio/video ingest pipeline
- `postgres` + `postgres-jobs` — sessions and the job queue
- `minio` + `minio-init` — object storage for uploaded files

What's **not** running by default:
- A web search backend. Without `SEARXNG_ENDPOINT` set, the agent only has Wikipedia. Run [SearXNG](https://docs.searxng.org/admin/installation-docker.html) on your network and point `SEARXNG_ENDPOINT` at it.

## Configuration

All env vars live in `.env`. The required ones:

```dotenv
ANTHROPIC_API_KEY=...        # one of these is required
OPENAI_API_KEY=...

POSTGRES_PASSWORD=...        # any string; defaults work for local
POSTGRES_JOB_PASSWORD=...
MINIO_ROOT_PASSWORD=...
```

Recommended additions:

```dotenv
SEARXNG_ENDPOINT=http://searxng:8080   # enables web search beyond Wikipedia
GROQ_API_KEY=...                       # free Whisper transcription for audio uploads
```

See [`.env.example`](./.env.example) for the full list.

## Local dev (without Docker)

```bash
pnpm install
pnpm run dev:rabbit-hole
```

Opens on `http://localhost:3399`. You still need a Postgres + MinIO instance reachable; the `docker-compose.yml` will give you those and you can run the Next.js app on the host.

## Roadmap

| Surface | Status |
|---|---|
| Web search UI (`/`) | shipping |
| Self-host docker-compose | shipping |
| `rh` CLI (`@protolabsai/rabbit-hole-cli`) | shipping |
| OpenAI-compatible API (`/v1/chat/completions`) | in progress |
| Corpus search (pgvector) | in progress ([#291](https://github.com/protoLabsAI/rabbit-hole.io/issues/291)) |
| Research / Atlas workspace | rebuilding (dev flag) |
| Stripe-paid hosted tier | in progress |

> The HTTP MCP server and standalone A2A endpoint from earlier versions are retired — fleet agents use the `rh` CLI instead.

## License

Apache 2.0 — see [LICENSE](./LICENSE).
