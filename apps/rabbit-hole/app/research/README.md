# Research Mode - AI-Powered Knowledge Graph Builder

**Interactive research environment for exploring entities and building custom knowledge graphs.**

---

## Overview

Research Mode provides an isolated sandbox for AI-powered entity exploration, relationship discovery, and knowledge graph construction. Load entities from Atlas, query with AI, and build custom graphs without modifying the main database.

### Key Features

- 🔬 **Isolated Environment** - Build and experiment without affecting main database
- 🤖 **AI-Powered Research** - Natural language queries for entity/relationship discovery
- 🧠 **Smart Context Loading** - System loads extra data for AI visibility (hops+1 strategy)
- 🔗 **Real-time Visualization** - Live graph updates as you add entities/relationships
- 💾 **Save & Export** - Export to JSON or merge to Neo4j database
- 🔄 **URL State Management** - Shareable research sessions via URL
- 🎯 **Atlas Integration** - Load entities directly from Atlas with right-click

### When to Use Research Mode

**Use Research Mode when:**

- Exploring "what if" scenarios without affecting production data
- Building custom knowledge graphs for specific research questions
- Need AI assistance to discover connections and patterns
- Want to experiment with entity relationships before committing
- Collaborating on graph construction (via shareable URLs)

**Use Atlas when:**

- Viewing the complete knowledge graph
- Need full graph navigation and filtering
- Analyzing communities and clusters
- Exploring time-based patterns
- Working with production data

---

## Getting Started

### Quick Start

**Fastest way to start:**

1. Navigate to Atlas page (`/atlas`)
2. Right-click any entity node → **"Open in Research Mode"**
3. Start researching!

**Or load directly via URL:**

```bash
# Default: Shows only center entity (loads 1-hop for AI context)
/research?entity=person:bernie_sanders

# With 1-hop visible
/research?entity=person:bernie_sanders&settings={"hops":1}

# With 2-hops visible
/research?entity=person:bernie_sanders&settings={"hops":2,"nodeLimit":100}
```

**Entity UID format:** `{domain}:{identifier}`

Examples: `person:bernie_sanders`, `organization:meta`, `platform:twitter`

---

## URL Parameters

Control research session via URL for shareability and persistence.

### Core Parameters

| Parameter        | Type    | Default   | Description            | Example                 |
| ---------------- | ------- | --------- | ---------------------- | ----------------------- |
| `entity`         | string  | null      | Entity UID to load     | `person:bernie_sanders` |
| `settings`       | JSON    | See below | Research configuration | See Settings Object     |
| `showLabels`     | boolean | `true`    | Node labels visible    | `true` or `false`       |
| `showEdgeLabels` | boolean | `true`    | Edge labels visible    | `true` or `false`       |
| `hiddenTypes`    | JSON    | `null`    | Hidden entity types    | `["Organization"]`      |

### Settings Object

```json
{
  "hops": 0, // Ego network depth to DISPLAY (0-3, default 0 = center entity only)
  "nodeLimit": 50, // Max nodes to load (10-100)
  "sentiments": null, // Filter by sentiment (future)
  "entityTypes": null // Filter by entity type (future)
}
```

**🧠 Important: Hops+1 Loading Strategy**

System automatically loads **one extra hop** beyond what you see for AI agent context:

| You See                        | AI Agent Sees         | Why This Matters                                                                                 |
| ------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------ |
| Center entity only (`hops: 0`) | + all 1-hop neighbors | AI knows immediate connections and can suggest "Bernie Sanders is connected to Medicare for All" |
| 1-hop network (`hops: 1`)      | + all 2-hop neighbors | AI sees "friends of friends" and can suggest deeper paths                                        |
| 2-hop network (`hops: 2`)      | + all 3-hop neighbors | AI has wide context for complex relationship discovery                                           |

**Benefits:**

- ✅ Clean, focused visualization for you
- ✅ Rich context for AI to make intelligent suggestions
- ✅ Discover connections without visual overload
- ✅ Incrementally expand your view as needed

**Example:** Load Bernie Sanders with `hops: 0`:

- **You see:** Just Bernie Sanders node
- **AI knows about:** Twitter, Medicare for All, AOC, Democratic Party, Senate (all 1-hop connections)
- **AI can suggest:** "I notice Bernie is connected to Medicare for All. Want to explore that?"

