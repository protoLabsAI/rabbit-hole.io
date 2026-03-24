# Handoff: Streaming Chat UI Stack

**Date**: 2026-03-24
**Handoff Number**: 002

---

## Overview/Summary

Complete streaming chat UI stack built for the rabbit-hole.io search engine, ready to be adopted by the protoLabs Ava chat interface. Replaces react-markdown with streamdown for flicker-free streaming, adds inline citations, collapsible sources, reasoning blocks, structured related searches, and 4-state tool badges.

## Background/Context

- The search engine at `/` uses AI SDK v6 `streamText` with `useChat` on the frontend
- The LLM streams tokens incrementally — the markdown renderer must handle partial/unterminated markdown without flicker
- `react-markdown` re-renders the entire DOM on every token, causing visible flicker and layout shifts
- shadcn chatbot kit research confirmed `streamdown` as the best drop-in replacement for streaming contexts
- All changes are in `apps/rabbit-hole/app/components/search/` and are framework-agnostic React components

## The Stack

### 1. Streamdown (core renderer)

**Package**: `streamdown` (npm)
**File**: `apps/rabbit-hole/app/components/search/ChatMarkdown.tsx`

Drop-in replacement for react-markdown with the same `components` API. Key differences:

```tsx
import { Streamdown } from "streamdown";
import "streamdown/styles.css";

<Streamdown
  components={components}          // same API as react-markdown
  mode={isStreaming ? "streaming" : "static"}
  isAnimating={isStreaming}
  animated={
    isStreaming
      ? { animation: "fadeIn", sep: "word", duration: 80, stagger: 20 }
      : false
  }
  caret={isStreaming ? "block" : undefined}
>
  {content}
</Streamdown>
```

**Why it's better**:
- Handles unterminated markdown mid-stream (`**This is bol` renders correctly)
- Word-by-word fade-in animation during streaming (not character-by-character)
- Block caret shows exactly where generation is happening
- `mode="static"` for completed messages — instant render, no animation
- No DOM thrashing — only appends new content instead of re-rendering everything

**Migration from react-markdown**: The `components` prop API is identical. Custom renderers for links, code blocks, tables, etc. all work unchanged. Just swap the import and add the streaming props.

### 2. Inline Citations

**File**: `apps/rabbit-hole/app/components/search/ChatMarkdown.tsx` (CitationBadge component)

When the LLM outputs `[1]`, `[2]` etc. in its response and sources are available:

1. **Preprocessing**: Regex converts `[N]` to `[#cite-N]` markdown links
2. **Custom `a` renderer**: Intercepts `#cite-` hrefs, renders `CitationBadge` instead of a link
3. **CitationBadge**: Numbered superscript pill (`bg-primary/10 text-primary rounded-full`) with hover tooltip showing favicon, title, domain, snippet

```tsx
// Pass sources to enable citations
<ChatMarkdown
  content={text}
  isStreaming={isStreaming}
  sources={sources}  // Array<{ title, url, type, snippet? }>
/>
```

Without `sources`, citation numbers render as plain text (graceful degradation).

### 3. Collapsible Sources Summary

**File**: `apps/rabbit-hole/app/components/search/ChatMessage.tsx` (SourcesSummary component)

"Used N sources" button that expands to show source list with favicons:

```tsx
<SourcesSummary sources={sources} />
```

- Collapsed by default — shows "Used 4 sources" with book icon
- Expands to list with Google favicon API icons, title, domain
- Each source is a clickable link opening in new tab

### 4. Structured Related Searches

**System prompt** requests a `<RELATED_SEARCHES>` block:
```
<RELATED_SEARCHES>
first search phrase
second search phrase
third search phrase
</RELATED_SEARCHES>
```

**Client-side**:
- `stripRelatedSearches()` — removes the block from markdown (including partial blocks during streaming)
- `extractSuggestions()` — parses the block into string array
- `SuggestionPills` — horizontal-scroll clickable buttons with search icon

