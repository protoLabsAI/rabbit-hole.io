/**
 * Object Store Configuration
 *
 * Centralized configuration for S3/MinIO object storage.
 * Used by file upload, download, and promotion routes.
 */

export interface FileMetadata {
  contentHash: string;
  originalFilename?: string;
  capturedAt: string;
  sourceUrl?: string;
  mediaType: string;
  bucket: string;
  canonicalKey: string;
  aliases: string[];
}

export interface ObjectStoreConfig {
  provider: "minio" | "s3" | "gcs" | "ipfs";
  connection: {
    endpoint: string;
    region: string;
    accessKeyId: string | undefined;
    secretAccessKey: string | undefined;
  };
  buckets: {
    evidenceTemp: string;
    evidenceRaw: string;
  };
  security: {
    signedUrlExpiry: number;
    maxUploadSize: number;
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Get object store configuration from environment variables
 */
export function getObjectStoreConfig(): ObjectStoreConfig {
  const endpoint = process.env.MINIO_ENDPOINT || "http://localhost:9000";
  const useSSL = process.env.MINIO_USE_SSL === "true";
  const normalizedEndpoint = endpoint.startsWith("http")
    ? endpoint
    : `${useSSL ? "https" : "http"}://${endpoint}`;

  return {
    provider:
      (process.env.OBJECT_STORE_PROVIDER as ObjectStoreConfig["provider"]) ||
      "minio",
    connection: {
      endpoint: normalizedEndpoint,
      region: process.env.MINIO_REGION || "us-east-1",
      accessKeyId: process.env.MINIO_ACCESS_KEY,
      secretAccessKey: process.env.MINIO_SECRET_KEY,
    },
    buckets: {
      evidenceTemp: process.env.MINIO_BUCKET_TEMP || "evidence-temp",
      evidenceRaw: process.env.MINIO_BUCKET_RAW || "evidence-raw",
    },
    security: {
      signedUrlExpiry: parseInt(process.env.SIGNED_URL_EXPIRY || "3600", 10),
      maxUploadSize: parseInt(
        process.env.MAX_UPLOAD_SIZE || String(500 * 1024 * 1024),
        10
      ),
    },
  };
}

/**
 * Generate canonical storage key from content hash
 * Format: by-hash/sha256/aa/bb/aabbcc...
 */
export function generateCanonicalKey(hash: string): string {
  const cleanHash = hash.replace(/^sha256-/, "");
  const prefix1 = cleanHash.substring(0, 2);
  const prefix2 = cleanHash.substring(2, 4);
  return `by-hash/sha256/${prefix1}/${prefix2}/${cleanHash}`;
}

/**
 * Generate a date-based alias key for human-friendly file access
 * Format: by-date/YYYY/MM/DD/source/filename
 */
export function generateDateAlias(
  date: Date,
  source: string,
  filename: string
): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const safeSource = source.replace(/[^a-z0-9_-]/gi, "_");
  const safeFilename = filename.replace(/[^a-z0-9._-]/gi, "_");
  return `by-date/${yyyy}/${mm}/${dd}/${safeSource}/${safeFilename}`;
}

/**
 * Validate a content hash string (SHA256 format)
 */
export function isValidContentHash(hash: string): boolean {
  if (!hash) return false;
  const cleanHash = hash.replace(/^sha256-/, "");
  return /^[a-f0-9]{64}$/i.test(cleanHash);
}

/**
 * Validate object store configuration
 */
export function validateConfig(config: ObjectStoreConfig): ValidationResult {
  const errors: string[] = [];

  if (!config.connection.endpoint) {
    errors.push("Missing endpoint");
  }
  if (!config.connection.accessKeyId) {
    errors.push("Missing access key (MINIO_ACCESS_KEY)");
  }
  if (!config.connection.secretAccessKey) {
    errors.push("Missing secret key (MINIO_SECRET_KEY)");
  }
  if (!config.buckets.evidenceTemp) {
    errors.push("Missing temp bucket name");
  }
  if (!config.buckets.evidenceRaw) {
    errors.push("Missing raw bucket name");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
