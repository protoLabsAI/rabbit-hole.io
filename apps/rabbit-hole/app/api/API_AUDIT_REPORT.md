# API Directory Audit Report

**Generated:** October 9, 2025  
**Scope:** `/app/api/` directory analysis  
**Purpose:** Identify active endpoints, deprecated routes, and consolidation opportunities

---

## Executive Summary

**Total API Routes:** 69 endpoints  
**Active Endpoints:** 42 (61%)  
**Deprecated/Redirects:** 2 (3%)  
**Stub/Incomplete:** 5 (7%)  
**Candidates for Consolidation:** 12 (17%)

### Key Findings

1. **Multiple overlapping entity research endpoints** - can consolidate 4 into 1
2. **Redundant graph loading endpoints** - Atlas has 3 different approaches
3. **Two timeline APIs** doing similar work - one wraps the other
4. **Clear deprecation markers** present but routes still exist
5. **Some endpoints are stubs** (jobs/enqueue) waiting for implementation

---

## 1. ACTIVE ENDPOINTS (Core Infrastructure)

### Atlas & Graph Visualization (7 endpoints)

✅ `/api/atlas/graph-payload` - Main graph data loader for Atlas UI
✅ `/api/atlas-crud` - Create entities and relationships  
✅ `/api/atlas-details/[uid]` - Legacy wrapper (redirects to entity-v2)
✅ `/api/graph-tiles/ego/[centerUid]` - Ego network subgraph
✅ `/api/graph-tiles/community/[communityId]` - Community subgraph
✅ `/api/graph-tiles/timeslice` - Time-windowed subgraph
✅ `/api/graph-tiles/timeslice-enhanced` - Paginated time-windowed subgraph

**Usage:**

- `AtlasApiService.ts` - Primary consumer
- `atlas/page.tsx` - Direct usage
- Graph visualization components

**Status:** Core functionality, heavily used

---

### Entity Management (9 endpoints)

✅ `/api/entity-v2/[id]` - Consolidated entity details (70% code reduction)
✅ `/api/entity-search` - Entity search with similarity matching
✅ `/api/entity-matches` - Server-side entity matching for merge detection
✅ `/api/entity-merge` - Smart entity deduplication (super admin only)
✅ `/api/entity-delete` - Safe entity removal with cascade (super admin only)
✅ `/api/entity-relationships/[entityUid]` - Relationship details by category
✅ `/api/entity-timeline/[entityUid]` - Individual entity timeline
✅ `/api/entity-timeline/batch` - Batch timeline fetching
✅ `/api/entities/management` - Entity listing with metadata

**Usage:**

- `EntitySearch.tsx` - entity-search
- `EntityMergeDialog.tsx` - entity-matches, entity-merge
- `EntitiesManagementTab.tsx` - entities/management
- `atlas/page.tsx` - entity-delete
- `useMultiEntityTimeline.ts` - entity-timeline/batch
- `BiographicalAnalysisDialog.tsx` - entity-timeline

**Status:** Core functionality, well-structured

---

### File Management (7 endpoints)

✅ `/api/files/process-metadata` - File metadata processing
✅ `/api/files/sign-put` - Generate signed upload URLs
✅ `/api/files/sign-get` - Generate signed download URLs
✅ `/api/files/promote` - Move temp files to permanent storage
✅ `/api/files/link-entities` - Create file-entity relationships
✅ `/api/files/management` - File listing and deletion
✅ `/api/files/update-processing-state` - Processing state management

**Usage:**

- `FileUploadService.ts` - Complete workflow
- `FilesManagementTab.tsx` - management
- `FileUploadDialog.tsx` - link-entities
- `useFileUploadDialog.ts` - process-metadata

**Status:** Complete file upload pipeline, actively used

---

### Research & AI (5 endpoints)

