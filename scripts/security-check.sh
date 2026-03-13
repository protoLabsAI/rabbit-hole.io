#!/bin/bash

# Security Check Script for Rabbit Hole Development
# Validates security headers, dependencies, and configurations

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_security_headers() {
    log_info "Checking security headers..."
    
    local failed=0
    local url="http://localhost:3000"
    
    # Check if development server is running
    if ! curl -f -s "$url/api/health" > /dev/null 2>&1; then
        log_error "Development server not running at $url"
        log_info "Run 'pnpm dev' or './scripts/dev-setup.sh' first"
        return 1
    fi
    
    # Test security headers
    local headers_response=$(curl -s -I "$url" 2>/dev/null)
    
    # Required security headers
    local required_headers=(
        "X-Frame-Options"
        "X-Content-Type-Options"
        "Referrer-Policy"
        "Content-Security-Policy"
        "Permissions-Policy"
    )
    
    for header in "${required_headers[@]}"; do
        if echo "$headers_response" | grep -qi "$header"; then
            log_success "✓ $header present"
        else
            log_error "✗ $header missing"
            failed=1
        fi
    done
    
    # Check that X-Powered-By is NOT present (security)
    if echo "$headers_response" | grep -qi "X-Powered-By"; then
        log_warning "X-Powered-By header detected (should be disabled)"
        failed=1
    else
        log_success "✓ X-Powered-By header properly disabled"
    fi
    
    if [ $failed -eq 0 ]; then
        log_success "Security headers validation passed"
    else
        log_error "Security headers validation failed"
        return 1
    fi
}

check_api_security() {
    log_info "Checking API endpoint security..."
    
    local failed=0
    local api_url="http://localhost:3000/api/health"
    
    # Test API security headers
    local api_response=$(curl -s -I "$api_url" 2>/dev/null)
    
    # API-specific security headers
    if echo "$api_response" | grep -qi "Cache-Control.*no-cache"; then
        log_success "✓ API Cache-Control properly configured"
    else
        log_warning "API Cache-Control not optimal"
        failed=1
    fi
    
    # Check that API returns JSON content type
    if echo "$api_response" | grep -qi "Content-Type.*application/json"; then
        log_success "✓ API Content-Type properly set"
    else
        log_warning "API Content-Type not optimal"
    fi
    
    if [ $failed -eq 0 ]; then
        log_success "API security validation passed"
    else
        log_warning "API security validation has warnings"
    fi
}

check_typescript_config() {
    log_info "Checking TypeScript security configuration..."
    
    local failed=0
    
    # Check if strict mode is enabled
    if grep -q '"strict": true' "$PROJECT_ROOT/tsconfig.json"; then
        log_success "✓ TypeScript strict mode enabled"
    else
        log_error "✗ TypeScript strict mode disabled"
        failed=1
    fi
    
    # Check for secure module resolution
    if grep -q '"moduleResolution": "bundler"' "$PROJECT_ROOT/tsconfig.json"; then
        log_success "✓ Modern module resolution configured"
    else
        log_warning "Consider updating module resolution"
    fi
    
    if [ $failed -eq 0 ]; then
        log_success "TypeScript configuration validation passed"
    else
        log_error "TypeScript configuration needs attention"
        return 1
    fi
}

check_dependencies() {
    log_info "Checking for security vulnerabilities in dependencies..."
    
    cd "$PROJECT_ROOT"
    
    # Run security audit
    if pnpm audit --audit-level moderate 2>/dev/null; then
        log_success "✓ No moderate+ security vulnerabilities found"
    else
        log_warning "Security vulnerabilities detected - review with 'pnpm audit'"
    fi
    
    # Check for outdated packages
    log_info "Checking for outdated packages..."
    if command -v jq &> /dev/null; then
        local outdated_count=$(pnpm outdated --format=json 2>/dev/null | jq 'length // 0')
        if [ "$outdated_count" -eq 0 ]; then
            log_success "✓ All packages up to date"
        else
            log_warning "$outdated_count packages are outdated"
        fi
    else
        log_info "Install jq for detailed package analysis"
    fi
}

check_production_readiness() {
    log_info "Checking production readiness..."
    
    local failed=0
    
    # Check if telemetry is disabled
    if grep -q 'telemetry: false' "$PROJECT_ROOT/next.config.js"; then
        log_success "✓ Next.js telemetry disabled"
    else
        log_warning "Next.js telemetry not explicitly disabled"
    fi
    
    # Check if console.log removal is configured
    if grep -q 'removeConsole.*production' "$PROJECT_ROOT/next.config.js"; then
        log_success "✓ Console removal configured for production"
    else
        log_warning "Console removal not configured"
    fi
    
    # Check if source maps are disabled for production
    if grep -q 'productionBrowserSourceMaps.*false' "$PROJECT_ROOT/next.config.js"; then
        log_success "✓ Production source maps disabled"
    else
        log_warning "Production source maps not disabled"
    fi
    
    if [ $failed -eq 0 ]; then
        log_success "Production readiness validation passed"
    else
        log_warning "Production readiness has issues"
    fi
}

run_type_check() {
    log_info "Running TypeScript type checking..."
    
    cd "$PROJECT_ROOT"
    
    if pnpm run type-check 2>/dev/null; then
        log_success "✓ TypeScript compilation successful"
    else
        log_error "TypeScript compilation failed"
        log_info "Run 'pnpm run type-check' for details"
        return 1
    fi
}

# Main security check flow
main() {
    log_info "Starting security and production readiness check..."
    
    check_security_headers || log_warning "Security headers check failed"
    check_api_security
    check_typescript_config || log_warning "TypeScript config check failed"
    check_dependencies
    check_production_readiness
    run_type_check || log_warning "Type check failed"
    
    log_success "Security check completed!"
    log_info "Review any warnings above for production deployment"
}

# Run with error handling
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
