# @protolabsai/rabbit-hole-cli

`rh` — Rabbit Hole CLI. Search the web, queue media to the processor, run
deep research. Designed to be shelled out to by fleet agents (protoMaker,
workstacean) instead of a long-lived MCP transport.

## Install

```bash
# from the monorepo, after `pnpm build`:
npm link --workspaces --include-workspace-root --workspace=@protolabsai/rabbit-hole-cli

# in an agent container's Dockerfile, copy the build:
COPY --from=cli-build /app/packages/cli/dist /opt/rh/dist
COPY --from=cli-build /app/packages/cli/node_modules /opt/rh/node_modules
RUN ln -s /opt/rh/dist/index.js /usr/local/bin/rh && chmod +x /opt/rh/dist/index.js
```

## Commands

```
rh search "<query>" [--text] [-m 5]
rh research "<topic>" [-d 2] [--max-results 4]
rh ingest <path|url> [-t paper|audio|url|…] [--wait]
rh status <job-id> [--wait]
```

`rh search` returns JSON by default (intended for agent consumption);
add `--text` for a markdown human view.

`rh research` runs a 3-stage loop: LLM plans 2–N sub-queries, Tavily
searches each, LLM synthesizes a markdown report with inline `[n]`
citations. Output is markdown on stdout. Log lines go to stderr so the
report can be piped into a file cleanly.

`rh ingest` POSTs to `{job_processor_url}/jobs/ingest`. Local files are
read + uploaded; URLs are passed through and fetched server-side. Returns
the job document. With `--wait`, polls every 2s until terminal state.

`rh status` GETs `{job_processor_url}/jobs/{id}`. With `--wait`, polls
until terminal state.

## Config

Sources, in priority order:

1. CLI flags
2. Env vars (`RH_*` prefix preferred, generic fallbacks recognized)
3. `~/.config/rh/config.yaml`
4. Defaults

### Env vars

| Var | Default | Purpose |
| --- | --- | --- |
| `RH_JOB_PROCESSOR_URL` | `http://job-processor:8680` | `ingest` / `status` target |
| `RH_TAVILY_API_KEY` (or `TAVILY_API_KEY`) | _required for search/research_ | Tavily auth |
| `RH_LLM_BASE_URL` (or `OPENAI_BASE_URL`) | `http://gateway:4000/v1` | OpenAI-compat endpoint |
| `RH_LLM_KEY` (or `OPENAI_API_KEY`) | _required for research_ | Gateway / OpenAI key |
| `RH_LLM_MODEL` | `protolabs/smart` | Model for the research loop |
| `RH_CONFIG_PATH` | `~/.config/rh/config.yaml` | Override config file location |

### Config file format

```yaml
# ~/.config/rh/config.yaml
job_processor_url: http://job-processor:8680
tavily_api_key: tvly-xxx
llm_base_url: http://gateway:4000/v1
llm_key: sk-…
llm_model: protolabs/fast
```

## Defaults assume docker-network deployment

The bake-in defaults (`http://job-processor:8680`, `http://gateway:4000/v1`)
work inside the `ai_default` Docker network on ava where the job-processor
and LiteLLM gateway resolve as service hostnames. From outside the network,
override the URLs via env or the config file.

<!-- re-review nudge: CI green, scope-creep + changeset resolved on this branch -->