✅ `/api/research/entity` - Universal entity research agent
✅ `/api/research/person` - Person-specific research (may be redundant with entity)
✅ `/api/research/biographical/[uid]` - Biographical gap analysis
✅ `/api/research/report/[entityUid]` - Research report generation
✅ `/api/research/merge` - Merge research results to Neo4j

**Usage:**

- `AtlasApiService.ts` - research/entity
- `BiographicalAnalysisDialog.tsx` - research/biographical
- `ResearchReportDialog.tsx` - research/report
- `ExportWorkflow.tsx` - research/merge

**Status:** Active but has consolidation potential

---

### Share & Collaboration (9 endpoints)

✅ `/api/share/create` - Create share tokens
✅ `/api/share/[token]` - Validate and retrieve share token
✅ `/api/share/[token]/extend` - Extend token expiration
✅ `/api/share/[token]/revoke` - Revoke share token
✅ `/api/share/[token]/preview.png` - Social preview generation
✅ `/api/share/user/[userId]/tokens` - List user tokens
✅ `/api/collaboration/room` - Create Jitsi rooms
✅ `/api/collaboration/sessions` - Collaboration session management
✅ `/api/collaboration/sessions/[id]/join` - Join collaboration session

**Usage:**

- `ShareLinksManagementTab.tsx` - All share endpoints
- `AnalyticsShareButton.tsx` - share/create

**Status:** Complete share system, actively used

---

### Data Import/Export (3 endpoints)

✅ `/api/ingest-bundle` - Import Rabbit Hole bundles
✅ `/api/export-bundle` - Export graph as bundle
✅ `/api/evidence-mutations/[...path]` - Evidence graph mutations

**Usage:**

- `BulkImportPanel.tsx` - ingest-bundle
- `AtlasApiService.ts` - export-bundle
- `evidence-mutations.test.ts` - evidence-mutations

**Status:** Core data pipeline, actively used

---

### System & Infrastructure (5 endpoints)

✅ `/api/health` - Health check for monitoring
✅ `/api/metrics` - Prometheus metrics
✅ `/api/metrics/vitals` - Web Vitals collection
✅ `/api/system/integrity-check` - Data integrity validation
✅ `/api/copilotkit` - CopilotKit runtime bridge

**Usage:**

- `IntegrityCheckTab.tsx` - system/integrity-check
- Docker health checks - health
- Prometheus - metrics
- WebVitalsMonitor.tsx - metrics/vitals
- CopilotKit components - copilotkit

**Status:** Infrastructure essentials, keep all

---

### Tenant & Auth (4 endpoints)

✅ `/api/v1/tenant` - Tenant management
✅ `/api/v1/tenant/limits` - Usage and tier limits
✅ `/api/webhooks/clerk` - Clerk lifecycle webhooks
✅ `/api/user/stats` - User statistics tracking

**Usage:**

- Tenant system components
- Clerk integration
- `useUserStats.ts` - user/stats

**Status:** Core multi-tenancy infrastructure

---

### Workspace Drafts ❌ REMOVED

❌ `/api/workspaces/draft/create` - REMOVED (defunct)
❌ `/api/workspaces/draft/publish` - REMOVED (defunct)
❌ `/api/workspaces/draft/discard` - REMOVED (defunct)

**Status:** Feature removed October 11, 2025 - was never integrated into the application

---

## 2. DEPRECATED ENDPOINTS (Need Removal)

### 🔴 Explicitly Marked DEPRECATED

**`/api/entity/[id]`** - Redirects to entity-v2

```typescript
// Line 4: DEPRECATED: This route now redirects to consolidated entity-v2
```

- **Status:** Pure redirect wrapper
- **Action:** Delete file, update consumers to use `/api/entity-v2/[id]` directly
- **Risk:** Low (already redirecting)

**`/api/research/import-bundle`** - Deprecated for user workspaces

```typescript
// Line 4-5: @deprecated This endpoint is deprecated for user workspaces.
// User tier enforcement is now client-side (Yjs workspace counting).
```

