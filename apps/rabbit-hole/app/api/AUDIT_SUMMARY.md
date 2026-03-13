# API Audit Summary

**Quick Reference for Decision Making**

---

## Critical Issues (Fix Immediately)

### 🔴 Broken References - 3 Endpoints Called But Don't Exist

1. **`/api/entity-research-agent`** ← Called by `AddEntityForm.tsx:181`
   - Fix: Change to `/api/research/entity`
2. **`/api/waitlist`** ← Called by `waitlist/page.tsx:31`
   - Fix: Create endpoint OR remove waitlist feature
3. **`/api/evidence-v2/[id]`** ← Called by `FloatingDetailsPanel.tsx:616`
   - Fix: Change to `/api/evidence/[id]` (which exists)

---

## Quick Wins (30 minutes total)

### Delete These (Already Deprecated)

```bash
# 1. Pure redirect wrapper (118 lines)
rm -rf app/api/entity

# 2. Deprecated validation endpoint (187 lines)
rm -rf app/api/research/import-bundle

# 3. Duplicate timeline endpoint (207 lines)
rm -rf app/api/rabbit-hole/timeline

# Update 1 file:
# app/atlas/services/AtlasApiService.ts line 228
# Change: /api/rabbit-hole/timeline/${entityId}
# To: /api/entity-timeline/${entityId}
```

**Total Impact:** -512 lines, 3 endpoints removed, 1 file updated

---

## Research Consolidation (2 hours)

### Problem

4 endpoints doing similar entity research:

- `/api/research/entity` ✅ Universal, keep
- `/api/research/person` ❌ Subset of entity
- `/api/unified-entity-research` ❌ Attempt to consolidate (unused)
- `/api/entity-research-agent` ❌ Doesn't exist!

### Solution

```bash
# Delete redundant
rm -rf app/api/research/person
rm -rf app/api/unified-entity-research

# Update consumers
# AddEntityForm already needs this fix (see broken references)
```

**Impact:** -586 lines, 2 endpoints removed

---

## Audit Needed (Check Usage)

These may be unused - verify before deleting:

```bash
# Check each one
grep -r "graph-batch" app/              # No matches found
grep -r "geographic-entities" app/      # Commented out
grep -r "rabbit-hole/evidence-pack" app/ # No matches found
grep -r "rabbit-hole/hostile-speech" app/ # No matches found

# If confirmed unused, delete:
rm -rf app/api/graph-batch
rm -rf app/api/geographic-entities
rm -rf app/api/rabbit-hole/evidence-pack
rm -rf app/api/rabbit-hole/hostile-speech
```

**Potential Impact:** -1,200 lines, 4 endpoints removed (if truly unused)

---

## Stubs to Complete or Remove

### 1. Jobs Enqueue

**File:** `app/api/jobs/enqueue/route.ts`  
**Status:** Returns mock job IDs, doesn't actually enqueue  
**Used by:** `file-upload-service.ts:377`

**Options:**

- A) Implement PostgreSQL/Redis job queue (~4 hours)
- B) Remove stub and job enqueueing call (~15 minutes)

**Recommendation:** Remove for now (Option B). File upload works without it.

### 2. Preview PNG Generation

**File:** `app/api/share/[token]/preview.png/route.ts`  
**Status:** Returns SVG, not PNG  
**Used by:** Social sharing meta tags

**Options:**

- A) Implement with sharp/canvas (~2 hours)
- B) Keep SVG approach, rename endpoint (~5 minutes)

**Recommendation:** SVG works for Open Graph, rename to preview.svg

---

## Organization Improvements (Future)

### Current: Flat structure with 69 files

```
app/api/
  atlas/
  atlas-crud/
  atlas-details/
  collaboration/
  copilotkit/
  entities/
  entity/
  entity-delete/
  entity-matches/
  entity-merge/
  entity-relationships/
  entity-search/
  entity-timeline/
  entity-v2/
  evidence/
  ... (54 more)
```

### Proposed: Domain-grouped under v1/

```
app/api/v1/
  atlas/          (graph-payload, crud, details)
  entities/       (search, matches, merge, delete, relationships, timeline, management)
  files/          (all file endpoints)
  research/       (entity, biographical, report, merge)
  graph/          (tiles/*, batch)
  share/          (all share endpoints)
  collaboration/  (existing)
  tenant/         (existing)
  webhooks/       (existing)
  system/         (existing)
```

**Benefits:**

- Clearer API surface
- Easier versioning (v1, v2)
- Better discoverability
- Matches REST best practices

**Effort:** 6-8 hours  
**Priority:** Low (organizational only)

---

## Immediate Action Checklist

Copy this to execute the quick wins:

```bash
# === PHASE 1: FIX BROKEN REFERENCES (5 min) ===

# 1. Fix AddEntityForm
# File: app/evidence/components/atlas/AddEntityForm.tsx
# Line 181: /api/entity-research-agent → /api/research/entity

# 2. Fix FloatingDetailsPanel
# File: app/evidence/components/atlas/FloatingDetailsPanel.tsx
# Line 616: /api/evidence-v2/${evidenceId} → /api/evidence/${evidenceId}

# 3. Create waitlist endpoint OR remove feature
# File: app/waitlist/page.tsx
# Option A: Create app/api/waitlist/route.ts
# Option B: Remove waitlist feature


# === PHASE 2: DELETE DEPRECATED (5 min) ===

rm -rf app/api/entity
rm -rf app/api/research/import-bundle


# === PHASE 3: FIX DUPLICATE TIMELINE (5 min) ===

# Update AtlasApiService.tsx line 228
# Then delete duplicate
rm -rf app/api/rabbit-hole/timeline


# === RUN TESTS ===
pnpm test


# === COMMIT ===
git add -A
git commit -m "API cleanup: Fix broken refs, remove deprecated endpoints"
```

**Total Time:** 15-20 minutes  
**Impact:** Fix 3 bugs, remove 3 deprecated endpoints, -512 lines

---

## Recommended Order of Execution

1. **Fix broken references first** (prevents errors)
2. **Delete clearly deprecated** (easy wins)
3. **Audit unused endpoints** (gather data)
4. **Consolidate research** (once audit complete)
5. **Complete or remove stubs** (feature decisions needed)
6. **Reorganize structure** (nice-to-have)

---

## Questions to Answer Before Proceeding

1. **Waitlist feature** - Keep or remove?
2. **Job processing** - Implement now or later?
3. **Evidence-v2** - Create new endpoint or fix reference?
4. **Rabbit-hole namespace** - Are these for external API consumers?
5. **Geographic entities** - Revive map feature or remove?

---

**Next Step:** Review this summary, make decisions on questions above, then execute Phase 1-3 of the action checklist (15-20 minutes total).
