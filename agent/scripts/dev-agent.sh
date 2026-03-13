#!/bin/bash

# LangGraph Agent Development Script
# Enhanced development workflow for AI agent testing and debugging

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_ROOT="$(dirname "$SCRIPT_DIR")"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    LangGraph Agent Development               ║"
    echo "║                      Enhanced Workflow                      ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_environment() {
    log_info "Checking LangGraph development environment..."
    
    cd "$AGENT_ROOT"
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        if [ -f "env.example" ]; then
            log_warning ".env file not found, creating from template..."
            cp env.example .env
            log_warning "Please edit agent/.env with your API keys"
        else
            log_error "No environment configuration found"
            return 1
        fi
    fi
    
    # Check for API keys
    if grep -q "sk-your-openai" .env 2>/dev/null; then
        log_warning "OpenAI API key not configured in agent/.env"
    fi
    
    if grep -q "your-google-ai" .env 2>/dev/null; then
        log_warning "Google API key not configured in agent/.env" 
    fi
    
    # Check LangGraph CLI
    if ! command -v npx &> /dev/null; then
        log_error "npx not found - needed for LangGraph CLI"
        return 1
    fi
    
    # Check package dependencies
    if [ ! -d "node_modules" ]; then
        log_info "Installing agent dependencies..."
        pnpm install
    fi
    
    log_success "Environment check completed"
}

start_agent_dev() {
    log_info "Starting LangGraph agent development server..."
    
    cd "$AGENT_ROOT"
    
    # Check if port 8123 is available
    if lsof -Pi :8123 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "Port 8123 already in use - stopping existing process"
        pkill -f "langgraph.*dev.*8123" || true
        sleep 2
    fi
    
    # Start LangGraph development server
    log_info "Starting LangGraph CLI on port 8123..."
    npx @langchain/langgraph-cli dev --port 8123 &
    
    local langgraph_pid=$!
    
    # Wait for LangGraph to start
    sleep 5
    
    # Check if LangGraph is running
    if ps -p $langgraph_pid > /dev/null; then
        log_success "LangGraph agent server started successfully"
        log_info "Agent API: http://localhost:8123"
        log_info "Person Research: http://localhost:8123/person_research_agent/playground"
    else
        log_error "Failed to start LangGraph agent server"
        return 1
    fi
}

test_agent_connectivity() {
    log_info "Testing agent connectivity..."
    
    local max_attempts=20
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:8123/docs > /dev/null 2>&1; then
            log_success "✓ LangGraph agent API is responding"
            break
        fi
        log_info "Waiting for agent API... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "LangGraph agent API not responding after 40 seconds"
        return 1
    fi
    
    # Test person research agent specifically
    if curl -f -s http://localhost:8123/person_research_agent/playground > /dev/null 2>&1; then
        log_success "✓ Person Research Agent accessible"
    else
        log_warning "Person Research Agent playground not accessible"
    fi
}

show_development_info() {
    echo ""
    log_success "=== LANGGRAPH AGENT DEVELOPMENT READY ==="
    echo ""
    echo -e "${GREEN}🤖 Agent Services:${NC}"
    echo "   • LangGraph API:     http://localhost:8123"
    echo "   • Agent Playground:  http://localhost:8123/person_research_agent/playground"
    echo "   • API Documentation: http://localhost:8123/docs"
    echo ""
    echo -e "${BLUE}🔧 Development Tools:${NC}"
    echo "   • View logs:         docker logs langgraph-agents-dev (if containerized)"
    echo "   • Test agent:        curl http://localhost:8123/docs"
    echo "   • Restart agent:     pkill -f langgraph && ./scripts/dev-agent.sh"
    echo ""
    echo -e "${YELLOW}🧪 Testing Commands:${NC}"
    echo "   • Test research:     curl -X POST http://localhost:8123/person_research_agent/invoke"
    echo "   • Health check:      curl http://localhost:8123/health"
    echo "   • Agent status:      ps aux | grep langgraph"
    echo ""
    echo -e "${GREEN}📝 Next Steps:${NC}"
    echo "   1. Add your API keys to agent/.env for full functionality"
    echo "   2. Test person research in the playground"
    echo "   3. Integrate with CopilotKit in the frontend"
    echo "   4. Enhance entity research agent workflows"
    echo ""
}

# Main development flow
main() {
    print_banner
    
    log_info "Setting up LangGraph agent development environment..."
    
    check_environment
    start_agent_dev
    test_agent_connectivity
    show_development_info
    
    log_success "🎉 LangGraph agent development environment ready!"
}

# Run with error handling
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