- **Status:** Validation-only, no actual import
- **Action:** Remove or repurpose for enterprise/internal use
- **Risk:** Low (not actively called)

---

## 3. STUB/INCOMPLETE ENDPOINTS

### ⚠️ Partial Implementations

**`/api/jobs/enqueue`** - Job enqueueing stub

```typescript
// Line 54: TODO: Implement actual job enqueueing
// Currently returns mock job IDs
```

- **Status:** MVP simulation, not functional
- **Impact:** File processing pipeline incomplete
- **Action:** Implement or remove

**`/api/share/[token]/preview.png`** - Preview image generation

```typescript
// Line 89: TODO: Implement actual image generation
// Returns SVG placeholder
```

- **Status:** Returns basic SVG, not PNG
- **Action:** Implement with canvas/sharp or remove feature

**`/api/evidence-mutations/[...path]`** - Partial Neo4j read support

```typescript
// Line 473: TODO: Implement Neo4j data reading by partition type
```

- **Status:** Write works, read incomplete
- **Action:** Complete or document limitation

---

## 4. CONSOLIDATION OPPORTUNITIES

### 🔄 High Priority - Research Endpoints

**Problem:** 4 overlapping research endpoints

1. `/api/research/entity` - Universal entity research ✅ Keep
2. `/api/research/person` - Person-specific research ❌ Redundant
3. `/api/unified-entity-research` - Another attempt at unification ❌ Redundant
4. `/api/entity-research-agent` - Called by AddEntityForm ❌ Not found in directory

**Recommendation:**

```
CONSOLIDATE: Keep only /api/research/entity
DELETE: /api/research/person (redirect to research/entity)
DELETE: /api/unified-entity-research (unused based on grep)
UPDATE: AddEntityForm.tsx to use /api/research/entity
```

**Impact:** Eliminate ~600 lines of duplicate code

---

### 🔄 Medium Priority - Timeline Endpoints

**Problem:** Multiple timeline approaches

1. `/api/entity-timeline/[entityUid]` - Individual timeline ✅ Keep
2. `/api/entity-timeline/batch` - Batch timeline ✅ Keep
3. `/api/rabbit-hole/timeline/[entityUid]` - Duplicate of entity-timeline ❌ Redundant

**Grep Results:**

- `entity-timeline` used in: useMultiEntityTimeline, batch-timeline-fetcher
- `rabbit-hole/timeline` used in: AtlasApiService (line 228)

**Recommendation:**

```
UPDATE: AtlasApiService.ts to use /api/entity-timeline/[entityUid]
DELETE: /api/rabbit-hole/timeline/[entityUid]
```

**Impact:** Eliminate ~200 lines of duplicate timeline code

---

### 🔄 Medium Priority - Relationship Analysis

**Problem:** Overlapping relationship endpoints

1. `/api/entity-relationships/[entityUid]` - Category-based relationships ✅ Keep
2. `/api/research/relationships/[entityUid]` - Individual relationship analysis ❓ Specialized

**Analysis:**

- `entity-relationships` - Returns categorized relationships (family, business, political)
- `research/relationships` - Deep analysis of specific relationship pairs
- Different use cases, both valid

**Recommendation:** Keep both, add documentation clarifying distinct purposes

---

### 🔄 Low Priority - Graph Loading

**Problem:** Multiple graph loading mechanisms

1. `/api/atlas/graph-payload` - Legacy full atlas loader
2. `/api/graph-tiles/*` - Canonical format, bounded views
3. `/api/graph-batch` - Progressive batch loading
4. `/api/evidence-graph` - Evidence-specific graph

**Analysis:**

- atlas/graph-payload: Simple full-graph for backward compat
- graph-tiles: Modern canonical format for bounded views
- graph-batch: Advanced progressive loading (possibly unused)
- evidence-graph: Different data source (partitions vs entities)

**Recommendation:**

