#!/bin/bash
# Test YouTube download with real URL
# Downloads to output/youtube/ folder in project root

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
YOUTUBE_URL="${1:-https://www.youtube.com/watch?v=jNQXAC9IVRw}"
QUALITY="${2:-720p}"
SERVICE_URL="http://localhost:8001"

echo -e "${BLUE}Testing YouTube Download${NC}"
echo ""
echo "URL:     $YOUTUBE_URL"
echo "Quality: $QUALITY"
echo "Output:  output/youtube/"
echo ""

# Check service is running
echo -e "${YELLOW}Checking service health...${NC}"
if ! curl -s "$SERVICE_URL/health" > /dev/null 2>&1; then
    echo "❌ YouTube processor not running"
    echo "Start with: docker compose -f docker-compose.dev.yml up -d youtube-processor"
    exit 1
fi

echo -e "${GREEN}✅ Service healthy${NC}"
echo ""

# Download video
echo -e "${YELLOW}Downloading video...${NC}"
echo ""

curl -X POST "$SERVICE_URL/test-download" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$YOUTUBE_URL\", \"quality\": \"$QUALITY\"}" \
  | python3 -m json.tool

echo ""
echo -e "${GREEN}✅ Download complete${NC}"
echo ""
echo "Files saved to: output/youtube/"
echo ""
echo "To list files:"
echo "  ls -lh output/youtube/"
echo ""
echo "Usage:"
echo "  $0 [youtube-url] [quality]"
echo "  Example: $0 https://www.youtube.com/watch?v=VIDEO_ID 1080p"