### Example URLs

**Basic entity load:**

```
/research?entity=person:bernie_sanders
```

**With custom settings:**

```
/research?entity=person:bernie_sanders&settings={"hops":2,"nodeLimit":100}
```

**Hide edge labels:**

```
/research?entity=person:bernie_sanders&showEdgeLabels=false
```

**Hide specific entity types:**

```
/research?entity=person:bernie_sanders&hiddenTypes=["Organization","Platform"]
```

**Entity type filtering:**

```
/research?entity=person:bernie_sanders&settings={"entityTypes":["Person","Organization"]}
```

**Sentiment filtering:**

```
/research?entity=person:bernie_sanders&settings={"sentiments":["supportive","hostile"]}
```

**Time window filtering:**

```
/research?entity=person:bernie_sanders&timeWindow={"from":"2023-01-01","to":"2024-12-31"}
```

**Complete session with all filters:**

```
/research?entity=person:bernie_sanders&settings={"hops":2,"nodeLimit":75,"entityTypes":["Person","Organization"],"sentiments":["supportive"]}&showLabels=true&showEdgeLabels=false&timeWindow={"from":"2024-01-01","to":"2024-12-31"}
```

---

## Controls & Interactions

### Mouse Controls

**Single Node:**

- **Left Click** - Select node
- **Left Drag** - Move node
- **Double Click** - Expand/collapse entity details
- **Right Click** - Open context menu

**Multi-Node Selection:**

- **Shift + Click** - Add/remove node from selection
- **Shift + Drag Background** - Box select multiple nodes
- **Left Drag on Selected** - Move all selected nodes together

**Canvas Navigation:**

- **Left Drag Background** - Pan canvas (default)
- **Scroll Wheel** - Zoom in/out
- **Pinch Gesture** - Zoom (touchpad)

**Creating Relationships (Node to Node):**

- **Drag from Node Handle** - Drag from bottom handle to top handle of target node
- **Release on Target Node** - Popover appears to select relationship type
- **Select Type** - Choose from valid types for those entity domains
- **Confirm** - Edge created with selected type

**Creating Entity + Relationship (Edge Drop):**

- **Drag from Node Handle** - Drag from bottom handle
- **Release on Background** - Entity type selector appears at drop position
- **Select Entity Type** - New entity created with RELATED_TO edge
- **Edit Later** - Right-click edge to change relationship type

**Edges:**

- **Left Click** - Select relationship
- **Right Click** - Edit or delete relationship

**Background:**

- **Left Click** - Deselect all
- **Right Click** - Add entity, export, reset options

### Keyboard Shortcuts

| Key                    | Action                                |
| ---------------------- | ------------------------------------- |
| `Delete` / `Backspace` | Delete selected node(s)               |
| `Shift + Click`        | Multi-select nodes (add to selection) |
| `Shift + Drag`         | Temporary selection box (hotkey)      |
| `Esc`                  | Deselect all                          |

### Contextual Zoom

**Node Display Adapts to Zoom Level:**

- **Far Zoom (< 0.5x)** - Skeleton placeholders (performance optimization)
- **Normal Zoom (0.5x - 1.0x)** - Minimal cards with icon + name
- **Close Zoom (> 1.0x)** - Full details when manually expanded
- **Edge labels hidden** - Below 0.5x zoom for clarity

### Graph Visualization (Right Panel - 67%)

**Node Interactions:**

- **Single Click** - Select node, show details card
- **Double Click** - Open edit form
- **Right-Click** - Context menu (details, edit, delete, create relationship)

**Edge Interactions:**

- **Click** - Show relationship details
- **Right-Click** - Edit or delete relationship

**Background:**

- **Click** - Deselect all
- **Right-Click** - Add entity, session management, export options

### AI Chat Interface (Left Panel - 33%)

**Research Commands:**

```bash
# Entity Discovery
"Research connections between Bernie Sanders and Medicare"
"Find organizations linked to climate policy"
"Who are the key people in the progressive movement?"

# Relationship Analysis
"What relationships exist between Bernie Sanders and AOC?"
"How is Twitter connected to political movements?"
"Show me hostile relationships in this network"

# Context-Aware (AI sees hidden entities)
"What other entities are nearby?" # AI knows about loaded hops+1 data
"Are there any connections I'm missing?" # Suggests from hidden context
"Should I expand this network?" # Recommends based on hidden neighbors
```

