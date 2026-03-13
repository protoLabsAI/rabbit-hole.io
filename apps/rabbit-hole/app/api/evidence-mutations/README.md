# Evidence Graph Mutation API

REST API for performing CRUD operations on the partitioned evidence graph. Writes directly to JSON partition files with automatic manifest updates.

## Base URL

```
http://localhost:3000/api/evidence-mutations
```

## Endpoints

### Partition Structure

```
/api/evidence-mutations/{partition_type}/{category}
```

**Partition Types:**

- `entities` - Graph nodes (people, platforms, events, movements, media)
- `relationships` - Graph edges (connections between nodes)
- `evidence` - Source documentation

**Categories:**

- **Entities:** `person`, `platform`, `event`, `movement`, `media`
- **Relationships:** `funding`, `platforming`, `endorsement`, `media_platforming`, etc.
- **Evidence:** `government`, `major-media`, `investigative`, `broadcast-media`, `other`

---

## Operations

### 1. Add Evidence Source

Add a new evidence entry to support claims in the graph.

```bash
curl -X POST http://localhost:3000/api/evidence-mutations/evidence/major-media \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "add",
    "data": {
      "id": "ev_wapo_trump_2024",
      "title": "Trump makes false claims about election security",
      "date": "2024-01-15",
      "publisher": "Washington Post",
      "url": "https://washingtonpost.com/politics/2024/01/15/trump-election-claims",
      "type": "secondary",
      "notes": "Archive: https://archive.org/..."
    }
  }'
```

**Evidence Data Fields:**

- `id` (required) - Unique identifier with `ev_` prefix
- `title` (required) - Evidence title/headline
- `date` (required) - Publication date (YYYY-MM-DD)
- `publisher` (required) - Publishing organization
- `url` (required) - Source URL
- `type` (optional) - `primary`, `secondary`, or `analysis`
- `notes` (optional) - Additional context

---

### 2. Add Graph Node (Entity)

Add a new person, platform, event, movement, or media entity.

```bash
curl -X POST http://localhost:3000/api/evidence-mutations/entities/person \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "add",
    "data": {
      "id": "n_elon_musk",
      "label": "Elon Musk",
      "entityType": "person",
      "aka": ["@elonmusk", "Technoking"],
      "sources": ["ev_wapo_trump_2024", "ev_reuters_twitter_acquisition"],
      "position": {
        "x": 450,
        "y": 300
      }
    }
  }'
```

**Node Data Fields:**

- `id` (required) - Unique identifier with `n_` prefix
- `label` (required) - Display name
- `entityType` (required) - `person`, `platform`, `event`, `movement`, or `media`
- `sources` (required) - Array of evidence IDs supporting this entity
- `aka` (optional) - Alternative names/aliases
- `dates` (optional) - `{start: "YYYY-MM-DD", end: "YYYY-MM-DD"}`
- `position` (optional) - `{x: number, y: number}` for graph layout
- `tags` (optional) - Categorization tags

---

### 3. Add Graph Edge (Relationship)

Create a connection between two entities.

```bash
curl -X POST http://localhost:3000/api/evidence-mutations/relationships/platform_control \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "add",
    "data": {
      "id": "e_musk_controls_twitter",
      "source": "n_elon_musk",
      "target": "n_twitter",
      "label": "acquires and controls",
      "type": "platform_control",
      "since": "2022-10-27",
      "confidence": 0.9,
      "sources": ["ev_reuters_twitter_acquisition"],
      "notes": "$44 billion acquisition"
    }
  }'
```

**Edge Data Fields:**

- `id` (required) - Unique identifier with `e_` prefix
- `source` (required) - Source node ID
- `target` (required) - Target node ID
- `label` (required) - Relationship description
- `sources` (required) - Array of evidence IDs
- `type` (optional) - Relationship type for categorization
- `since`/`until` (optional) - Date range (YYYY-MM-DD)
- `confidence` (optional) - 0.0 to 1.0 (default: 0.8)
- `notes` (optional) - Additional context

---

### 4. Update Existing Item

Modify an existing entity, relationship, or evidence entry.

