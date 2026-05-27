# @protolabsai/rabbit-hole-cli

`rh` — Rabbit Hole CLI. Search the web, search your ingested corpus, queue
media to the processor, and run deep research. Designed to be shelled out to
by fleet agents (protoMaker, workstacean) instead of a long-lived MCP
transport.

## Install

```bash
# published to npm:
npm i -g @protolabsai/rabbit-hole-cli
rh --help
```

The build is a self-contained single file (deps are bundled), so an agent
image can also just drop in the binary — no `node_modules` alongside it:

```dockerfile
COPY --from=cli-build /app/packages/cli/dist/index.js /opt/rh/rh.mjs
RUN ln -s /opt/rh/rh.mjs /usr/local/bin/rh && chmod +x /opt/rh/rh.mjs
```

## Commands

```
rh search  "<query>"  [--text] [-m 5]
rh recall  "<query>"  [--text] [-k 8]
rh research "<topic>" [-d 2] [--max-results 4]
rh ingest  <path|url> [-m <mime-type>] [--wait]
rh status  <job-id>   [--wait] [--result]
```

All commands emit JSON by default (for agent consumption); pass `--text` (where
available) for a human-readable markdown view. Log lines go to stderr so JSON /
reports on stdout pipe cleanly.

- **`rh search`** — web search. Prefers our in-house **SearXNG**
  (`RH_SEARXNG_ENDPOINT`); falls back to **Tavily** when SearXNG is unset /
  unreachable and a Tavily key is present.
- **`rh recall`** — vector search over your ingested files (the pgvector
  `corpus_chunks` corpus, qwen3 1024-dim embeddings). Embeds the query via the
  gateway and returns the top-`k` cosine matches. Hits
  `GET {job_processor_url}/search`.
- **`rh research`** — a 3-stage loop: the LLM plans `--depth` sub-queries, each
  is searched (SearXNG/Tavily), then the LLM synthesizes a markdown report with
  inline `[n]` citations.
- **`rh ingest`** — `POST {job_processor_url}/ingest`. Local files are read +
  uploaded; URLs are fetched server-side. Returns `{ jobId, sidequestId,
  queue }` where `jobId` is the caller-tracked id. With `--wait`, polls
  `GET /ingest/:id/status` every 2s until a terminal state (`completed` /
  `failed`), then exits non-zero on failure.
- **`rh status`** — `GET {job_processor_url}/ingest/:id/status`. With `--wait`,
  polls until terminal; with `--result`, also fetches
  `GET /ingest/:id/result` (the stored extraction) when `status=completed`.

## Config

Sources, in priority order:

1. CLI flags
2. Env vars (`RH_*` prefix preferred, generic fallbacks recognized)
3. `~/.config/rh/config.yaml`
4. Defaults

### Env vars

| Var | Default | Purpose |
| --- | --- | --- |
| `RH_JOB_PROCESSOR_URL` | `http://job-processor:8680` | `ingest` / `status` / `recall` target |
| `RH_SEARXNG_ENDPOINT` (or `SEARXNG_ENDPOINT`) | `http://searxng:8080` | in-house web search (preferred) |
| `RH_TAVILY_API_KEY` (or `TAVILY_API_KEY`) | _optional_ | Tavily fallback when SearXNG is unavailable |
| `RH_LLM_BASE_URL` (or `OPENAI_BASE_URL`) | `http://gateway:4000/v1` | OpenAI-compatible endpoint |
| `RH_LLM_KEY` (or `OPENAI_API_KEY`) | _required for recall/research_ | gateway / OpenAI key |
| `RH_LLM_MODEL` | `protolabs/smart` | model for research synthesis |
| `RH_CONFIG_PATH` | `~/.config/rh/config.yaml` | override config file location |

### Config file format

```yaml
# ~/.config/rh/config.yaml
job_processor_url: http://job-processor:8680
searxng_endpoint: http://searxng:8080
tavily_api_key: tvly-xxx          # optional fallback
llm_base_url: http://gateway:4000/v1
llm_key: sk-…
llm_model: protolabs/smart
```

## Defaults assume docker-network deployment

The baked-in defaults (`http://job-processor:8680`, `http://searxng:8080`,
`http://gateway:4000/v1`) resolve inside the `ai_default` Docker network where
the job-processor, SearXNG, and LiteLLM gateway are reachable by service
hostname. From outside the network, override the URLs via env or the config
file.
