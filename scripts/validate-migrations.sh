#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MIGRATIONS_DIR="${PROJECT_ROOT}/migrations/postgresql"

errors=0
warnings=0

echo -e "${BLUE}🔍 Validating PostgreSQL migrations...${NC}\n"

# =============================================================================
# 1. ShellCheck - Validate Shell Scripts
# =============================================================================
echo -e "${BLUE}1️⃣  Running ShellCheck on migration scripts...${NC}"

SHELL_SCRIPTS=$(find "${MIGRATIONS_DIR}" -name "*.sh" 2>/dev/null || true)

if [ -z "$SHELL_SCRIPTS" ]; then
    echo -e "${YELLOW}⚠️  No shell scripts found in migrations${NC}"
else
    # Check if shellcheck is installed
    if command -v shellcheck &> /dev/null; then
        shellcheck_failed=0
        for script in $SHELL_SCRIPTS; do
            script_name=$(basename "$script")
            if shellcheck "$script"; then
                echo -e "${GREEN}✅ ${script_name}${NC}"
            else
                echo -e "${RED}❌ ${script_name} failed ShellCheck${NC}"
                ((errors++))
                shellcheck_failed=1
            fi
        done
        
        if [ $shellcheck_failed -eq 0 ]; then
            echo -e "${GREEN}✅ All shell scripts pass ShellCheck${NC}\n"
        fi
    else
        echo -e "${YELLOW}⚠️  ShellCheck not installed - using Docker${NC}"
        
        shellcheck_failed=0
        for script in $SHELL_SCRIPTS; do
            script_name=$(basename "$script")
            if docker run --rm -v "${PROJECT_ROOT}:/mnt" koalaman/shellcheck:stable "/mnt/migrations/postgresql/${script_name}"; then
                echo -e "${GREEN}✅ ${script_name}${NC}"
            else
                echo -e "${RED}❌ ${script_name} failed ShellCheck${NC}"
                ((errors++))
                shellcheck_failed=1
            fi
        done
        
        if [ $shellcheck_failed -eq 0 ]; then
            echo -e "${GREEN}✅ All shell scripts pass ShellCheck${NC}\n"
        fi
    fi
fi

# =============================================================================
# 2. SQL Syntax Validation - Check for Common Issues
# =============================================================================
echo -e "${BLUE}2️⃣  Checking SQL syntax patterns...${NC}"

# Check for RAISE statements outside DO blocks
echo "Checking for RAISE statements outside DO blocks..."
raise_errors=0

