# API Endpoint Relationship Map

## Current State: Endpoint Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND CONSUMERS                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Atlas UI          Research UI       Dashboard    Share UI  │
│  ├─ AtlasPage      ├─ ResearchPage   ├─ Files    ├─ Token  │
│  ├─ ApiService     ├─ Workspace      ├─ Entities ├─ List   │
│  └─ Components     └─ Components     └─ Links    └─ View   │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      API ENDPOINTS                           │
└─────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════╗
║                   GRAPH VISUALIZATION                      ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  /api/atlas/graph-payload  ←── Atlas UI (full graph)     ║
║       │                                                    ║
║       ├─→ Returns: {nodes, edges, layout}                 ║
║       └─→ View modes: full-atlas, ego, community         ║
║                                                            ║
║  /api/graph-tiles/                                        ║
║       ├─→ ego/[uid]          ←── Atlas UI (focused)      ║
║       ├─→ community/[id]     ←── Atlas UI (cluster)      ║
║       ├─→ timeslice          ←── Atlas UI (temporal)     ║
║       └─→ timeslice-enhanced ←── (pagination support)    ║
║                                                            ║
║  /api/graph-batch            ←── UNUSED? (no grep matches)║
║       └─→ Progressive loading (candidate for removal)     ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════╗
║                     ENTITY OPERATIONS                      ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  READ:                                                     ║
║  /api/entity-v2/[id]         ←── NEW (consolidated)      ║
║       ↑                                                    ║
║       │ (redirected from)                                 ║
║       │                                                    ║
║  /api/entity/[id]            ←── DEPRECATED (delete)     ║
║  /api/atlas-details/[uid]    ←── LEGACY (redirects)      ║
║                                                            ║
║  SEARCH:                                                   ║
║  /api/entity-search          ←── EntitySearch component  ║
║       └─→ Returns: similarity-ranked matches              ║
║                                                            ║
║  /api/entity-matches         ←── EntityMergeDialog       ║
║       └─→ Server-side APOC similarity matching            ║
║                                                            ║
║  CREATE/UPDATE:                                            ║
║  /api/atlas-crud             ←── AddEntityForm           ║
║       ├─→ action: add-entity                              ║
║       └─→ action: add-relationship                        ║
║                                                            ║
║  ADMIN:                                                    ║
║  /api/entity-merge           ←── EntityMergeDialog       ║
║  /api/entity-delete          ←── Atlas UI (super admin)  ║
║  /api/relationship-delete    ←── Atlas UI (super admin)  ║
║  /api/entities/management    ←── Dashboard               ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════╗
║                   TIMELINE & ANALYSIS                      ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  TIMELINE:                                                 ║
║  /api/entity-timeline/[uid]  ←── Timeline components     ║
║       └─→ Individual entity timeline                      ║
║                                                            ║
║  /api/entity-timeline/batch  ←── Multi-entity timelines  ║
║       └─→ Batch fetching optimization                     ║
║                                                            ║
║  /api/rabbit-hole/timeline/[uid] ←── DUPLICATE (delete)  ║
║       └─→ Same as entity-timeline (1 call in ApiService) ║
║                                                            ║
║  RELATIONSHIPS:                                            ║
║  /api/entity-relationships/[uid]  ←── Relationship panels║
║       └─→ Categorized: family, business, political        ║
║                                                            ║
║  /api/research/relationships/[uid] ←── Deep analysis     ║
║       └─→ Individual relationship pair analysis           ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════╗
║                    RESEARCH & AI                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  CURRENT STATE (Messy):                                    ║
║                                                            ║
║  /api/research/entity        ✅ Universal (keep)         ║
║       ├─→ All entity types                                ║
║       └─→ Uses @proto/llm-tools                           ║
║                                                            ║
║  /api/research/person        ❌ Redundant (delete)       ║
║       ├─→ Person-specific                                 ║
║       └─→ Subset of research/entity                       ║
║                                                            ║
║  /api/unified-entity-research ❌ Unused (delete)         ║
║       ├─→ Another consolidation attempt                   ║
║       └─→ No grep matches found                           ║
║                                                            ║
║  /api/entity-research-agent  ❌ MISSING (referenced!)    ║
║       └─→ Called by AddEntityForm but doesn't exist       ║
║                                                            ║
║  SPECIALIZED:                                              ║
║  /api/research/biographical/[uid]  ←── Bio gap analysis  ║
║  /api/research/report/[uid]        ←── Report generation ║
║  /api/research/merge               ←── Merge to Neo4j    ║
║                                                            ║
║  PROPOSED STATE (Clean):                                   ║
║                                                            ║
║  /api/research/entity        ✅ Universal research       ║
║  /api/research/biographical  ✅ Specialized analysis     ║
║  /api/research/report        ✅ Report generation        ║
║  /api/research/merge         ✅ Merge results            ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════╗
║                    FILE MANAGEMENT                         ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  UPLOAD WORKFLOW:                                          ║
║  Client → process-metadata → sign-put → [S3] → promote   ║
║                                            ↓               ║
║                                       atlas-crud           ║
║                                            ↓               ║
║                                    [File Entity Created]  ║
║                                                            ║
║  /api/files/process-metadata  ─┐                         ║
║  /api/files/sign-put          ─┤  Complete Pipeline      ║
║  /api/files/promote           ─┤  All Actively Used      ║
║  /api/files/link-entities     ─┤  Keep All ✅            ║
║  /api/files/sign-get          ─┤                         ║
║  /api/files/management        ─┤                         ║
║  /api/files/update-processing-state ─┘                   ║
║                                                            ║
║  /api/jobs/enqueue            ←── STUB (remove)          ║
║       └─→ Mock job queue, not functional                  ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════╗
║                  DATA IMPORT/EXPORT                        ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  /api/ingest-bundle          ←── Bulk import (active)    ║
║       ├─→ Rabbit Hole schema validation                   ║
║       ├─→ Tenant isolation                                ║
║       └─→ Merge strategies                                ║
║                                                            ║
║  /api/export-bundle          ←── Export feature          ║
║       └─→ Download as JSON bundle                         ║
║                                                            ║
║  /api/research/import-bundle ←── DEPRECATED (delete)     ║
║       └─→ Validation only, no import                      ║
║                                                            ║
║  /api/evidence-mutations     ←── Evidence graph CRUD     ║
║       ├─→ Writes: Neo4j + partitions                      ║
║       └─→ Reads: Partial implementation                   ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════╗
║                   SHARE & COLLABORATION                    ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  SHARE LIFECYCLE:                                          ║
║  create → [token] → extend/revoke                         ║
║                                                            ║
║  /api/share/create                    All Active ✅       ║
║  /api/share/[token]                   Keep All            ║
║  /api/share/[token]/extend                                ║
║  /api/share/[token]/revoke                                ║
║  /api/share/[token]/preview.png       (needs completion)  ║
║  /api/share/user/[userId]/tokens                          ║
║                                                            ║
║  COLLABORATION:                                            ║
║  /api/collaboration/room              All Active ✅       ║
║  /api/collaboration/sessions          Keep All            ║
║  /api/collaboration/sessions/[id]                         ║
║  /api/collaboration/sessions/[id]/join                    ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════╗
║                INFRASTRUCTURE & SYSTEM                     ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  /api/health                  ←── Docker/K8s probes      ║
║  /api/metrics                 ←── Prometheus scraping    ║
║  /api/metrics/vitals          ←── Web Vitals collection  ║
║  /api/copilotkit              ←── AI chat runtime        ║
║  /api/system/integrity-check  ←── Data validation       ║
║  /api/v1/tenant               ←── Multi-tenancy          ║
║  /api/v1/tenant/limits        ←── Quota tracking         ║
║  /api/webhooks/clerk          ←── Org lifecycle          ║
║  /api/user/stats              ←── Usage tracking         ║
║                                                            ║
║  All Essential Infrastructure - Keep All ✅               ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝
```

---

## Consolidation Visual

### BEFORE: Research Endpoints

```
┌────────────────────────────────────────────────┐
│                                                 │
│  /api/research/entity         (universal)      │
│  /api/research/person         (person-only)    │
│  /api/unified-entity-research (unused)         │
│  /api/entity-research-agent   (MISSING!)       │
│                                                 │
│  All doing similar LLM-based entity research   │
│                                                 │
└────────────────────────────────────────────────┘
```

### AFTER: Consolidated

```
┌────────────────────────────────────────────────┐
│                                                 │
│  /api/research/entity                          │
│    └─→ Handles all entity types               │
│    └─→ Single well-tested implementation       │
│                                                 │
└────────────────────────────────────────────────┘
```

**Reduction:** 4 endpoints → 1 endpoint (-75%)

---

## Dependency Flow

### Entity Details (Current - Messy)

```
FloatingDetailsPanel
    ├─→ /api/evidence-v2/[id]     ❌ DOESN'T EXIST
    └─→ /api/atlas-details/[uid]  ⚠️ REDIRECT
            └─→ /api/entity-v2/[id]  ✅ ACTUAL