```tsx
<SuggestionPills
  suggestions={extractSuggestions(textContent)}
  onSelect={(query) => handleFollowUp(query)}
/>
```

The pills use `overflow-x-auto scrollbar-none` for horizontal scroll (better than flex-wrap on mobile).

### 5. ReasoningBlock (Extended Thinking)

**File**: `apps/rabbit-hole/app/components/search/ReasoningBlock.tsx`

Collapsible "Thinking..." card for models with extended thinking:

```tsx
<ReasoningBlock
  content={reasoningText}
  isStreaming={isThinking}
  duration={thinkingDurationSeconds}
/>
```

- Auto-expands when `isStreaming` is true
- Shows shimmer gradient animation on "Thinking..." text while streaming
- Auto-collapses when streaming ends
- Shows "Thought for 3.2s" duration badge when complete
- Expandable with chevron click
- Content rendered via ChatMarkdown

**CSS** (in `globals.css`):
```css
@keyframes reasoning-shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
.reasoning-shimmer {
  background: linear-gradient(90deg, currentColor 25%, rgba(255,255,255,0.5) 50%, currentColor 75%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: reasoning-shimmer 2s linear infinite;
}
```

### 6. 4-State Tool Badges

**File**: `apps/rabbit-hole/app/components/search/ChatMessage.tsx` (ToolCallCard)

Tool cards show status with color-coded pills:

| State | Label | Color |
|-------|-------|-------|
| `partial-call` / `input-streaming` | streaming | `text-blue-400 bg-blue-400/10` |
| `call` / `input-available` | running | `text-primary bg-primary/10` |
| `result` / `output-available` | done | `text-green-500 bg-green-500/10` |
| `error` | error | `text-destructive bg-destructive/10` |

Maps directly to AI SDK v6's tool invocation states.

## Key Files

| File | Purpose |
|------|---------|
| `apps/rabbit-hole/app/components/search/ChatMarkdown.tsx` | Streamdown markdown renderer with citations |
| `apps/rabbit-hole/app/components/search/ChatMessage.tsx` | Message renderer with tools, sources, suggestions, actions |
| `apps/rabbit-hole/app/components/search/ReasoningBlock.tsx` | Collapsible thinking indicator |
| `apps/rabbit-hole/app/components/search/CodeBlock.tsx` | Syntax-highlighted code blocks |
| `apps/rabbit-hole/app/globals.css` | Reasoning shimmer animation |

## Adoption Guide for Ava Chat

To bring this into the Ava chat interface:

1. **Install streamdown**: `pnpm add streamdown` in the target app
2. **Copy ChatMarkdown.tsx** — it's self-contained (depends only on `streamdown`, `CodeBlock`, and `Icon`)
3. **Copy ReasoningBlock.tsx** — depends on `ChatMarkdown` and `Icon`
4. **Copy the CSS** — the `reasoning-shimmer` keyframes from `globals.css`
5. **Wire into your message renderer**:
   - Pass `isStreaming` and `sources` to ChatMarkdown
   - Use `stripRelatedSearches()` and `extractSuggestions()` for suggestion pills
   - Add SourcesSummary for collapsible source lists
   - Add ReasoningBlock for extended thinking models
6. **System prompt**: Add the `<RELATED_SEARCHES>` block instruction if you want structured follow-up suggestions

## Typography (PROSE_CLASSES)

Both basic search and deep research use identical prose:
```
prose dark:prose-invert max-w-none antialiased tracking-[-0.003em]
prose-p:leading-[1.6] prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
```

This is tuned for readability — matches Medium's letter-spacing and line-height.

## Open Questions

- **Shiki integration**: streamdown supports async Shiki highlighting for code blocks (dual light/dark theme at build time). Currently using basic CodeBlock — Shiki would be a nice upgrade.
- **Message branching**: shadcn chatbot kit has a "1 of 3" version navigator for regenerated responses. Not implemented yet.
- **Scroll management**: Currently manual `scrollIntoView`. shadcn uses `use-stick-to-bottom` library for smoother auto-scroll with manual override.