for file in "${MIGRATIONS_DIR}"/*.sh "${MIGRATIONS_DIR}"/*.sql*; do
    [ -f "$file" ] 2>/dev/null || continue
    
    file_name=$(basename "$file")
    
    # Extract SQL content (between <<-EOSQL and EOSQL for .sh files, entire file for .sql)
    if [[ "$file" == *.sh ]]; then
        # Extract content between EOSQL markers
        sql_content=$(sed -n '/<<-EOSQL/,/^EOSQL/p' "$file" | sed '1d;$d')
    else
        sql_content=$(cat "$file")
    fi
    
    # Check for RAISE statements that are NOT inside DO blocks
    # This is a simplified check - looks for RAISE NOTICE at start of line (possibly with whitespace)
    # that's not preceded by a DO $$ BEGIN within a reasonable distance
    
    line_num=0
    in_do_block=0
    do_depth=0
    
    while IFS= read -r line; do
        ((line_num++))
        
        # Track DO blocks - match "DO $$" with optional leading whitespace
        # Handles both literal $$ and escaped \$\$ from heredoc syntax variations
        if echo "$line" | grep -qE '^\s*DO\s+(\\\$\\\$|\$\$)'; then
            ((do_depth++))
            in_do_block=1
        fi
        
        if echo "$line" | grep -qE '^\s*END\s+(\\\$\\\$|\$\$);'; then
            ((do_depth--))
            if [ $do_depth -le 0 ]; then
                in_do_block=0
                do_depth=0
            fi
        fi
        
        # Check for RAISE statements outside DO blocks
        if echo "$line" | grep -qE '^\s*RAISE\s+(NOTICE|WARNING|EXCEPTION|INFO|LOG|DEBUG)' && [ $in_do_block -eq 0 ]; then
            echo -e "${RED}❌ ${file_name}:${line_num} - RAISE statement outside DO block${NC}"
            echo -e "   ${YELLOW}Found: $(echo "$line" | xargs)${NC}"
            echo -e "   ${YELLOW}Fix: Wrap in DO \$\$ BEGIN ... END \$\$;${NC}"
            ((errors++))
            raise_errors=1
        fi
    done <<< "$sql_content"
done

if [ $raise_errors -eq 0 ]; then
    echo -e "${GREEN}✅ No RAISE statements outside DO blocks${NC}\n"
fi

# =============================================================================
# 3. Check for Common PostgreSQL Syntax Issues
# =============================================================================
echo -e "${BLUE}3️⃣  Checking for common PostgreSQL issues...${NC}"

syntax_errors=0

for file in "${MIGRATIONS_DIR}"/*.sh "${MIGRATIONS_DIR}"/*.sql*; do
    [ -f "$file" ] 2>/dev/null || continue
    
    file_name=$(basename "$file")
    
    # Skip disabled files
    if [[ "$file_name" == *.disabled ]]; then
        continue
    fi
    
    # Extract SQL content
    if [[ "$file" == *.sh ]]; then
        sql_content=$(sed -n '/<<-EOSQL/,/^EOSQL/p' "$file" | sed '1d;$d')
    else
        sql_content=$(cat "$file")
    fi
    
    # Check for common issues:
    
    # 1. Unmatched dollar signs in strings (but not in valid $$ blocks)
    # First grep finds potential dollar quotes, second filters out valid patterns
    if echo "$sql_content" | grep -E '\$[^$\s]+\$' | grep -qvE '\$\$|::\$'; then
        echo -e "${YELLOW}⚠️  ${file_name} - Potential unmatched dollar quotes${NC}"
        ((warnings++))
    fi
    
    # 2. Missing semicolons after CREATE statements
    if echo "$sql_content" | grep -qE 'CREATE\s+(TABLE|INDEX|FUNCTION|TRIGGER)[^;]*$'; then
        echo -e "${YELLOW}⚠️  ${file_name} - Potential missing semicolon after CREATE statement${NC}"
        ((warnings++))
    fi
    
    # 3. Using COMMENT without proper quoting
    # Two-stage: find COMMENT ON statements, then check they have IS 'quoted text'
    if echo "$sql_content" | grep -E "COMMENT ON" | grep -qvE "IS\s+'"; then
        echo -e "${YELLOW}⚠️  ${file_name} - COMMENT ON should use single quotes${NC}"
        ((warnings++))
    fi
done

if [ $syntax_errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}✅ No common syntax issues found${NC}\n"
fi

# =============================================================================
# 4. Validate SQL with PostgreSQL (if available)
# =============================================================================
echo -e "${BLUE}4️⃣  Validating SQL syntax with PostgreSQL...${NC}"

if command -v psql &> /dev/null; then
    echo "PostgreSQL client found - performing syntax validation..."
    
    # Try to connect to a PostgreSQL instance
    if psql -U postgres -d postgres -c "SELECT 1" &> /dev/null 2>&1; then
        sql_validation_errors=0
        
        for file in "${MIGRATIONS_DIR}"/*.sql*; do
            [ -f "$file" ] 2>/dev/null || continue
            
            # Skip disabled files
            if [[ "$(basename "$file")" == *.disabled ]]; then
                continue
            fi
            
            file_name=$(basename "$file")
            
            # Use pg_syntax_check if available, otherwise skip
            # Note: --dry-run doesn't exist, we'd need a temp database for real validation
            echo -e "${BLUE}  Skipping deep validation for ${file_name} (requires test database)${NC}"
        done
    else
        echo -e "${YELLOW}⚠️  PostgreSQL not running - skipping deep validation${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  PostgreSQL client not installed - skipping SQL validation${NC}"
    echo -e "${YELLOW}   Install with: brew install postgresql${NC}"
fi

echo ""

# =============================================================================
# Summary
# =============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}         Validation Summary${NC}"
echo -e "${BLUE}========================================${NC}"

if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}✅ All migrations validated successfully!${NC}"
    exit 0
elif [ $errors -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Validation completed with ${warnings} warning(s)${NC}"
    exit 0
else
    echo -e "${RED}❌ Validation failed with ${errors} error(s) and ${warnings} warning(s)${NC}"
    echo -e "${RED}Please fix the issues above before committing${NC}"
    exit 1
fi