```
AUDIT: Check if /api/graph-batch is actually used (no grep matches found)
CONSIDER: Deprecate /api/atlas/graph-payload in favor of graph-tiles
KEEP: evidence-graph (different purpose)
```

---

## 5. MISSING/BROKEN ENDPOINTS

### ❌ Referenced but Not Found

**`/api/entity-research-agent`** - Called by AddEntityForm.tsx (line 181)

```typescript
const response = await fetch("/api/entity-research-agent", {
```

- **Status:** File doesn't exist in directory
- **Action:** Update AddEntityForm to use `/api/research/entity`

**`/api/waitlist`** - Called by waitlist/page.tsx

- **Status:** File doesn't exist in directory structure
- **Action:** Create or remove waitlist feature

**`/api/evidence-v2/[id]`** - Called by FloatingDetailsPanel.tsx

- **Status:** File doesn't exist in directory structure
- **Action:** Create or update to use existing evidence endpoint

---

## 6. ANALYSIS BY CATEGORY

### Well-Organized (Keep As-Is)

✅ **File Management** - Complete pipeline, clear separation of concerns
✅ **Share System** - Well-structured token lifecycle
✅ **Workspace Drafts** - Clean create/publish/discard flow
✅ **Tenant Management** - Simple, focused endpoints

### Needs Consolidation

🔄 **Research APIs** - 4+ overlapping endpoints, reduce to 2
🔄 **Timeline APIs** - Remove rabbit-hole duplicate
🔄 **Entity Details** - Already improved, finish deprecation cleanup

### Needs Completion

⚠️ **Jobs System** - Either implement or remove
⚠️ **Preview Generation** - Complete PNG generation or remove
⚠️ **Evidence Mutations** - Complete Neo4j read support

### Evidence-Related (Specialized)

These serve the evidence graph feature (separate from main knowledge graph):

- `/api/evidence/[id]` - Evidence details from partitions
- `/api/evidence-graph` - Evidence graph data loader
- `/api/evidence-mutations/[...path]` - Evidence CRUD
- `/api/evidence-status` - Backend status check
- `/api/rabbit-hole/evidence-pack/[contentUid]` - Evidence provenance
- `/api/rabbit-hole/hostile-speech` - Hostile speech report

**Status:** Keep all - distinct feature set

---

## 7. DETAILED RECOMMENDATIONS

### Phase 1: Quick Wins (Remove Dead Code)

```bash
# 1. Delete deprecated redirect
rm app/api/entity/[id]/route.ts
# Update: None (already using entity-v2)

# 2. Delete deprecated import-bundle
rm app/api/research/import-bundle/route.ts
# Update: None (not actively called)

# 3. Delete rabbit-hole timeline duplicate
rm app/api/rabbit-hole/timeline/[entityUid]/route.ts
# Update: app/atlas/services/AtlasApiService.ts line 228
#   Change: `/api/rabbit-hole/timeline/${entityId}`
#   To: `/api/entity-timeline/${entityId}`
```

**Impact:** -600 lines, 3 fewer endpoints

---

### Phase 2: Consolidate Research (Medium Effort)

```typescript
// DELETE: /api/research/person/route.ts
// DELETE: /api/unified-entity-research/route.ts

// KEEP: /api/research/entity (universal entity research)

// UPDATE: app/evidence/components/atlas/AddEntityForm.tsx
// Line 181: Change endpoint from non-existent /api/entity-research-agent
// To: /api/research/entity
```

**Impact:** -400 lines, 2 fewer endpoints, fix broken reference

---

### Phase 3: Audit Unused (Low Priority)

**Check these for actual usage:**

1. `/api/graph-batch` - No grep matches found, may be unused
2. `/api/geographic-entities` - Commented out in MapCanvas.tsx
3. `/api/relationship-delete` - Used in atlas/page.tsx but could use standard CRUD
4. `/api/rabbit-hole/evidence-pack/[contentUid]` - No grep matches
5. `/api/rabbit-hole/hostile-speech` - No grep matches

