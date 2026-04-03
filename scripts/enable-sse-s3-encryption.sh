#!/bin/bash
# Enable SSE-S3 encryption on MinIO buckets
set -e

CONTAINER="rabbit-hole-minio"
ALIAS="local"

echo "🔐 Enabling SSE-S3 encryption on MinIO buckets..."

# Check if container is running
if ! docker ps | grep -q "$CONTAINER"; then
  echo "❌ MinIO container not running. Start it with:"
  echo "   docker compose -f docker-compose.dev.yml up -d minio"
  exit 1
fi

# Configure alias
echo "🔧 Configuring MinIO client..."
docker exec $CONTAINER mc alias set $ALIAS http://localhost:9000 minio changeme > /dev/null

# Enable SSE-S3 on all buckets
for bucket in evidence-temp evidence-raw evidence-derived; do
  echo "📦 Enabling encryption on $bucket..."
  docker exec $CONTAINER mc encrypt set sse-s3 $ALIAS/$bucket
done

# Verify encryption status
echo ""
echo "✅ Encryption Status:"
for bucket in evidence-temp evidence-raw evidence-derived; do
  docker exec $CONTAINER mc encrypt info $ALIAS/$bucket
done

echo ""
echo "✅ SSE-S3 encryption enabled successfully!"
echo ""
echo "All uploaded files will now be encrypted at rest with AES-256."

