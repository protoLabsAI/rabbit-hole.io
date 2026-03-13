#!/bin/bash

# ESM-Only Migration Script
# Automates the bulk of the migration to ESM-only builds
# 
# Usage: ./scripts/migrate-to-esm-only.sh
# 
# This script:
# 1. Updates all tsup.config.ts files to ESM-only
# 2. Updates all package.json exports to remove CJS
# 3. Adds "type": "module" where missing
# 4. Cleans and rebuilds all packages
# 5. Runs validation checks

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== ESM-Only Migration Script ===${NC}\n"

# Confirm before proceeding
echo -e "${YELLOW}This script will modify 42+ files in the monorepo.${NC}"
echo -e "${YELLOW}Make sure you have committed all changes and are on a feature branch.${NC}\n"
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Get the repo root
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo -e "\n${GREEN}Step 1: Update tsup.config.ts files${NC}"
# Find all tsup.config.ts files and update format
find packages -name "tsup.config.ts" -type f | while read -r file; do
    if grep -q 'format: \["cjs", "esm"\]' "$file"; then
        sed -i '' 's/format: \["cjs", "esm"\]/format: ["esm"]/g' "$file"
        echo "  ✓ Updated $file"
    else
        echo "  - Skipped $file (already ESM-only or different format)"
    fi
done

# Update templates
if [ -f "packages/cli/templates/package-template/tsup.config.ts.template" ]; then
    sed -i '' 's/format: \["cjs", "esm"\]/format: ["esm"]/g' \
        "packages/cli/templates/package-template/tsup.config.ts.template"
    echo "  ✓ Updated template tsup.config.ts"
fi

echo -e "\n${GREEN}Step 2: Update package.json files${NC}"
echo -e "${YELLOW}NOTE: This step requires manual review of package.json exports.${NC}"
echo -e "${YELLOW}Automated JSON manipulation is risky. Please update manually:${NC}\n"

find packages -name "package.json" -maxdepth 2 -type f | while read -r file; do
    # Check if already has "type": "module"
    if grep -q '"type": "module"' "$file"; then
        echo "  - $file already has type: module"
    else
        echo -e "  ${YELLOW}TODO: Add 'type: module' to $file${NC}"
    fi
    
    # Check for CJS exports
    if grep -q '"require":' "$file"; then
        echo -e "  ${YELLOW}TODO: Remove 'require' exports from $file${NC}"
    fi
    
    # Check for .mjs references
    if grep -q '\.mjs"' "$file"; then
        echo -e "  ${YELLOW}TODO: Change .mjs to .js in $file${NC}"
    fi
done

echo -e "\n${YELLOW}Manual package.json updates needed:${NC}"
echo "  1. Add '\"type\": \"module\"' if missing"
echo "  2. Remove '\"require\"' from exports"
echo "  3. Change '\"import\": \"./dist/index.mjs\"' to '\"import\": \"./dist/index.js\"'"
echo "  4. Remove '\"module\"' field (redundant with type: module)"
echo ""
read -p "Have you completed manual package.json updates? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborting. Please complete manual updates and re-run this script.${NC}"
    exit 1
fi

echo -e "\n${GREEN}Step 3: Clean all build artifacts${NC}"
echo "  Cleaning dist/ directories..."
find packages -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
find packages -name "*.tsbuildinfo" -type f -delete
echo "  ✓ Cleaned"

echo -e "\n${GREEN}Step 4: Rebuild all packages${NC}"
pnpm run build:libs

echo -e "\n${GREEN}Step 5: Type check all packages${NC}"
pnpm run type-check:packages

echo -e "\n${GREEN}Step 6: Validation checks${NC}"

# Check for remaining CJS artifacts
echo "  Checking for .cjs files..."
CJS_FILES=$(find packages -name "*.cjs" -type f 2>/dev/null | wc -l)
if [ "$CJS_FILES" -gt 0 ]; then
    echo -e "  ${RED}✗ Found $CJS_FILES .cjs files (should be 0)${NC}"
    find packages -name "*.cjs" -type f
    exit 1
else
    echo -e "  ${GREEN}✓ No .cjs files found${NC}"
fi

# Check for remaining .mjs files (should only be in dist/)
echo "  Checking for .mjs files..."
MJS_FILES=$(find packages -name "*.mjs" -type f 2>/dev/null | wc -l)
if [ "$MJS_FILES" -gt 0 ]; then
    echo -e "  ${RED}✗ Found $MJS_FILES .mjs files (should be 0)${NC}"
    find packages -name "*.mjs" -type f
    exit 1
else
    echo -e "  ${GREEN}✓ No .mjs files found${NC}"
fi

# Check that all packages have "type": "module"
echo "  Checking for 'type: module' in package.json..."
MISSING_TYPE=0
find packages -name "package.json" -maxdepth 2 -type f | while read -r file; do
    if ! grep -q '"type": "module"' "$file"; then
        echo -e "  ${RED}✗ Missing 'type: module' in $file${NC}"
        MISSING_TYPE=$((MISSING_TYPE + 1))
    fi
done
if [ "$MISSING_TYPE" -eq 0 ]; then
    echo -e "  ${GREEN}✓ All packages have 'type: module'${NC}"
fi

# Check that no package.json still references .mjs
echo "  Checking for .mjs references in package.json..."
MJS_REFS=$(find packages -name "package.json" -maxdepth 2 -type f -exec grep -l '\.mjs"' {} \; 2>/dev/null | wc -l)
if [ "$MJS_REFS" -gt 0 ]; then
    echo -e "  ${RED}✗ Found $MJS_REFS package.json files with .mjs references${NC}"
    find packages -name "package.json" -maxdepth 2 -type f -exec grep -l '\.mjs"' {} \;
    exit 1
else
    echo -e "  ${GREEN}✓ No .mjs references in package.json files${NC}"
fi

echo -e "\n${GREEN}=== Migration Complete! ===${NC}\n"
echo "Next steps:"
echo "  1. Test Next.js app: cd apps/rabbit-hole && pnpm run build"
echo "  2. Test services: cd agent && pnpm run build"
echo "  3. Run full test suite: pnpm run test"
echo "  4. Commit changes: git add -A && git commit -m 'perf: migrate to ESM-only builds'"
echo "  5. Push and create PR"
echo ""
echo -e "${YELLOW}See handoffs/2025-01-esm-only-migration.md for full details${NC}"

