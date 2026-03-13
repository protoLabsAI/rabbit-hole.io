#!/bin/sh

# Quick dependency validation helper
# Checks if package.json dependencies match actual imports

set -e

STAGED_FILES=$(git diff --cached --name-only | grep "^packages/.*/src/.*\.tsx\?$" || true)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

echo "🔍 Validating package dependencies..."

# Extract package directories that changed
CHANGED_PKG_DIRS=$(echo "$STAGED_FILES" | cut -d/ -f1-2 | sort -u)

for PKG_DIR in $CHANGED_PKG_DIRS; do
  PKG_NAME=$(node -p "require('./$PKG_DIR/package.json').name" 2>/dev/null || echo "unknown")
  
  if [ "$PKG_NAME" = "unknown" ]; then
    continue
  fi
  
  # Get only staged files for this package
  PKG_STAGED_FILES=$(echo "$STAGED_FILES" | grep "^$PKG_DIR/src/" || true)
  
  if [ -z "$PKG_STAGED_FILES" ]; then
    continue
  fi
  
  # Find @proto/ imports in staged content only (not working directory)
  # Updated regex to capture full nested paths like @proto/auth/ui
  IMPORTS=$(echo "$PKG_STAGED_FILES" | while read -r file; do
    git show ":$file" 2>/dev/null | grep -h "from ['\"]@proto/" || true
  done | sed -E "s/.*from ['\"](@proto\/[^'\"]+).*/\1/" | sort -u || true)
  
  if [ -z "$IMPORTS" ]; then
    continue
  fi
  
  # Check if each import is in dependencies or peerDependencies
  HAS_MISSING=false
  for IMPORT in $IMPORTS; do
    # Skip self-imports
    if [ "$IMPORT" = "$PKG_NAME" ]; then
      continue
    fi
    
    # Check if in package.json
    # For subpath imports like @proto/llm-providers/server, check the base package
    HAS_DEP=$(node -p "
      const pkg = require('./$PKG_DIR/package.json');
      const deps = { ...pkg.dependencies, ...pkg.peerDependencies };
      const importPath = '$IMPORT';
      
      // Check exact match first
      if (deps[importPath]) {
        'yes';
      } else {
        // Check if this is a subpath import (e.g., @proto/llm-providers/server)
        // Extract base package: @scope/package/subpath -> @scope/package
        const match = importPath.match(/^(@[^/]+\/[^/]+)/);
        if (match && deps[match[1]]) {
          'yes';
        } else {
          'no';
        }
      }
    " 2>/dev/null || echo "no")
    
    if [ "$HAS_DEP" = "no" ]; then
      # Print warning immediately for this specific import
      if [ "$HAS_MISSING" = "false" ]; then
        echo ""
        echo "⚠️  Warning: $PKG_NAME may be missing dependencies:"
        HAS_MISSING=true
      fi
      echo "  • $IMPORT"
      echo "    → Add to $PKG_DIR/package.json: \"$IMPORT\": \"workspace:*\""
    fi
  done
  
  if [ "$HAS_MISSING" = "true" ]; then
    echo ""
    echo "⏭️  Continuing (full check runs in pre-push)..."
  fi
done

exit 0

