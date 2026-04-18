# SearXNG Configuration Reference

Complete reference for `config/searxng/settings.yml`. Changes require a SearXNG restart.

## Top-level keys

```yaml
general:
  debug: false
  instance_name: "rabbit-hole-searxng"

search:
  safe_search: 0           # 0=off, 1=moderate, 2=strict
  autocomplete: ""         # disable autocomplete backend
  default_lang: en
  languages:
    - en
  max_page: 5              # allow pagination up to page 5
  formats:
    - html
    - json                 # REQUIRED — Rabbit Hole uses JSON format

outgoing:
  request_timeout: 4.0    # seconds per engine request
  max_request_timeout: 8.0
  pool_connections: 100
  pool_maxsize: 20
  enable_http2: true

server:
  secret_key: "your-secret-key"
  bind_address: "0.0.0.0:8080"
  base_url: false
  limiter: false           # disable rate limiting for local use
  public_instance: false

ui:
  static_use_hash: false
  default_locale: en
  query_in_title: false
  infinite_scroll: false
```

## Engine configuration

Each engine entry:

```yaml
engines:
  - name: <display name>
    engine: <engine module>
    shortcut: <2-3 letter code>
    categories: <category list>    # optional override
    disabled: false                # false = enabled
    weight: 1.0                    # RRF weight (default 1.0)
    timeout: 3.0                   # per-engine timeout override
    max_page: 5                    # max pagination depth

    # Error backoff (seconds). List = successive failures.
    suspended_times:
      SearxEngineResponseException: [0, 0, 0]
      SearxEngineCaptchaException: [86400]
      SearxEngineAPIException: [0, 0, 0]
```

## Recommended enabled engines

### General category

| Engine | Module | Notes |
|--------|--------|-------|
| google | `google` | Weight 1.2 — highest quality |
| bing | `bing` | Good coverage |
| brave | `brave` | Privacy-focused, good results |
| duckduckgo | `duckduckgo` | Fast |
| wikipedia | `wikipedia` | Weight 1.5 |
| wikidata | `wikidata` | Weight 2.0 — structured facts |

### Social media category

| Engine | Module | Notes |
|--------|--------|-------|
| reddit | `reddit` | Community discussions |
| hackernews | `hackernews` | Tech community opinions |

### IT category

| Engine | Module | Notes |
|--------|--------|-------|
| github | `github` | Code, repos, issues |
| stackoverflow | `stackoverflow` | Code Q&A |
| archlinux wiki | `archlinux_wiki` | System/config docs |

### Science category

| Engine | Module | Notes |
|--------|--------|-------|
| arxiv | `arxiv` | Preprints |
| semantic scholar | `semantic_scholar` | Academic papers |
| pubmed | `pubmed` | Biomedical literature |

## Engines to disable

These engines add noise or have poor result quality for technical queries:

```yaml
engines:
  - name: baidu
    disabled: true
  - name: yahoo
    disabled: true
  - name: yandex
    disabled: true
  - name: qwant
    disabled: true
  - name: seznam
    disabled: true
  - name: naver
    disabled: true
```

## SearXNG JSON API

Rabbit Hole calls SearXNG at:

```
GET {SEARXNG_ENDPOINT}/search
  ?q=<query>
  &format=json
  &language=en
  &categories=<category>   # or &engines=<engine1,engine2>
  &pageno=<1-5>
  &time_range=<day|week|month|year>
```

Response:

```typescript
{
  query: string;
  results: Array<{
    title: string;
    url: string;
    content: string;     // snippet
    engine: string;
    engines: string[];
    publishedDate?: string;
    score: number;       // RRF score
  }>;
  suggestions: string[];
  infoboxes: unknown[];
  number_of_results: number;
}
```

## Environment variable

```env
SEARXNG_ENDPOINT=http://ava:8888
```

Set in `apps/rabbit-hole/.env.local`. Used by `searchWeb` in `app/lib/search.ts`.
