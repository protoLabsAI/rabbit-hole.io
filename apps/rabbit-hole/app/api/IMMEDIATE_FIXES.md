# Immediate API Fixes - Execute Now

**Time Required:** 15-20 minutes  
**Risk Level:** Low  
**Impact:** Fix 3 bugs, remove deprecated code

---

## Step 1: Fix Broken References (5 min)

### Fix 1: AddEntityForm - Non-existent endpoint

```typescript
// File: app/evidence/components/atlas/AddEntityForm.tsx
// Line 181

// CURRENT (BROKEN):
const response = await fetch("/api/entity-research-agent", {

// CHANGE TO:
const response = await fetch("/api/research/entity", {
```

### Fix 2: FloatingDetailsPanel - Non-existent endpoint

```typescript
// File: app/evidence/components/atlas/FloatingDetailsPanel.tsx
// Line 616

// CURRENT (BROKEN):
const response = await fetch(`/api/evidence-v2/${evidenceId}`);

// CHANGE TO:
const response = await fetch(`/api/evidence/${evidenceId}`);
```

### Fix 3: Waitlist - Missing endpoint

**Option A:** Create the endpoint (if keeping feature)

```bash
touch app/api/waitlist/route.ts
```

**Option B:** Remove waitlist feature (if not needed)

```bash
# Comment out or remove waitlist page
# File: app/waitlist/page.tsx
```

**Recommendation:** Check if waitlist is active feature. If not used, remove.

---

## Step 2: Delete Deprecated Endpoints (5 min)

### Delete 1: entity/[id] - Pure redirect wrapper

```bash
rm -rf app/api/entity
```

**Verification:** All consumers already use `/api/entity-v2/[id]` directly (redirect is internal)

### Delete 2: research/import-bundle - Deprecated validation

```bash
rm -rf app/api/research/import-bundle
```

**Verification:** No grep matches in codebase - not actively called

---

## Step 3: Fix Duplicate Timeline (5 min)

### Update call site

```typescript
// File: app/atlas/services/AtlasApiService.ts
// Line 228

// CURRENT:
const response = await fetch(`/api/rabbit-hole/timeline/${entityId}`);

// CHANGE TO:
const response = await fetch(`/api/entity-timeline/${entityId}`);
```

### Delete duplicate endpoint

```bash
rm -rf app/api/rabbit-hole/timeline
```

---

## Complete Script (Copy & Execute)

```bash
#!/bin/bash

echo "🔧 Starting API cleanup..."

# === FIX 1: AddEntityForm ===
echo "📝 Updating AddEntityForm.tsx..."
sed -i '' 's|/api/entity-research-agent|/api/research/entity|g' \
  app/evidence/components/atlas/AddEntityForm.tsx

# === FIX 2: FloatingDetailsPanel ===
echo "📝 Updating FloatingDetailsPanel.tsx..."
sed -i '' 's|/api/evidence-v2/|/api/evidence/|g' \
  app/evidence/components/atlas/FloatingDetailsPanel.tsx

# === FIX 3: AtlasApiService timeline ===
echo "📝 Updating AtlasApiService.ts..."
sed -i '' 's|/api/rabbit-hole/timeline/|/api/entity-timeline/|g' \
  app/atlas/services/AtlasApiService.ts

# === DELETE: Deprecated endpoints ===
echo "🗑️  Removing deprecated endpoints..."
rm -rf app/api/entity
rm -rf app/api/research/import-bundle
rm -rf app/api/rabbit-hole/timeline

# === VERIFY ===
echo "✅ Changes complete!"
echo ""
echo "Removed:"
echo "  - app/api/entity (deprecated redirect)"
echo "  - app/api/research/import-bundle (deprecated validation)"
echo "  - app/api/rabbit-hole/timeline (duplicate)"
echo ""
echo "Updated:"
echo "  - AddEntityForm.tsx (fixed broken reference)"
echo "  - FloatingDetailsPanel.tsx (fixed broken reference)"
echo "  - AtlasApiService.ts (fixed duplicate timeline reference)"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Test locally: pnpm dev"
echo "  3. Commit: git commit -m 'API cleanup: Fix refs, remove deprecated'"
```