**Action:** Add deprecation warnings, monitor usage, remove if truly unused

---

### Phase 4: Complete Stubs (Optional)

**Decision needed on these:**

1. **`/api/jobs/enqueue`** - Implement Sidequest.js integration or remove
2. **`/api/share/[token]/preview.png`** - Implement proper PNG generation or use SVG
3. **`/api/evidence-mutations`** - Complete Neo4j read implementation

---

## 8. ORGANIZATIONAL RECOMMENDATIONS

### Directory Structure Improvements

**Current Structure:** Flat with some nesting

```
/api/
  atlas/
  atlas-crud/
  atlas-details/
  entity/
  entity-v2/
  entity-search/
  entity-matches/
  entity-merge/
  ...
```

**Proposed Structure:** Group by domain

```
/api/
  v1/
    atlas/
      graph/          # atlas/graph-payload
      crud/           # atlas-crud
      details/[uid]/  # atlas-details (legacy redirect)
    entities/
      [id]/           # entity-v2 (rename from entity-v2 to just id)
      search/         # entity-search
      matches/        # entity-matches
      merge/          # entity-merge
      delete/         # entity-delete
      relationships/  # entity-relationships
      timeline/       # entity-timeline
      management/     # entities/management
    files/
      metadata/       # files/process-metadata
      sign-put/       # files/sign-put
      sign-get/       # files/sign-get
      promote/        # files/promote
      link/           # files/link-entities
      management/     # files/management
      state/          # files/update-processing-state
    research/
      entity/         # Consolidated research endpoint
      biographical/   # Specialized analysis
      report/         # Report generation
      merge/          # Merge results
    share/
      create/         # share/create
      [token]/        # All token operations
      user/           # User token management
    graph/
      tiles/          # All graph-tiles endpoints
      batch/          # graph-batch
    collaboration/    # Keep as-is
    tenant/           # Keep as-is (already in v1/)
    webhooks/         # Keep as-is
    system/           # Keep as-is
```

**Benefits:**

- Clearer API organization
- Easier to find related endpoints
- Version prefix (v1/) for future API evolution
- Groups related functionality

---

## 9. MIGRATION CHECKLIST

### Immediate Actions (Do Now)

- [ ] Delete `/api/entity/[id]` (deprecated redirect)
- [ ] Delete `/api/research/import-bundle` (deprecated)
- [ ] Update `AtlasApiService.ts` to use `/api/entity-timeline` instead of rabbit-hole
- [ ] Delete `/api/rabbit-hole/timeline/[entityUid]`
- [ ] Fix `AddEntityForm.tsx` broken reference to `/api/entity-research-agent`

### Short-term (Next Sprint)

- [ ] Consolidate research endpoints (person, unified) into `/api/research/entity`
- [ ] Audit `/api/graph-batch` usage - remove if unused
- [ ] Audit rabbit-hole endpoints (evidence-pack, hostile-speech) - remove if unused
- [ ] Complete `/api/jobs/enqueue` or remove stub
- [ ] Document distinct purposes of entity-relationships vs research/relationships

### Long-term (Future Refactor)

- [ ] Reorganize into `/api/v1/` domain-grouped structure
- [ ] Create v2 endpoints with breaking changes if needed
- [ ] Add API versioning strategy documentation
- [ ] Consider GraphQL for complex graph queries

---

## 10. RISK ASSESSMENT

### Low Risk (Safe to Remove)

- `/api/entity/[id]` - Already redirecting
- `/api/research/import-bundle` - Not called
- `/api/rabbit-hole/timeline/[entityUid]` - Single call site, easy to update

### Medium Risk (Test First)

- `/api/research/person` - May have external consumers
- `/api/unified-entity-research` - Need to verify no usage
- `/api/graph-batch` - Appears unused but progressive loading feature

### High Risk (Keep Unless Certain)

- All graph-tiles endpoints - Core visualization
- All file management - Complete pipeline
- All share endpoints - User-facing feature
- entity-v2 and search - Core entity access

