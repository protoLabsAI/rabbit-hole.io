# Playground Hub

Master component providing unified access to all playground components with dynamic loading and memory management.

## Features

- **Unified Access**: Single entry point for all playgrounds
- **Dynamic Loading**: Only loads active playground
- **Memory Efficient**: Automatic cleanup when switching (~50-120KB per playground)
- **Categorized Navigation**: Organized by service type
- **Search & Filter**: Find playgrounds quickly
- **EntityPalette-Inspired UI**: Side navigation with category grouping

## Usage

### In Storybook

```bash
pnpm storybook
# Navigate to: Tools > Playground Hub
```

### In Application

```tsx
import { PlaygroundHub } from "@/components/playground-hub";

// Default - empty state
<PlaygroundHub />

// With default playground loaded
<PlaygroundHub defaultPlaygroundId="wikipedia" />
```

## Current Playgrounds

| ID              | Name              | Category         | Tags                         |
| --------------- | ----------------- | ---------------- | ---------------------------- |
| `wikipedia`     | Wikipedia         | Research Tools   | api, search, knowledge       |
| `langextract`   | LangExtract       | Data Extraction  | ai, extraction, gemini       |
| `youtube`       | YouTube Processor | Media Processing | video, youtube, ffmpeg       |
| `transcription` | Transcription     | Media Processing | audio, whisper, groq, openai |

## Adding New Playgrounds

1. Create playground component following [playground patterns](../../../docs/developer/patterns/PLAYGROUND_PATTERNS.md)

2. Add to registry in `registry/playground-registry.ts`:

```typescript
{
  id: "my-service",
  name: "My Service",
  description: "Description here",
  category: "utilities",
  icon: "🛠️",
  importFn: () =>
    import("@/components/my-service-playground").then((m) => ({
      default: m.MyServicePlayground,
    })),
  status: "active",
  tags: ["service", "api"],
  estimatedSize: 50, // KB
}
```

3. Playground automatically appears in hub - no other changes needed!

## Categories

- **AI Services** (🤖): AI-powered APIs and language models
- **Media Processing** (🎬): Audio and video processing tools
- **Data Extraction** (📊): Text extraction and structured data
- **Research Tools** (🔬): Research and knowledge discovery
- **Utilities** (🛠️): General-purpose utilities

## Memory Management

- Only ONE playground loaded at a time
- Previous playground unmounted before loading new one
- React automatically garbage collects unused components
- Each playground is code-split into separate chunk
- Average memory footprint: 50-120KB per playground

## Architecture

```
PlaygroundHub
├── Side Navigation (64px width)
│   ├── Search bar
│   ├── Category groups
│   │   └── Playground list
│   └── Stats footer
└── Content Area
    ├── Loading state
    ├── Error state
    ├── Empty state
    └── Active playground (Suspense wrapped)
```

## Testing

### Manual Testing

1. Start Storybook: `pnpm storybook`
2. Navigate to "Tools > Playground Hub"
3. Test all 4 playgrounds load correctly
4. Verify search functionality
5. Test category expand/collapse

### Memory Testing

1. Open Chrome DevTools → Memory
2. Take heap snapshot ("Before")
3. Switch playgrounds 10 times
4. Take heap snapshot ("After")
5. Compare - should be < 100MB difference

## Dynamic Loading Flow

```
User clicks playground
    ↓
Registry lookup (metadata only)
    ↓
Unload current playground
    ↓
Wait 100ms for React cleanup
    ↓
Dynamic import (code splitting)
    ↓
Render new playground
```

## Props

### PlaygroundHubProps

```typescript
interface PlaygroundHubProps {
  /**
   * Initial playground to load on mount
   */
  defaultPlaygroundId?: string;

  /**
   * Optional CSS class
   */
  className?: string;
}
```

## Related Files

### Core Files

- `PlaygroundHub.tsx` - Main component
- `registry/playground-registry.ts` - Playground definitions
- `hooks/usePlaygroundLoader.ts` - Dynamic loading logic

### Documentation

- **Architecture**: [Playground Master Component Plan](../../../handoffs/2025-10-18_PLAYGROUND_MASTER_COMPONENT_PLAN.md)
- **Component Patterns**: [Playground Architecture](../../../handoffs/2025-10-18_PLAYGROUND_COMPONENT_ARCHITECTURE_HANDOFF.md)
- **Quick Start**: [Playground Quick Start](../../../docs/developer/PLAYGROUND_QUICK_START.md)
- **Patterns**: [Playground Patterns](../../../docs/developer/patterns/PLAYGROUND_PATTERNS.md)

## Troubleshooting

### Issue: Playground not loading

**Solution**: Check browser console for import errors. Verify playground component exists and exports correctly.

### Issue: Memory grows continuously

**Solution**: Check Chrome DevTools Memory tab. Ensure previous playgrounds are unmounting. Look for memory leaks in playground components themselves.

### Issue: Search not working

**Solution**: Verify playground has proper tags defined in registry. Search looks at name, description, and tags.

### Issue: Category empty after search

**Solution**: This is expected - categories with no matching playgrounds are hidden during search.

## Performance

- Initial bundle: ~2KB (registry only, no playground code)
- Per-playground chunk: 50-120KB
- Load time: <500ms after initial chunk download
- Memory overhead: Minimal (one playground at a time)

## Future Enhancements

- [ ] Favorites system
- [ ] Recent playgrounds
- [ ] Keyboard shortcuts (Cmd+K quick switcher)
- [ ] URL state persistence (`?playground=wikipedia`)
- [ ] Usage analytics
- [ ] Real-time health monitoring
- [ ] Mobile responsive sidebar

## Support

For issues or questions, see:

- [Playground patterns documentation](../../../docs/developer/patterns/PLAYGROUND_PATTERNS.md)
- [Hub Summary](../../../docs/developer/PLAYGROUND_HUB_SUMMARY.md)