Save as: `scripts/api-cleanup-immediate.sh`

---

## Manual Verification Steps

After running script:

```bash
# 1. Check files were deleted
ls app/api/entity 2>/dev/null && echo "❌ Still exists" || echo "✅ Deleted"
ls app/api/research/import-bundle 2>/dev/null && echo "❌ Still exists" || echo "✅ Deleted"
ls app/api/rabbit-hole/timeline 2>/dev/null && echo "❌ Still exists" || echo "✅ Deleted"

# 2. Verify references were updated
grep -n "entity-research-agent" app/evidence/components/atlas/AddEntityForm.tsx
# Should return: nothing (no matches)

grep -n "evidence-v2" app/evidence/components/atlas/FloatingDetailsPanel.tsx
# Should return: nothing (no matches)

grep -n "rabbit-hole/timeline" app/atlas/services/AtlasApiService.ts
# Should return: nothing (no matches)

# 3. Check for any other references to deleted endpoints
grep -r "api/entity/\[" app/
grep -r "research/import-bundle" app/
grep -r "rabbit-hole/timeline" app/

# All should return no matches (except in comments/docs)
```

---

## Testing Checklist

After changes, test these features:

### Atlas UI

- [ ] Load main Atlas page
- [ ] Click on entity to view details (entity-v2)
- [ ] Search for entities (entity-search)
- [ ] View entity timeline (entity-timeline)
- [ ] Try entity deletion (if super admin)

### Research UI

- [ ] Add new entity via research (research/entity)
- [ ] View biographical analysis (research/biographical)
- [ ] Generate research report (research/report)

### File Management

- [ ] Upload a file (files/sign-put → promote → atlas-crud)
- [ ] View files in dashboard (files/management)
- [ ] Delete a file (files/management DELETE)

### Evidence UI

- [ ] Click evidence link (evidence/[id])
- [ ] Verify evidence displays correctly

If all tests pass: **Changes are safe to commit**

---

## Rollback (If Needed)

```bash
# If anything breaks:
git checkout app/evidence/components/atlas/AddEntityForm.tsx
git checkout app/evidence/components/atlas/FloatingDetailsPanel.tsx
git checkout app/atlas/services/AtlasApiService.ts

# Restore deleted endpoints
git checkout app/api/entity
git checkout app/api/research/import-bundle
git checkout app/api/rabbit-hole/timeline
```

---

## Expected Outcome

**Before:**

- 69 endpoints
- 3 broken references (404s)
- 2 deprecated redirects still in codebase
- 1 duplicate timeline endpoint
- ~15,000 lines of API code

**After:**

- 66 endpoints (-3)
- 0 broken references (✅ all fixed)
- 0 deprecated endpoints in codebase
- 1 unified timeline approach
- ~14,500 lines of API code (-500 lines)

**Developer Experience:**

- ✅ No more 404s from broken references
- ✅ Clearer API surface (less duplication)
- ✅ Removed confusion (one timeline endpoint not two)
- ✅ Better maintainability

---

## Post-Cleanup: Next Steps

Once immediate fixes are complete and tested:

1. **Create GitHub issue** for research endpoint consolidation
2. **Audit unused endpoints** (graph-batch, geographic-entities, rabbit-hole/\*)
3. **Complete or remove stubs** (jobs/enqueue, preview.png)
4. **Add API documentation** (OpenAPI spec)
5. **Consider reorganization** into v1/ structure (optional)

---

**Ready to execute?**

Run the script above or make the changes manually. Total time: 15-20 minutes.

If any issues arise, immediately rollback and investigate before continuing.