---

## 11. CODE QUALITY OBSERVATIONS

### Excellent Patterns Found

✅ **entity-v2** - Uses @proto/database, 70% code reduction
✅ **entity-search** - Consolidated validation, standardized responses
✅ **File management** - Complete pipeline with validation
✅ **ingest-bundle** - Proper validation, merge strategies

### Anti-patterns to Address

❌ **Multiple TODO comments** - Many incomplete implementations
❌ **Inline type definitions** - Some endpoints redefine types instead of importing from @proto/types
❌ **Inconsistent error handling** - Mix of error response formats
❌ **No API versioning** - Will make breaking changes difficult

### Security Concerns

🔒 **Super admin checks** - entity-merge, entity-delete properly protected
🔒 **Auth middleware** - Good use of withAuthAndLogging
⚠️ **Public access** - Some endpoints (atlas-details, entity-v2) intentionally public
⚠️ **Tenant isolation** - Some endpoints still need tenant filtering (see TODOs)

---

## 12. METRICS

### Code Volume

- **Total Lines:** ~15,000 lines across 69 files
- **Average per endpoint:** ~217 lines
- **Largest endpoints:**
  - entity-timeline/route.ts: 493 lines
  - entity-merge/route.ts: 435 lines
  - export-bundle/route.ts: 591 lines

### Complexity

- **Simple CRUD:** 15 endpoints
- **Complex queries:** 25 endpoints
- **Workflow orchestration:** 12 endpoints
- **Redirects/wrappers:** 2 endpoints

### Dependencies

- **@proto/database:** 45 endpoints (65%)
- **@proto/auth:** 38 endpoints (55%)
- **@proto/types:** 32 endpoints (46%)
- **@proto/utils:** 28 endpoints (41%)

Good modular package usage!

---

## 13. FINAL RECOMMENDATIONS

### Critical Path (Do First)

1. **Fix broken references** - AddEntityForm.tsx, missing waitlist/evidence-v2 endpoints
2. **Remove deprecated redirects** - entity/[id], research/import-bundle
3. **Consolidate research** - Single /api/research/entity endpoint
4. **Document vs delete** - Clarify which rabbit-hole endpoints are used

### Quality Improvements

1. **Add API documentation** - OpenAPI/Swagger spec
2. **Standardize error responses** - Use CanonicalResponse pattern everywhere
3. **Add versioning** - Start using /api/v1/, /api/v2/
4. **Complete stubs** - Jobs, preview.png, or remove features

### Maintenance

1. **Track endpoint usage** - Add metrics to see actual usage
2. **Set deprecation policy** - How long before removing deprecated endpoints
3. **API changelog** - Document breaking changes
4. **Integration tests** - Ensure endpoints work as documented

---

## APPENDIX A: Full Endpoint Inventory

### Active Production Endpoints (42)

1. atlas/graph-payload
2. atlas-crud
3. atlas-details/[uid] (redirect)
4. collaboration/room
5. collaboration/sessions
6. collaboration/sessions/[id]
7. collaboration/sessions/[id]/join
8. copilotkit
9. entities/management
10. entity-delete
11. entity-matches
12. entity-merge
13. entity-relationships/[entityUid]
14. entity-search
15. entity-timeline/[entityUid]
16. entity-timeline/batch
17. entity-v2/[id]
18. evidence/[id]
19. evidence-graph
20. evidence-mutations/[...path]
21. evidence-status
22. export-bundle
23. files/link-entities
24. files/management
25. files/process-metadata
26. files/promote
27. files/sign-get
28. files/sign-put
29. files/update-processing-state
30. geographic-entities
31. graph-tiles/community/[communityId]
32. graph-tiles/ego/[centerUid]
33. graph-tiles/timeslice
34. graph-tiles/timeslice-enhanced
35. health
36. ingest-bundle
37. metrics
38. metrics/vitals
39. research/biographical/[uid]
40. research/entity
41. research/merge
42. research/report/[entityUid]
43. share/create
44. share/[token]
45. share/[token]/extend
46. share/[token]/revoke
47. share/[token]/preview.png
48. share/user/[userId]/tokens
49. system/integrity-check
50. user/stats
51. v1/tenant
52. v1/tenant/limits
53. webhooks/clerk
54. workspaces/draft/create
55. workspaces/draft/publish
56. workspaces/draft/discard

