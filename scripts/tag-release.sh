#!/bin/bash
# Automated Docker image version tagging for main branch
# Automatically increments semantic version and triggers docker-build-release.yml

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DEFAULT_BRANCH="main"
TAG_PREFIX="v"

echo -e "${BLUE}🏷️  Docker Image Version Tagger${NC}"
echo ""

# Check if on correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$DEFAULT_BRANCH" ]; then
  echo -e "${RED}❌ Not on $DEFAULT_BRANCH branch${NC}"
  echo -e "${YELLOW}   Current: $CURRENT_BRANCH${NC}"
  echo ""
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}❌ Uncommitted changes detected${NC}"
  git status --short
  exit 1
fi

# Fetch tags
git fetch --tags --quiet

# Get latest tag
LATEST_TAG=$(git tag --sort=-v:refname | grep -E "^${TAG_PREFIX}[0-9]+\.[0-9]+\.[0-9]+$" | head -1)

if [ -z "$LATEST_TAG" ]; then
  echo -e "${YELLOW}⚠️  No existing tags found${NC}"
  NEW_VERSION="0.1.0"
else
  echo -e "${BLUE}📋 Latest tag: ${GREEN}$LATEST_TAG${NC}"
  
  # Strip prefix and parse version
  VERSION=${LATEST_TAG#"$TAG_PREFIX"}
  MAJOR=$(echo "$VERSION" | cut -d. -f1)
  MINOR=$(echo "$VERSION" | cut -d. -f2)
  PATCH=$(echo "$VERSION" | cut -d. -f3)
  
  # Increment based on argument
  case "${1:-patch}" in
    major)
      MAJOR=$((MAJOR + 1))
      MINOR=0
      PATCH=0
      ;;
    minor)
      MINOR=$((MINOR + 1))
      PATCH=0
      ;;
    patch)
      PATCH=$((PATCH + 1))
      ;;
    *)
      echo -e "${RED}❌ Invalid increment type: $1${NC}"
      echo -e "${YELLOW}   Usage: $0 [major|minor|patch]${NC}"
      exit 1
      ;;
  esac
  
  NEW_VERSION="$MAJOR.$MINOR.$PATCH"
fi

NEW_TAG="${TAG_PREFIX}${NEW_VERSION}"

echo -e "${BLUE}🎯 New tag: ${GREEN}$NEW_TAG${NC}"
echo ""

# Confirm
read -p "Create and push tag $NEW_TAG? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}⚠️  Cancelled${NC}"
  exit 0
fi

# Create tag
echo -e "${BLUE}📝 Creating tag...${NC}"
git tag -a "$NEW_TAG" -m "Release $NEW_TAG"

# Push tag
echo -e "${BLUE}🚀 Pushing tag...${NC}"
git push origin "$NEW_TAG"

echo ""
echo -e "${GREEN}✅ Tag $NEW_TAG created and pushed${NC}"
echo ""
echo -e "${BLUE}📦 Docker build workflow triggered:${NC}"
echo -e "${YELLOW}   https://github.com/$(git config --get remote.origin.url | sed 's/.*github\.com[:/]\(.*\)\.git$/\1/')/actions${NC}"
echo ""
echo -e "${BLUE}🐳 Images will be published to:${NC}"
echo -e "   ghcr.io/proto-labs-ai/proto-starter/rabbit-hole:$NEW_TAG"
echo -e "   ghcr.io/proto-labs-ai/proto-starter/agent:$NEW_TAG"
echo -e "   ghcr.io/proto-labs-ai/proto-starter/job-processor:$NEW_TAG"
echo -e "   ghcr.io/proto-labs-ai/proto-starter/yjs-collab:$NEW_TAG"
echo -e "   ghcr.io/proto-labs-ai/proto-starter/langextract:$NEW_TAG"
echo -e "   ghcr.io/proto-labs-ai/proto-starter/youtube-processor:$NEW_TAG"
echo ""

