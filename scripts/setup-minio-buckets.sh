#!/bin/sh
set -e

# MinIO Bucket Setup Script
# This script initializes MinIO buckets and sets their access policies

MINIO_HOST="${MINIO_HOST:-http://minio:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minio}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-changeme}"
MINIO_ALIAS="${MINIO_ALIAS:-local}"

echo "Waiting for MinIO to be ready..."
until /usr/bin/mc alias set "${MINIO_ALIAS}" "${MINIO_HOST}" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}"; do
  echo "Waiting for MinIO..."
  sleep 2
done

echo "MinIO is ready. Creating buckets..."
/usr/bin/mc mb "${MINIO_ALIAS}/evidence-temp" --ignore-existing
/usr/bin/mc mb "${MINIO_ALIAS}/evidence-raw" --ignore-existing
/usr/bin/mc mb "${MINIO_ALIAS}/evidence-derived" --ignore-existing

echo "Setting bucket policies..."
/usr/bin/mc anonymous set download "${MINIO_ALIAS}/evidence-temp"
/usr/bin/mc anonymous set download "${MINIO_ALIAS}/evidence-raw"
/usr/bin/mc anonymous set download "${MINIO_ALIAS}/evidence-derived"

echo "Buckets created successfully!"
/usr/bin/mc ls "${MINIO_ALIAS}"