```bash
curl -X POST http://localhost:3000/api/evidence-mutations/entities/person \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "update",
    "data": {
      "id": "n_elon_musk",
      "label": "Elon Musk",
      "entityType": "person",
      "aka": ["@elonmusk", "Technoking", "Chief Twit"],
      "sources": ["ev_wapo_trump_2024", "ev_reuters_twitter_acquisition"],
      "position": {
        "x": 450,
        "y": 300
      }
    }
  }'
```

---

### 5. Delete Item

Remove an entity, relationship, or evidence entry.

```bash
curl -X POST http://localhost:3000/api/evidence-mutations/relationships/platform_control \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "delete",
    "data": {
      "id": "e_musk_controls_twitter"
    }
  }'
```

---

### 6. Read Partition Data

Get current contents of a partition (GET request).

```bash
curl -X GET http://localhost:3000/api/evidence-mutations/entities/person
```

---

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "ev_wapo_trump_2024",
    "title": "Trump makes false claims about election security"
    // ... rest of data
  },
  "partition": "evidence-major-media"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Item ev_invalid_id not found"
}
```

---

## Batch Operations

For adding multiple items, make separate API calls. The system will automatically:

- Update partition files
- Refresh manifest totals
- Maintain data integrity

### Example: Adding a Complete Investigation

```bash
# 1. Add evidence first
curl -X POST http://localhost:3000/api/evidence-mutations/evidence/government \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "add",
    "data": {
      "id": "ev_doj_jan6_report",
      "title": "January 6th Investigation Report",
      "date": "2023-12-11",
      "publisher": "Department of Justice",
      "url": "https://www.justice.gov/jan6-report",
      "type": "primary"
    }
  }'

# 2. Add key figure
curl -X POST http://localhost:3000/api/evidence-mutations/entities/person \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "add",
    "data": {
      "id": "n_key_figure",
      "label": "Key Figure Name",
      "entityType": "person",
      "sources": ["ev_doj_jan6_report"]
    }
  }'

# 3. Add relationship
curl -X POST http://localhost:3000/api/evidence-mutations/relationships/event_participation \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "add",
    "data": {
      "id": "e_figure_jan6_role",
      "source": "n_key_figure",
      "target": "n_jan6_event",
      "label": "participated in planning",
      "type": "event_participation",
      "confidence": 0.8,
      "sources": ["ev_doj_jan6_report"]
    }
  }'
```

---

## Data Validation

The API performs validation on:

- **Required fields** - All required fields must be present
- **ID formats** - Must use proper prefixes (`ev_`, `n_`, `e_`)
- **Date formats** - YYYY-MM-DD or YYYY-MM or YYYY
- **URL validation** - Must be valid HTTP/HTTPS URLs
- **Reference integrity** - Source/target node IDs must exist
- **Confidence ranges** - Must be 0.0 to 1.0

---

## File System Impact

Each mutation:

1. **Updates partition file** - Modifies the appropriate JSON file
2. **Updates manifest** - Refreshes totals and metadata
3. **Maintains structure** - Preserves partition organization
4. **Logs changes** - Console output shows updates

**Files Modified:**

```
docs/evidence-graphs/partitioned/
├── entities/{category}.json     ← Updated partition
├── relationships/{category}.json ← Updated partition
├── evidence/{category}.json     ← Updated partition
└── manifest.json               ← Updated totals
```

---

## Error Handling

**Common Errors:**

- `400 Bad Request` - Invalid data or missing required fields
- `404 Not Found` - Partition or item not found
- `500 Internal Server Error` - File system or JSON parsing errors

**Best Practices:**

1. **Add evidence first** - Before referencing in nodes/edges
2. **Add nodes before edges** - Source/target must exist
3. **Use unique IDs** - Avoid conflicts with existing items
4. **Validate dates** - Use ISO format (YYYY-MM-DD)
5. **Check references** - Ensure source IDs exist in evidence partitions

---

## Integration with Graph Explorer

After making mutations via API:

1. **Refresh browser** - New data loads automatically
2. **Topic selector** - Choose relevant topic to see changes
3. **Search** - Find newly added entities
4. **Evidence panel** - Click nodes to verify sources

The partitioned architecture ensures changes are immediately available in the UI without requiring server restarts.
