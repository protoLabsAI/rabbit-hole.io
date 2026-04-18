# Use Deep Research Modes

Deep research can be tuned based on how thorough you need the output to be. The pipeline always runs the same four phases (SCOPE → RESEARCH → EVALUATE → SYNTHESIS), but the scope and depth vary.

## Standard mode (default)

The default mode decomposes a topic into 3–6 dimensions and runs 1–2 evaluation iterations.

- **When to use**: Most research questions — technical topics, comparisons, surveys
- **Time**: 2–5 minutes depending on topic breadth
- **Sources per dimension**: Up to 8 (primary web + secondary social/IT search)

## Quick mode

Restricts to 2–3 dimensions with no gap-filling iteration.

- **When to use**: You need a fast overview, or the topic is narrow
- **Time**: Under 2 minutes
- **Sources per dimension**: Up to 5 (primary web only)

To request a focused result, phrase your query narrowly:
```
quick overview of WebAssembly in the browser
```

## Comprehensive mode

Generates 5–8 dimensions and runs up to 3 evaluation iterations. Secondary searches use multiple category combinations.

- **When to use**: Deep dives, literature surveys, architecture decisions
- **Time**: 8–15 minutes
- **Sources per dimension**: Up to 12 (primary + secondary + pagination)

To trigger deeper research, phrase your query broadly with explicit scope:
```
comprehensive analysis of distributed tracing approaches for microservices at scale
```

## Controlling iteration depth

The gap-filling loop runs up to 3 times. If the LLM evaluator finds gaps after each round, it spawns new sub-dimensions.

You can see how many iterations ran in the activity feed:
```
Evaluation: 1 gap found. Starting iteration 2...
Evaluation: no gaps. Proceeding to synthesis.
```

## Cancelling a running job

Click **Cancel** in the research UI, or send:

```
DELETE /api/research/deep/:id
```

The job stops cleanly after the current dimension completes. Already-gathered sources are preserved.

## Downloading results

Click **Download** (top right) to export as Markdown. The export includes:

- Full report text with inline citation markers
- Numbered source list at the bottom
- Research metadata (topic, duration, source count)

## Related

- [Deep Research API](../reference/deep-research-api) — programmatic control of research jobs
- [Deep research pipeline](../explanation/deep-research-pipeline) — how each phase works internally