**AI Agent Capabilities:**

- ✅ **Sees hidden context** - Knows about entities beyond your view (hops+1)
- ✅ **Suggests expansions** - "There are 12 more connections to explore"
- ✅ **Discovers patterns** - Identifies relationship clusters and themes
- ✅ **Real-time updates** - Adds discovered entities/relationships to graph
- ✅ **Smart filtering** - Can focus on specific entity types or sentiments

### Context Menu Actions

**Node Menu:**

- Show Node Details
- Edit Node
- Delete Node
- Create Relationship
- Center on Node

**Background Menu:**

- Add Entity
- Save Session (IndexedDB)
- Load Session
- Export Bundle (JSON)
- Merge to Neo4j (permanent)
- Reset Graph

---

## Session Management

### Auto-Save (Local)

- Uses browser IndexedDB
- Persists across refreshes
- Multiple sessions supported

### Export Options

**1. JSON Bundle**

- Downloads research graph as `.json`
- Includes entities, relationships, evidence
- Use for sharing or backup

**2. Merge to Neo4j**

- Writes to main database
- **Permanent** - creates actual nodes/edges
- Skips duplicates (by UID)
- Requires confirmation

### Data Loss Prevention

System warns before:

- Loading new entity (clears current session)
- Resetting graph
- Navigating away

---

## Data Flow

```
Atlas → Research (Load)
  ↓
AI Chat → Discover Entities/Relationships
  ↓
In-Memory Graph (ResearchGraphDB)
  ↓
Real-time Visualization
  ↓
Export → JSON or Neo4j
```

### State Management

- **In-Memory:** ResearchGraphDB (entities, relationships, evidence)
- **URL State:** Entity UID, settings, UI preferences (nuqs)
- **Persistent:** IndexedDB for sessions, Neo4j for permanent data

---

## Current Limitations & Future UX

### Known Issues

1. ~~**No Settings UI**~~ ✅ **FIXED** - Settings panel with visual controls (gear icon in header)
2. ~~**Partial Filter UI**~~ ✅ **FIXED** - Complete filtering: sentiment, entity types (77+ organized by domain), visual controls, time window
3. **No Undo/Redo** - Manual recovery required
4. **No Multi-Select** - Select nodes one at a time
5. **No Graph Layout Controls** - Single "atlas" layout only

### Planned UX Improvements

**High Priority:**

- [x] ~~Settings panel with sliders (hops, nodeLimit)~~ **COMPLETE** ✅
- [x] ~~Filter controls (sentiments)~~ **COMPLETE** ✅
- [x] ~~Filter controls (entity types, time window)~~ **COMPLETE** ✅
- [x] ~~Visual controls (show labels, edge labels)~~ **COMPLETE** ✅
- [ ] Undo/redo stack
- [ ] Multi-select nodes (shift+click)
- [ ] Bulk operations (delete selected, export selected)

**Medium Priority:**

- [ ] Session selector UI (load from IndexedDB)
- [ ] Graph layout options (force, breadthfirst)
- [ ] Viewport persistence (zoom, pan)
- [ ] Mini-map navigation
- [ ] Node search/filter

**Low Priority:**

- [ ] Keyboard shortcuts
- [ ] Graph diff view (before/after)
- [ ] Collaborative sessions (real-time)
- [ ] Template graphs (starter packs)

---

## Architecture

### Component Structure

```
page.tsx                          - Main research page
├── ResearchChatInterface         - AI chat (left panel)
├── GraphVisualizerWrapper        - Real-time visualization
├── EntityForm                    - Create/edit entities (dialog)
├── RelationshipForm              - Create relationships (dialog)
└── ContextMenuRenderer           - Right-click menus

hooks/
└── useResearchPageState.ts       - URL state management (nuqs)

lib/
├── ResearchGraphDB.ts            - In-memory graph store
└── IndexedDBPersistence.ts       - Browser storage
```

### State Flow

1. **URL → Hook** - nuqs parses parameters
2. **Hook → Page** - Provides entity, settings, UI prefs
3. **Page → API** - Fetches entity + ego network
4. **API → ResearchGraphDB** - Adds to in-memory store
5. **ResearchGraphDB → Events** - Emits change events
6. **Events → Page** - Updates graph data
7. **Graph Data → Visualizer** - Renders Cytoscape graph