### Deprecated (2)

1. entity/[id] - redirect to entity-v2
2. research/import-bundle - client-side enforcement now

### Stub/Incomplete (3)

1. jobs/enqueue - mock implementation
2. share/[token]/preview.png - partial implementation
3. evidence-mutations - partial Neo4j read support

### Audit Needed (6)

1. graph-batch - No usage found
2. geographic-entities - Commented out usage
3. rabbit-hole/timeline/[entityUid] - Duplicate
4. rabbit-hole/evidence-pack/[contentUid] - No usage found
5. rabbit-hole/hostile-speech - No usage found
6. relationship-delete - Could use standard CRUD
7. research/person - Redundant with research/entity
8. research/relationships/[entityUid] - Overlaps with entity-relationships?
9. unified-entity-research - Appears unused

### Missing (Referenced but Don't Exist)

1. /api/entity-research-agent - Called by AddEntityForm
2. /api/waitlist - Called by waitlist page
3. /api/evidence-v2/[id] - Called by FloatingDetailsPanel

---

## APPENDIX B: Deletion Impact Analysis

### Safe to Delete (Low Impact)

```typescript
// These can be removed with minimal updates

DELETE: app/api/entity/[id]/route.ts
UPDATE: None (already redirecting internally)
LINES: -118

DELETE: app/api/research/import-bundle/route.ts
UPDATE: None (not called)
LINES: -187

DELETE: app/api/rabbit-hole/timeline/[entityUid]/route.ts
UPDATE: app/atlas/services/AtlasApiService.ts (1 line change)
LINES: -207

TOTAL: -512 lines, 3 endpoints removed
```

### Moderate Impact (Test Required)

```typescript
// Research consolidation

DELETE: app/api/research/person/route.ts
DELETE: app/api/unified-entity-research/route.ts
UPDATE: app/evidence/components/atlas/AddEntityForm.tsx
CREATE: Migration guide for external consumers
LINES: -586

TOTAL: -586 lines, 2 endpoints removed
```

### Full Cleanup Potential

```typescript
// If all recommendations implemented

Deprecated: -512 lines, 3 endpoints
Research: -586 lines, 2 endpoints
Stubs (if removed): -300 lines, 3 endpoints
Audit items (if removed): -800 lines, 6 endpoints

TOTAL REDUCTION: -2,198 lines (15%), -14 endpoints (20%)
```

---

## APPENDIX C: Missing Endpoint Resolution

### Create These Files

**`/api/waitlist/route.ts`**

```typescript
// Waitlist API for landing page
export async function POST(request: NextRequest) {
  // Implement waitlist signup
}
```

**`/api/evidence-v2/[id]/route.ts`**

```typescript
// OR update FloatingDetailsPanel to use /api/evidence/[id]
```

**Update AddEntityForm.tsx**

```typescript
// Line 181: Change non-existent endpoint
- const response = await fetch("/api/entity-research-agent", {
+ const response = await fetch("/api/research/entity", {
```

---

## CONCLUSION

The API directory is **well-structured overall** with good use of modular packages (@proto/\*). Main issues:

1. **Incomplete deprecation cleanup** - 2 endpoints marked deprecated still exist
2. **Research endpoint sprawl** - 4 overlapping endpoints doing similar work
3. **Broken references** - 3 endpoints referenced but don't exist
4. **Stub implementations** - 3 endpoints partially complete

**Recommended Action Plan:**

