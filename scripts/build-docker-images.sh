#!/bin/bash
# Build all Docker images for rabbit-hole.io
# Uses optimized Dockerfiles with layer caching and pnpm store caching

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Enable Docker BuildKit for cache mounts
export DOCKER_BUILDKIT=1

echo -e "${BLUE}🐳 Building Docker images for rabbit-hole.io${NC}"
echo ""

# Load environment variables if available
if [ -f .env.local ]; then
  echo -e "${BLUE}📄 Loading environment from .env.local${NC}"
  source .env.local
else
  echo -e "${YELLOW}⚠️  .env.local not found, using defaults${NC}"
fi

# Default values if not set
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-pk_test_dummy_key}

# Parse command line arguments
BUILD_ALL=true
BUILD_RABBIT_HOLE=false
BUILD_AGENT=false
BUILD_JOB_PROCESSOR=false
BUILD_YJS_COLLAB=false
NO_CACHE=false
PLATFORM=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --rabbit-hole)
      BUILD_ALL=false
      BUILD_RABBIT_HOLE=true
      shift
      ;;
    --agent)
      BUILD_ALL=false
      BUILD_AGENT=true
      shift
      ;;
    --job-processor)
      BUILD_ALL=false
      BUILD_JOB_PROCESSOR=true
      shift
      ;;
    --yjs-collab)
      BUILD_ALL=false
      BUILD_YJS_COLLAB=true
      shift
      ;;
    --no-cache)
      NO_CACHE=true
      shift
      ;;
    --platform)
      PLATFORM="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --rabbit-hole      Build only rabbit-hole image"
      echo "  --agent            Build only agent image"
      echo "  --job-processor    Build only job-processor image"
      echo "  --yjs-collab       Build only yjs-collab image"
      echo "  --no-cache         Build without cache"
      echo "  --platform ARCH    Build for specific platform (linux/amd64, linux/arm64)"
      echo "  --help             Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                                  # Build all images"
      echo "  $0 --rabbit-hole                    # Build only rabbit-hole"
      echo "  $0 --rabbit-hole --agent            # Build rabbit-hole and agent"
      echo "  $0 --platform linux/amd64           # Build for x86_64"
      echo "  $0 --no-cache                       # Build from scratch"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Build options
BUILD_OPTS=""
if [ "$NO_CACHE" = true ]; then
  BUILD_OPTS="--no-cache"
  echo -e "${YELLOW}🔄 Building without cache${NC}"
fi

if [ -n "$PLATFORM" ]; then
  BUILD_OPTS="$BUILD_OPTS --platform $PLATFORM"
  echo -e "${BLUE}🏗️  Building for platform: $PLATFORM${NC}"
fi

echo ""

# Function to build an image
build_image() {
  local name=$1
  local dockerfile=$2
  local context=$3
  local tag=$4
  local build_args=$5
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}📦 Building: ${GREEN}${name}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  local start_time=$(date +%s)
  
  if docker build \
    -f "$dockerfile" \
    -t "$tag" \
    $BUILD_OPTS \
    $build_args \
    "$context"; then
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local size=$(docker images "$tag" --format "{{.Size}}")
    
    echo ""
    echo -e "${GREEN}✅ ${name} built successfully${NC}"
    echo -e "${BLUE}   Duration: ${duration}s${NC}"
    echo -e "${BLUE}   Size: ${size}${NC}"
    echo ""
  else
    echo ""
    echo -e "${RED}❌ Failed to build ${name}${NC}"
    echo ""
    exit 1
  fi
}

# Build images based on flags
if [ "$BUILD_ALL" = true ] || [ "$BUILD_RABBIT_HOLE" = true ]; then
  build_image \
    "rabbit-hole (Next.js App)" \
    "apps/rabbit-hole/Dockerfile" \
    "." \
    "rabbit-hole:latest" \
    "--build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}"
fi

if [ "$BUILD_ALL" = true ] || [ "$BUILD_AGENT" = true ]; then
  build_image \
    "langgraph-agent (LangGraph Services)" \
    "agent/Dockerfile" \
    "." \
    "langgraph-agent:latest" \
    ""
fi

if [ "$BUILD_ALL" = true ] || [ "$BUILD_JOB_PROCESSOR" = true ]; then
  build_image \
    "job-processor (Background Jobs)" \
    "services/job-processor/Dockerfile" \
    "." \
    "job-processor:latest" \
    ""
fi

if [ "$BUILD_ALL" = true ] || [ "$BUILD_YJS_COLLAB" = true ]; then
  build_image \
    "yjs-collab (Real-time Collaboration)" \
    "services/yjs-collaboration-server/Dockerfile" \
    "." \
    "yjs-collab:latest" \
    ""
fi

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Build Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

docker images | grep -E "REPOSITORY|rabbit-hole|langgraph-agent|job-processor|yjs-collab" | head -n 10

echo ""
echo -e "${GREEN}✅ All images built successfully!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  • Run images: ${YELLOW}docker run -d -p PORT:PORT IMAGE:TAG${NC}"
echo -e "  • Use compose: ${YELLOW}docker-compose -f docker-compose.optimized.yml up -d${NC}"
echo -e "  • Push to registry: ${YELLOW}docker push IMAGE:TAG${NC}"
echo ""