---

## API Integration

### Endpoints Used

**Entity Loading:**

```
GET /api/entity-v2/{uid}
→ Single entity details
```

**Ego Network:**

```
GET /api/graph-tiles/ego/{uid}?hops=1&nodeLimit=50
→ Multi-hop neighborhood
```

**Merge to Database:**

```
POST /api/research/merge
Body: { entities, relationships, sessionId, mergeStrategy }
→ Writes to Neo4j
```

---

## Developer Notes

### Adding New Filters

1. Update `ResearchSettings` interface in `useResearchPageState.ts`
2. Add validator in hook
3. Apply to API call in `page.tsx` (line ~197)
4. Create UI controls (future)

### Event System

ResearchGraphDB emits events:

- `entityAdded` / `entityUpdated` / `entityDeleted`
- `relationshipAdded` / `relationshipUpdated` / `relationshipDeleted`
- `evidenceAdded`
- `graphReset`
- `researchStateChanged`

Listen in page component to trigger re-renders.

### CopilotKit Integration

**Readable State:**

- Session metadata
- **Visible entities/relationships** - Currently displayed in graph
- Evidence arrays
- Research status
- **Context data** - Hidden entities loaded as context (hops+1)
  - `hiddenEntities` - Entities beyond displayed hops
  - `loadedHops` vs `displayedHops` - What's loaded vs visible
  - Gives AI agent awareness of nearby entities for better suggestions

**Actions:**

- `update_research_graph` - Add entities/relationships/evidence
- `update_research_progress` - Set research active/idle

**Hops+1 Strategy:**

System always loads one more hop than displayed to give AI context:

```typescript
// User sees: Center entity only
// AI sees: Center + all 1-hop neighbors (hidden)
displayHops: 0, loadedHops: 1

// User sees: 2-hop network
// AI sees: 2-hop network + all 3-hop neighbors (hidden)
displayHops: 2, loadedHops: 3
```

This allows AI to suggest "nearby" entities without cluttering the visualization.

---

## Testing

### Manual Test Checklist

- [ ] Load entity from URL
- [ ] Load entity from Atlas right-click
- [ ] Refresh page - state persists
- [ ] Browser back/forward navigation
- [ ] URL sharing (new tab shows same state)
- [ ] Add entity via chat
- [ ] Add entity via context menu
- [ ] Create relationship
- [ ] Edit entity (double-click)
- [ ] Delete entity (context menu)
- [ ] Export JSON bundle
- [ ] Merge to Neo4j
- [ ] Reset graph
- [ ] Data loss confirmation on entity change

---

## Quick Reference

### Common URL Patterns

```bash
# Start fresh - just center entity
/research?entity=person:bernie_sanders

# Explore 1 hop
/research?entity=person:bernie_sanders&settings={"hops":1}

# Deep dive - 2 hops with more nodes
/research?entity=person:bernie_sanders&settings={"hops":2,"nodeLimit":100}

# Hide labels for cleaner view
/research?entity=person:bernie_sanders&showLabels=false

# Show edge labels for relationship details
/research?entity=person:bernie_sanders&showEdgeLabels=true

# Filter by entity types (people and organizations only)
/research?entity=person:bernie_sanders&settings={"entityTypes":["Person","Organization"]}

# Filter by sentiment (supportive relationships only)
/research?entity=person:bernie_sanders&settings={"sentiments":["supportive"]}

# Filter by time window (2024 events only)
/research?entity=person:bernie_sanders&timeWindow={"from":"2024-01-01","to":"2024-12-31"}
```

### Performance Tips

**For best performance:**

1. **Start with `hops: 0`** - See center entity, then expand incrementally
2. **Use `nodeLimit` wisely** - Start with 50, increase to 100 only if needed
3. **Hide edge labels on dense graphs** - Set `showEdgeLabels=false`
4. **Clear unused sessions** - Export/merge and reset graph regularly

**Large graph handling:**

```bash
# Dense network? Keep it focused
/research?entity=person:obama&settings={"hops":1,"nodeLimit":30}&showEdgeLabels=false

# Sparse network? Load more
/research?entity=niche:topic&settings={"hops":2,"nodeLimit":100}
```

---

## Troubleshooting

### Edge Labels Not Showing

**Solution:** Add to URL:

```
?showEdgeLabels=true
```