EntitySearch
    └─→ /api/entity-search         ✅ DIRECT

AtlasPage
    └─→ /api/entity-delete         ✅ DIRECT
```

### Entity Details (Proposed - Clean)

```
FloatingDetailsPanel
    └─→ /api/evidence/[id]         ✅ EXISTS

EntitySearch
    └─→ /api/entity-search         ✅ DIRECT

AtlasPage
    └─→ /api/entity-v2/[id]        ✅ DIRECT
    └─→ /api/entity-delete         ✅ DIRECT
```

**Change:** Remove one redirect layer, fix broken reference

---

## Timeline Flow (Current - Duplicated)

```
AtlasApiService (loadTimeline)
    └─→ /api/rabbit-hole/timeline/[uid]  ⚠️ DUPLICATE
            └─→ Uses shared processor

useMultiEntityTimeline
    └─→ /api/entity-timeline/batch        ✅ DIRECT
            └─→ Uses shared processor

BiographicalAnalysis
    └─→ /api/entity-timeline/[uid]        ✅ DIRECT
            └─→ Uses shared processor

        All three use: lib/shared-timeline-processor
```

### Timeline Flow (Proposed - Unified)

```
All Components
    └─→ /api/entity-timeline/*            ✅ SINGLE SOURCE
            ├─→ [uid] - Individual
            ├─→ batch - Multiple entities
            └─→ Uses shared processor

    DELETE: /api/rabbit-hole/timeline
```

**Change:** One timeline namespace, remove duplicate

---

## Research Flow (Current - Fragmented)

```
AddEntityForm
    └─→ /api/entity-research-agent        ❌ DOESN'T EXIST!

AtlasApiService
    └─→ /api/research/entity              ✅ Universal endpoint

ResearchPage (if used)
    └─→ /api/research/person              ⚠️ Redundant

[No consumers found]
    └─→ /api/unified-entity-research      ⚠️ Unused?
```

### Research Flow (Proposed - Unified)

```
All Research Consumers
    └─→ /api/research/entity              ✅ SINGLE ENDPOINT
            ├─→ Auto-detects entity type
            ├─→ Handles all research depths
            └─→ Uses @proto/llm-tools
```

**Change:** Fix broken ref, delete 2-3 redundant endpoints

---

## File Upload Flow (Current - Well Organized)

```
FileUploadDialog
    └─→ FileUploadService
            ├─→ 1. /api/files/process-metadata
            ├─→ 2. /api/files/sign-put
            ├─→ 3. [Upload to S3/MinIO]
            ├─→ 4. /api/files/promote
            ├─→ 5. /api/atlas-crud (create File entity)
            └─→ 6. /api/jobs/enqueue (STUB - optional)

FilesManagement
    ├─→ /api/files/management (GET - list)
    └─→ /api/files/management (DELETE - remove)

FileCard
    └─→ /api/files/sign-get (download)

FileUploadDialog
    └─→ /api/files/link-entities (link to entities)
```

**Status:** Complete pipeline, well-structured. Only issue is stub at step 6.

**Recommendation:** Remove `/api/jobs/enqueue` call from FileUploadService (non-critical)

---

## Evidence System Flow (Specialized - Keep)

```
EvidenceGraph Components
    ├─→ /api/evidence-graph          (load graph data)
    ├─→ /api/evidence/[id]           (evidence details)
    ├─→ /api/evidence-status         (backend status)
    └─→ /api/evidence-mutations      (CRUD operations)

RabbitHole Features (Possibly Unused)
    ├─→ /api/rabbit-hole/evidence-pack/[uid]   ⚠️ NO USAGE
    └─→ /api/rabbit-hole/hostile-speech        ⚠️ NO USAGE
```

**Action:** Audit rabbit-hole namespace endpoints - may be future features or external API

---

## Share System Flow (Current - Well Designed)

```
AnalyticsShareButton
    └─→ /api/share/create
            └─→ Returns: {token, shareUrl, previewUrl}

ShareLinksManagement
    ├─→ /api/share/user/[userId]/tokens   (list)
    ├─→ /api/share/[token]/revoke         (revoke)
    └─→ /api/share/[token]/extend         (extend)

SharePage
    └─→ /api/share/[token]                (validate)
            └─→ Increments view count

Social Sharing
    └─→ /api/share/[token]/preview.png    (og:image)
            └─→ Currently returns SVG placeholder
```

**Status:** Complete lifecycle, actively used. Only issue is preview.png stub.

**Recommendation:** Keep all, optionally complete preview.png

---

## Quick Reference: What to Delete

### Immediate Deletion (No Dependencies)

```bash
rm -rf app/api/entity                    # Deprecated redirect
rm -rf app/api/research/import-bundle    # Deprecated validation
```

### After Updating Call Sites

```bash
# Update: app/atlas/services/AtlasApiService.ts line 228
rm -rf app/api/rabbit-hole/timeline

# Update: app/evidence/components/atlas/AddEntityForm.tsx line 181
# (Already broken, so just needs fix not removal)

# Consolidate research
rm -rf app/api/research/person
rm -rf app/api/unified-entity-research
```

### After Usage Audit

```bash
# If confirmed unused:
rm -rf app/api/graph-batch
rm -rf app/api/geographic-entities
rm -rf app/api/rabbit-hole/evidence-pack
rm -rf app/api/rabbit-hole/hostile-speech
```

---

## Quick Reference: What to Create

### Missing Endpoints

```bash
# Option 1: Create these endpoints
touch app/api/waitlist/route.ts

# Option 2: Fix references to use existing endpoints
# FloatingDetailsPanel.tsx:616
# Change: /api/evidence-v2/${evidenceId}
# To: /api/evidence/${evidenceId}
```

---

## Complexity Heatmap

```
SIMPLE (< 200 lines):
  ■■■■■ health, copilotkit, user/stats, collaboration/room

MODERATE (200-400 lines):
  ■■■■■ Most endpoints fall here

COMPLEX (400+ lines):
  ■■■■■ entity-merge (435), entity-timeline (493), export-bundle (591)

BLOATED (needs refactoring):
  ■■■■■ None identified - good code quality overall
```

---

## Summary Statistics

| Category                 | Count | %    |
| ------------------------ | ----- | ---- |
| **Total Endpoints**      | 69    | 100% |
| **Active & Used**        | 42    | 61%  |
| **Deprecated**           | 2     | 3%   |
| **Stubs/Incomplete**     | 3     | 4%   |
| **Duplicates**           | 5     | 7%   |
| **Audit Needed**         | 9     | 13%  |
| **Missing (referenced)** | 3     | 4%   |
| **Well-Structured**      | 35    | 51%  |

---

## Final Verdict

**Overall Grade: B+**

**Strengths:**

- Good modular package usage (@proto/\*)
- Clear separation of concerns
- Well-implemented core features (files, share, graph)
- Proper authentication/authorization

**Weaknesses:**

- Research endpoint sprawl (4 overlapping)
- Some broken references (3 missing endpoints)
- Incomplete deprecation cleanup (2 old redirects)
- Few stub implementations (3 partial)

**Cleanup Potential:**

- Remove 10-14 endpoints (15-20% reduction)
- Eliminate 1,200-2,000 lines (15% reduction)
- Fix 3 broken references
- Improve developer experience

**Recommendation:** Execute Phase 1-2 of action plan (2 hours total) for immediate 80% of value.
