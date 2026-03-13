#!/bin/bash

# Privacy-Focused Deployment Script for Rabbit Hole
# Implements complete OPSEC compliance with maximum anonymity

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
ENV_FILE="$PROJECT_ROOT/.env.privacy"
SECRETS_DIR="$PROJECT_ROOT/secrets"
TRAEFIK_DIR="$PROJECT_ROOT/traefik"
MONITORING_DIR="$PROJECT_ROOT/monitoring"

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

check_requirements() {
    log_info "Checking deployment requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check environment file
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        log_info "Copy env.privacy.example to .env.privacy and configure it"
        exit 1
    fi
    
    # Check encrypted storage
    if [ ! -d "/encrypted" ]; then
        log_error "Encrypted storage directory /encrypted not found"
        log_info "Run setup-encrypted-storage.sh first"
        exit 1
    fi
    
    log_success "All requirements met"
}

generate_secrets() {
    log_info "Generating secrets..."
    
    mkdir -p "$SECRETS_DIR"
    chmod 700 "$SECRETS_DIR"
    
    # Generate random passwords if secrets don't exist
    if [ ! -f "$SECRETS_DIR/neo4j_password.txt" ]; then
        openssl rand -base64 64 | tr -d '\n' > "$SECRETS_DIR/neo4j_password.txt"
        log_success "Generated Neo4j password"
    fi
    
    if [ ! -f "$SECRETS_DIR/redis_password.txt" ]; then
        openssl rand -base64 64 | tr -d '\n' > "$SECRETS_DIR/redis_password.txt"
        log_success "Generated Redis password"
    fi
    
    if [ ! -f "$SECRETS_DIR/minio_access_key.txt" ]; then
        openssl rand -base64 32 | tr -d '\n' > "$SECRETS_DIR/minio_access_key.txt"
        log_success "Generated MinIO access key"
    fi
    
    if [ ! -f "$SECRETS_DIR/minio_secret_key.txt" ]; then
        openssl rand -base64 64 | tr -d '\n' > "$SECRETS_DIR/minio_secret_key.txt"
        log_success "Generated MinIO secret key"
    fi
    
    if [ ! -f "$SECRETS_DIR/admin_secret.txt" ]; then
        openssl rand -base64 64 | tr -d '\n' > "$SECRETS_DIR/admin_secret.txt"
        log_success "Generated admin secret"
    fi
    
    # Check for API keys
    if [ ! -f "$SECRETS_DIR/openai_api_key.txt" ]; then
        log_warning "OpenAI API key not found - add it to $SECRETS_DIR/openai_api_key.txt"
    fi
    
    if [ ! -f "$SECRETS_DIR/gemini_api_key.txt" ]; then
        log_warning "Gemini API key not found - add it to $SECRETS_DIR/gemini_api_key.txt"
    fi
    
    # Set proper permissions
    chmod 600 "$SECRETS_DIR"/*.txt
}

setup_traefik() {
    log_info "Setting up Traefik configuration..."
    
    mkdir -p "$TRAEFIK_DIR"
    
    # Create Traefik dynamic configuration
    cat > "$TRAEFIK_DIR/dynamic.yml" << 'EOF'
# Dynamic Traefik configuration for privacy deployment

http:
  middlewares:
    # Security headers
    security-headers:
      headers:
        customRequestHeaders:
          X-Forwarded-Proto: "https"
        sslRedirect: true
        stsIncludeSubdomains: true
        stsPreload: true
        stsSeconds: 31536000
        contentTypeNosniff: true
        browserXssFilter: true
        customResponseHeaders:
          X-Frame-Options: "DENY"
          X-Content-Type-Options: "nosniff"
          Referrer-Policy: "same-origin"
          Permissions-Policy: "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=()"
    
    # Admin authentication
    admin-auth:
      basicAuth:
        users:
          - "admin:$2y$10$HASHED_ADMIN_PASSWORD"  # Change this
    
    # VPN whitelist
    vpn-whitelist:
      ipWhiteList:
        sourceRange:
          - "10.0.0.0/8"
          - "172.16.0.0/12" 
          - "192.168.0.0/16"
          - "127.0.0.1/32"
    
    # Rate limiting
    rate-limit:
      rateLimit:
        burst: 100
        average: 50
    
    # DDoS protection
    ddos-protection:
      rateLimit:
        burst: 200
        average: 100
        period: "1m"

tls:
  options:
    default:
      sslStrategies:
        - "tls.SniStrict"
      minVersion: "VersionTLS12"
      cipherSuites:
        - "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
        - "TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305"
        - "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256"
EOF

    # Create acme.json for Let's Encrypt
    touch "$TRAEFIK_DIR/acme.json"
    chmod 600 "$TRAEFIK_DIR/acme.json"
    
    log_success "Traefik configuration created"
}

setup_monitoring() {
    log_info "Setting up monitoring configuration..."
    
    mkdir -p "$MONITORING_DIR"
    
    # Prometheus configuration
    cat > "$MONITORING_DIR/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    environment: 'privacy-production'

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Neo4j metrics (if available)
  - job_name: 'neo4j'
    static_configs:
      - targets: ['neo4j:2004']
    scrape_interval: 30s

  # Application metrics
  - job_name: 'rabbit-hole-ui'
    static_configs:
      - targets: ['nextjs-ui:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  # System metrics (Node Exporter)
  - job_name: 'node'
    static_configs:
      - targets: ['host.docker.internal:9100']
    scrape_interval: 30s

  # Docker metrics
  - job_name: 'docker'
    static_configs:
      - targets: ['host.docker.internal:9323']
    scrape_interval: 30s
EOF

    # Grafana provisioning
    mkdir -p "$MONITORING_DIR/grafana/provisioning/datasources"
    
    cat > "$MONITORING_DIR/grafana/provisioning/datasources/prometheus.yml" << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

    log_success "Monitoring configuration created"
}

setup_encrypted_storage() {
    log_info "Setting up encrypted storage directories..."
    
    sudo mkdir -p /encrypted/{neo4j-data,neo4j-backups,minio-data,vault-data}
    sudo chown -R $USER:$USER /encrypted
    chmod 700 /encrypted/*
    
    log_success "Encrypted storage directories created"
}

build_images() {
    log_info "Building custom Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build Next.js UI
    log_info "Building Next.js UI..."
    docker build -f Dockerfile.nextjs -t rabbit-hole-ui:latest --target production-privacy .
    
    # Build Agent Services
    log_info "Building Agent Services..."
    docker build -f agent/Dockerfile -t langgraph-agents:latest --target production ./agent/
    
    log_success "All images built successfully"
}

deploy_stack() {
    log_info "Deploying privacy-focused stack..."
    
    cd "$PROJECT_ROOT"
    
    # Load environment
    source "$ENV_FILE"
    
    # Deploy with Docker Compose
    docker compose -f docker-compose.privacy.yml up -d
    
    log_success "Stack deployed successfully"
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Wait for services to start
    sleep 30
    
    # Check service health
    local failed=0
    
    # Check Traefik
    if ! docker ps | grep -q "privacy-gateway.*Up"; then
        log_error "Traefik gateway is not running"
        failed=1
    fi
    
    # Check Next.js UI
    if ! docker ps | grep -q "rabbit-hole-ui.*Up"; then
        log_error "Next.js UI is not running"
        failed=1
    fi
    
    # Check Neo4j
    if ! docker ps | grep -q "neo4j-privacy.*Up"; then
        log_error "Neo4j is not running"
        failed=1
    fi
    
    # Check health endpoints
    if command -v curl &> /dev/null; then
        if curl -f -s http://localhost/api/health > /dev/null; then
            log_success "Application health check passed"
        else
            log_warning "Application health check failed (may need DNS/HTTPS setup)"
        fi
    fi
    
    if [ $failed -eq 0 ]; then
        log_success "All services are running"
    else
        log_error "Some services failed to start"
        return 1
    fi
}

show_access_info() {
    source "$ENV_FILE"
    
    echo ""
    log_info "=== DEPLOYMENT COMPLETE ==="
    echo ""
    log_success "Public Site: https://${DOMAIN}"
    log_success "Admin Panel: https://admin.${DOMAIN} (VPN-only)"
    log_success "Monitoring: https://monitoring.${DOMAIN} (Admin-only)"
    echo ""
    log_warning "IMPORTANT: Configure your DNS to point to this server"
    log_warning "IMPORTANT: Set up VPN access for admin endpoints"
    log_warning "IMPORTANT: Add your LLM API keys to the secrets directory"
    echo ""
}

# Main deployment flow
main() {
    log_info "Starting privacy-focused deployment of Rabbit Hole..."
    
    check_requirements
    generate_secrets
    setup_traefik
    setup_monitoring
    setup_encrypted_storage
    build_images
    deploy_stack
    verify_deployment
    show_access_info
    
    log_success "Privacy-focused deployment completed successfully!"
}

# Run with error handling
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