Default is `true` but may be overridden by visualization logic for performance.

### Entity Won't Load

**Check:**

1. Valid UID format: `{domain}:{identifier}`
2. Entity exists in database
3. Network tab for API errors
4. Console for detailed error logs

### Database Connection Error

**Symptom:** Page stuck on loading, then shows "Database connection failed"

**Cause:** Neo4j database not running or not accessible

**Solution:**

1. Check Neo4j is running: `docker ps` or check Neo4j Desktop
2. Verify connection in `.env.local`:
   ```
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=your_password
   ```
3. Test connection: `docker exec -it neo4j cypher-shell`
4. Restart database if needed

**Technical:** API routes now include early health checks (returns 503 immediately instead of hanging)

### Graph Not Updating

**Check:**

1. Browser console for errors
2. ResearchGraphDB event listeners attached
3. `graphData` state updating (React DevTools)

### AI Agent Not Responding

**Check:**

1. CopilotKit connection: Open browser DevTools → Network tab
2. Look for `/api/copilotkit` requests
3. Verify agent configuration in layout.tsx
4. Check console for CopilotKit errors

**Common issues:**

- Rate limiting on API key
- Network connectivity
- Agent service not running

### Hops Not Filtering Correctly

**Known Issue:** Currently all loaded entities are displayed (hop filtering not yet implemented).

**Temporary behavior:** Setting `hops: 0` still loads 1-hop but displays all nodes.

**Coming soon:** Proper hop distance filtering when API returns `hopDistance` metadata.

---

## Migration Notes

**2025-10-01:** Migrated from in-memory state to nuqs URL state management.

**Breaking Changes:**

- None - URL parameters are additive

**Benefits:**

- Shareable research sessions
- Browser history navigation
- State persistence on refresh

**Reference:** `handoffs/research-page-nuqs-migration.md`

---

## Contributing UX Improvements

### Before Making Changes

1. Test existing functionality (checklist above)
2. Check for linter errors
3. Verify URL state persists

### When Adding Features

1. Update this README with new interactions
2. Add to "Planned UX Improvements" if incomplete
3. Update URL Parameters section if new params added
4. Test browser back/forward navigation

### Documentation Pattern

```markdown
### New Feature Name

**What it does:**
[Brief description]

**How to use:**
[Step-by-step instructions]

**URL Parameters:**
| Parameter | Type | Default | Example |
```

---

---

## FAQ

**Q: Why doesn't changing hops filter the display?**
A: Hop distance filtering requires API metadata (coming soon). Currently loads hops+1 but displays all.

**Q: What's the difference between Research Mode and Atlas?**
A: Research is isolated (temporary), Atlas is production (permanent). Use Research for exploration, Atlas for navigation.

**Q: Can I lose my research session?**
A: Yes, unless you export or merge. Use "Save Session" (IndexedDB) or "Export Bundle" (JSON) for backups.

**Q: How does the AI agent see hidden context?**
A: System loads `hops+1` data. AI sees all loaded entities (even hidden ones) via `useCopilotReadable` context.

**Q: Why start with hops=0 by default?**
A: Cleaner initial view. You can incrementally expand. AI still sees 1-hop context for suggestions.

**Q: How do I merge research to production database?**
A: Right-click background → "Merge to Neo4j". This writes to main database (permanent, irreversible).

---

## Related Documentation

**Architecture:**

- `REACT_FLOW_DATA_FLOW.md` - Complete data flow sequence diagram
- `STATE_MANAGEMENT.md` - Yjs state management patterns
- `WORKSPACE_MIGRATION.md` - Migration from IndexedDB to Yjs

**Technical Guides:**

- `components/workspace/canvas/TAB_DUPLICATION_FIX.md` - Preventing tab duplication
- `components/workspace/canvas/TAB_SWITCHING_FIX.md` - Leaflet cleanup patterns
- `components/workspace/canvas/MAP_CANVAS_README.md` - Geographic visualization

**Code References:**

- `hooks/useWorkspace.ts` - Workspace state and Yjs sync
- `hooks/useYjsUndo.ts` - Undo/redo implementation
- `lib/bundle-importer.ts` - Import graph data
- `lib/bundle-exporter.ts` - Export graph data

---

**Last Updated:** 2025-10-06  
**Status:** Production - Yjs workspace mode active  
**Maintainer:** See project README