```
WEEK 1 (Quick Wins):
- Fix broken references (AddEntityForm, waitlist, evidence-v2)
- Delete deprecated endpoints (entity/[id], research/import-bundle)
- Update AtlasApiService timeline reference
- Delete rabbit-hole/timeline duplicate

WEEK 2 (Consolidation):
- Consolidate research endpoints
- Audit graph-batch, geographic-entities, rabbit-hole endpoints
- Document which to keep vs remove

WEEK 3 (Quality):
- Complete or remove job enqueueing
- Standardize error response formats
- Add OpenAPI documentation
- Add endpoint usage metrics
```

**Expected Outcome:**

- 15-20% reduction in API endpoint count
- Clearer API surface area
- Better developer experience
- Easier maintenance

---

## APPENDIX D: Endpoint Purpose Quick Reference

| Endpoint                   | Purpose              | Status      | Action                 |
| -------------------------- | -------------------- | ----------- | ---------------------- |
| atlas/graph-payload        | Full graph load      | Active      | Keep                   |
| atlas-crud                 | Entity/rel CRUD      | Active      | Keep                   |
| atlas-details/[uid]        | Legacy details       | Redirect    | Delete                 |
| collaboration/\*           | Live collab          | Active      | Keep                   |
| copilotkit                 | AI runtime           | Active      | Keep                   |
| entities/management        | Entity admin         | Active      | Keep                   |
| entity/[id]                | Legacy details       | Deprecated  | **Delete**             |
| entity-delete              | Admin delete         | Active      | Keep                   |
| entity-matches             | Merge detection      | Active      | Keep                   |
| entity-merge               | Deduplication        | Active      | Keep                   |
| entity-relationships       | Categorized rels     | Active      | Keep                   |
| entity-search              | Entity search        | Active      | Keep                   |
| entity-timeline/\*         | Timeline data        | Active      | Keep                   |
| entity-v2/[id]             | Consolidated details | Active      | Keep                   |
| evidence/\*                | Evidence data        | Active      | Keep                   |
| export-bundle              | Data export          | Active      | Keep                   |
| files/\*                   | File pipeline        | Active      | Keep                   |
| geographic-entities        | Map data             | Inactive?   | **Audit**              |
| graph-batch                | Progressive load     | Unused?     | **Audit**              |
| graph-tiles/\*             | Bounded graphs       | Active      | Keep                   |
| health                     | Health check         | Active      | Keep                   |
| ingest-bundle              | Data import          | Active      | Keep                   |
| jobs/enqueue               | Job queue            | Stub        | **Complete or Delete** |
| metrics/\*                 | Observability        | Active      | Keep                   |
| rabbit-hole/evidence-pack  | Provenance           | Unused?     | **Audit**              |
| rabbit-hole/hostile-speech | Speech report        | Unused?     | **Audit**              |
| rabbit-hole/timeline       | Timeline             | Duplicate   | **Delete**             |
| relationship-delete        | Admin delete         | Active      | Keep                   |
| research/biographical      | Bio analysis         | Active      | Keep                   |
| research/entity            | Universal research   | Active      | Keep                   |
| research/import-bundle     | Validation           | Deprecated  | **Delete**             |
| research/merge             | Merge to Neo4j       | Active      | Keep                   |
| research/person            | Person research      | Redundant   | **Consolidate**        |
| research/relationships     | Rel analysis         | Specialized | Keep                   |
| research/report            | Report gen           | Active      | Keep                   |
| share/\*                   | Share system         | Active      | Keep                   |
| system/integrity-check     | Data validation      | Active      | Keep                   |
| unified-entity-research    | Research             | Unused?     | **Audit**              |
| user/stats                 | User tracking        | Active      | Keep                   |
| v1/tenant/\*               | Multi-tenancy        | Active      | Keep                   |
| webhooks/clerk             | Org lifecycle        | Active      | Keep                   |
| workspaces/draft/\*        | Draft system         | Active      | Keep                   |

---

**End of Audit Report**
