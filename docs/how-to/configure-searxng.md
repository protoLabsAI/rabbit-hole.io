# Configure SearXNG

SearXNG is the web search backbone of Rabbit Hole. This guide covers enabling engines, tuning timeouts, and adjusting weights.

## Configuration file location

```
config/searxng/settings.yml
```

Changes require a SearXNG restart to take effect:

```bash
docker restart searxng
# or, if using docker compose:
docker compose restart searxng
```

## Enabling engines

Engines are disabled by default if SearXNG ships with them off. To enable:

```yaml
engines:
  - name: brave
    engine: brave
    shortcut: br
    disabled: false

  - name: reddit
    engine: reddit
    shortcut: re
    disabled: false

  - name: github
    engine: github
    shortcut: gh
    disabled: false

  - name: stackoverflow
    engine: stackoverflow
    shortcut: so
    disabled: false

  - name: arxiv
    engine: arxiv
    shortcut: arxiv
    disabled: false

  - name: semantic scholar
    engine: semantic_scholar
    shortcut: se
    disabled: false
```

## Engine categories

Each engine belongs to one or more categories. Categories determine which engines fire for a given `searchWeb` call:

| Engine | Category |
|--------|----------|
| google, bing, brave, ddg | general |
| reddit, hackernews | social media |
| github, stackoverflow, archlinux wiki | it |
| arxiv, semantic scholar, pubmed | science |
| newsblur, google news | news |
| wikipedia, wikidata | general |

## Adjusting result weights

SearXNG uses Reciprocal Rank Fusion (RRF): `score += weight / position`. Increase a weight to surface that engine's results higher.

```yaml
engines:
  - name: google
    weight: 1.2

  - name: wikipedia
    weight: 1.5

  - name: wikidata
    weight: 2.0
```

## Tuning timeouts

```yaml
outgoing:
  request_timeout: 4.0    # per-engine timeout (seconds)
  max_request_timeout: 8.0  # hard ceiling
```

Increase if fast engines are timing out. Decrease if you want fast responses and don't mind missing slow engines.

## Enabling pagination

```yaml
engines:
  - name: brave
    engine: brave
    max_page: 5  # allow up to page 5
```

Rabbit Hole sends `pageno=2` on second-iteration gap-fill passes to fetch genuinely new results. Without `max_page`, SearXNG returns page 1 for any page request.

## Language and locale

```yaml
search:
  default_lang: en
  languages:
    - en
```

Rabbit Hole sends `language=en` with every request. Set this to match.

## Suspended times (error recovery)

When an engine returns errors, SearXNG suspends it temporarily. Tune the backoff:

```yaml
engines:
  - name: google
    suspended_times:
      SearxEngineResponseException: [0, 0, 0, 0, 0]
      SearxEngineCaptchaException: [86400, 172800]
      SearxEngineAPIException: [0, 0, 0, 0, 0]
```

Setting most values to `0` means the engine retries immediately — useful during development.

## Removing low-quality engines

Remove or disable engines that return noisy results:

```yaml
engines:
  - name: baidu
    disabled: true

  - name: yandex
    disabled: true
```

## Testing your configuration

After restarting SearXNG, verify engines are active:

```bash
curl "http://ava:8888/search?q=test&format=json&categories=general" | jq '.results[].engine' | sort | uniq
```

You should see your enabled engines in the output.

## Related

- [SearXNG configuration reference](../reference/searxng-config) — full settings reference
- [Search functions reference](../reference/search-functions) — how `searchWeb` calls SearXNG
