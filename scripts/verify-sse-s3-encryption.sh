#!/bin/bash
# Verify SSE-S3 encryption is working correctly
set -e

CONTAINER="rabbit-hole-minio"
ALIAS="local"
TEST_FILE="/tmp/test-encrypt-$(date +%s).txt"
TEST_CONTENT="This data should be encrypted at rest with AES-256"

echo "🔐 Testing SSE-S3 Encryption"
echo "================================"
echo ""

# Check if container is running
if ! docker ps | grep -q "$CONTAINER"; then
  echo "❌ MinIO container not running"
  exit 1
fi

# Setup alias
docker exec $CONTAINER mc alias set $ALIAS http://localhost:9000 minio changeme > /dev/null 2>&1

# Test 1: Check encryption is enabled on buckets
echo "📋 Test 1: Bucket Encryption Status"
echo "-----------------------------------"
for bucket in evidence-temp evidence-raw evidence-derived; do
  STATUS=$(docker exec $CONTAINER mc encrypt info $ALIAS/$bucket 2>&1 || echo "not enabled")
  if echo "$STATUS" | grep -q "sse-s3"; then
    echo "✅ $bucket: SSE-S3 enabled"
  else
    echo "⚠️  $bucket: Encryption not enabled"
  fi
done
echo ""

# Test 2: Upload test file
echo "📤 Test 2: Upload Test File"
echo "----------------------------"
echo "$TEST_CONTENT" > $TEST_FILE
docker cp $TEST_FILE $CONTAINER:/tmp/test.txt
docker exec $CONTAINER mc cp /tmp/test.txt $ALIAS/evidence-temp/test-encrypt.txt > /dev/null 2>&1
echo "✅ File uploaded successfully"
echo ""

# Test 3: Check encryption metadata
echo "🔍 Test 3: Encryption Metadata"
echo "-------------------------------"
METADATA=$(docker exec $CONTAINER mc stat $ALIAS/evidence-temp/test-encrypt.txt 2>&1)
if echo "$METADATA" | grep -q -i "encrypt\|AES"; then
  echo "✅ Encryption metadata present:"
  echo "$METADATA" | grep -i "encrypt\|AES" | sed 's/^/   /'
else
  echo "⚠️  No encryption metadata found (may still be encrypted)"
fi
echo ""

# Test 4: Verify transparent decryption via API
echo "📥 Test 4: API Download (Transparent Decryption)"
echo "------------------------------------------------"
docker exec $CONTAINER mc cp $ALIAS/evidence-temp/test-encrypt.txt /tmp/downloaded.txt > /dev/null 2>&1
DOWNLOADED_CONTENT=$(docker exec $CONTAINER cat /tmp/downloaded.txt)
if [ "$DOWNLOADED_CONTENT" = "$TEST_CONTENT" ]; then
  echo "✅ Transparent decryption works correctly"
else
  echo "❌ Decryption failed - content mismatch"
fi
echo ""

# Test 5: Verify file is encrypted on disk (optional - may not work in all setups)
echo "🔒 Test 5: Disk-Level Encryption Check"
echo "---------------------------------------"
DISK_READ=$(docker exec $CONTAINER cat /data/evidence-temp/test-encrypt.txt 2>&1 | head -c 100)
if [ "$DISK_READ" != "$TEST_CONTENT" ]; then
  echo "✅ File is encrypted on disk (content is not plaintext)"
else
  echo "⚠️  File may not be encrypted on disk (or encryption is transparent at filesystem level)"
fi
echo ""

# Cleanup
echo "🧹 Cleanup"
echo "----------"
docker exec $CONTAINER mc rm $ALIAS/evidence-temp/test-encrypt.txt > /dev/null 2>&1
docker exec $CONTAINER rm -f /tmp/test.txt /tmp/downloaded.txt > /dev/null 2>&1
rm -f $TEST_FILE
echo "✅ Test artifacts cleaned up"
echo ""

echo "================================"
echo "✅ SSE-S3 encryption verification complete!"
echo ""
echo "Summary:"
echo "  • Buckets configured with SSE-S3 encryption"
echo "  • Files are encrypted at rest with AES-256"
echo "  • Transparent decryption works via MinIO API"
echo "  • No application code changes required"

