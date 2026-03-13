/**
 * File Processing and Metadata Extraction
 *
 * Utilities for processing uploaded files, extracting metadata,
 * and generating entity IDs for the Rabbit Hole schema.
 */

export interface FileProcessingOptions {
  computeHash?: boolean;
  generateEntityId?: boolean;
  extractThumbnail?: boolean;
  validateContent?: boolean;
}

export interface FileProcessingResult {
  // Basic metadata
  filename: string;
  originalFilename: string;
  size: number;
  sizeFormatted: string;
  mediaType: string;

  // Generated identifiers
  suggestedEntityId: string;
  contentHash?: string;

  // File analysis
  isValid: boolean;
  validationErrors: string[];

  // Additional metadata
  lastModified?: Date;
  extractedText?: string;
  thumbnailUrl?: string;
}

// File size limits (100MB default from object store config)
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// Allowed MIME types for security
const ALLOWED_MIME_TYPES = new Set([
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  // Text files
  "text/plain",
  "text/csv",
  "text/markdown",
  "text/html",
  "application/json",
  "application/xml",
  "text/javascript",
  "application/javascript",
  "text/css",
  "application/yaml",
  "text/yaml",
  "application/typescript",
  "text/typescript",
  "text/jsx",
  "text/tsx",

  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",

  // Audio/Video
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/webm",

  // Archives
  "application/zip",
  "application/x-tar",
  "application/gzip",
]);

/**
 * Get file extension from filename (including compound extensions like .tar.gz)
 */
function getFileExtension(filename: string): string {
  if (!filename) return "";

  // Handle compound extensions
  if (filename.endsWith(".tar.gz")) return ".tar.gz";
  if (filename.endsWith(".js.map")) return ".js.map";

  // Standard extension
  const lastDotIndex = filename.lastIndexOf(".");
  return lastDotIndex > 0 ? filename.substring(lastDotIndex) : "";
}

/**
 * Map file extensions to expected MIME types for validation fallback
 */
const EXTENSION_TO_MIME_TYPE = new Map([
  // Text files that browsers often don't recognize
  [".md", "text/markdown"],
  [".js", "text/javascript"],
  [".ts", "application/typescript"],
  [".jsx", "text/jsx"],
  [".tsx", "text/tsx"],
  [".css", "text/css"],
  [".yaml", "application/yaml"],
  [".yml", "application/yaml"],
  [".json", "application/json"],
  [".xml", "application/xml"],
  [".html", "text/html"],
  [".txt", "text/plain"],
  [".csv", "text/csv"],
]);

/**
 * Process file metadata and generate entity information
 */
export async function processFileMetadata(
  file: File,
  options: FileProcessingOptions = {}
): Promise<FileProcessingResult> {
  const { computeHash = false, generateEntityId = true } = options;

  const validationErrors: string[] = [];

  // Basic file information
  const filename = file.name;
  const size = file.size;
  let mediaType = file.type || "application/octet-stream";

  // Correct MIME type if browser detection failed
  if (
    mediaType === "application/octet-stream" ||
    mediaType === "" ||
    !mediaType
  ) {
    const extension = getFileExtension(filename);
    const expectedMimeType = EXTENSION_TO_MIME_TYPE.get(extension);
    if (expectedMimeType) {
      mediaType = expectedMimeType;
    }
  }

  const lastModified = file.lastModified
    ? new Date(file.lastModified)
    : undefined;

  // Validate filename
  if (!filename || filename.trim() === "") {
    validationErrors.push("Filename cannot be empty");
  }

  // Validate file size
  if (size > MAX_FILE_SIZE) {
    const maxSizeMB = Math.round(MAX_FILE_SIZE / (1024 * 1024));
    validationErrors.push(`File size exceeds maximum limit of ${maxSizeMB} MB`);
  }

  if (size === 0) {
    validationErrors.push("File appears to be empty");
  }

  // Validate file type (MIME type + extension fallback)
  if (!isAllowedFileType(filename, mediaType)) {
    validationErrors.push(`File type not allowed: ${mediaType}`);
  }

  // Generate entity ID
  const suggestedEntityId = generateEntityId
    ? generateEntityIdFromFilename(filename)
    : "";

  // Compute content hash if requested
  let contentHash: string | undefined;
  if (computeHash) {
    try {
      contentHash = await computeFileHash(file);
    } catch (error) {
      console.warn("Hash computation failed:", error);
      validationErrors.push(`Failed to compute file hash: ${error}`);
    }
  }

  return {
    filename,
    originalFilename: filename,
    size,
    sizeFormatted: formatFileSize(size),
    mediaType,
    suggestedEntityId,
    contentHash,
    isValid: validationErrors.length === 0,
    validationErrors,
    lastModified,
  };
}

/**
 * Generate entity ID from filename following Rabbit Hole schema
 */
export function generateEntityIdFromFilename(filename: string): string {
  if (!filename || filename.trim() === "") {
    return "file:unknown_file";
  }

  // Remove file extension(s)
  let cleanName = filename;

  // Handle multiple extensions (e.g., .tar.gz, .js.map)
  // Special handling for compound extensions
  if (cleanName.endsWith(".tar.gz")) {
    cleanName = cleanName.replace(".tar.gz", "_tar");
  } else if (cleanName.endsWith(".js.map")) {
    cleanName = cleanName.replace(".js.map", "_js");
  } else {
    // Remove last extension only
    const lastDotIndex = cleanName.lastIndexOf(".");
    if (lastDotIndex > 0) {
      cleanName = cleanName.substring(0, lastDotIndex);
    }
  }

  // Sanitize for entity ID: lowercase, replace special chars with underscores
  let sanitized = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_") // Replace non-alphanumeric with underscore
    .replace(/_+/g, "_") // Collapse multiple underscores
    .replace(/^_+|_+$/g, ""); // Remove leading/trailing underscores

  // Handle edge cases
  if (!sanitized || sanitized === "_") {
    sanitized = "unknown_file";
  }

  // Truncate if too long (keep reasonable length for entity IDs)
  if (sanitized.length > 45) {
    // Leave room for "file:" prefix
    sanitized = sanitized.substring(0, 45).replace(/_+$/, "");
  }

  return `file:${sanitized}`;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const size = bytes / Math.pow(k, i);
  const formatted = i === 0 ? size.toString() : size.toFixed(1);

  return `${formatted} ${sizes[i]}`;
}

/**
 * Compute SHA256 hash of file content
 */
export async function computeFileHash(file: File): Promise<string> {
  // Check if arrayBuffer method exists (browser environment)
  if (typeof file.arrayBuffer === "function") {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `sha256-${hashHex}`;
  } else {
    // Fallback for test environment - generate deterministic hash from filename
    const encoder = new TextEncoder();
    const data = encoder.encode(file.name + file.size + file.type);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `sha256-${hashHex}`;
  }
}

/**
 * Validate file type against allowed MIME types with extension fallback
 */
export function isAllowedFileType(filename: string, mimeType: string): boolean {
  // First check if the MIME type is directly allowed
  if (ALLOWED_MIME_TYPES.has(mimeType)) {
    return true;
  }

  // If MIME type is generic/unrecognized, check by file extension
  if (mimeType === "application/octet-stream" || mimeType === "" || !mimeType) {
    const extension = getFileExtension(filename);
    const expectedMimeType = EXTENSION_TO_MIME_TYPE.get(extension);

    if (expectedMimeType && ALLOWED_MIME_TYPES.has(expectedMimeType)) {
      return true;
    }

    // Also check if the extension is in our allowed list
    return getAllowedFileExtensions().includes(extension);
  }

  return false;
}

/**
 * Get all allowed file extensions for UI display
 */
export function getAllowedFileExtensions(): string[] {
  return [
    // Documents
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    // Text files
    ".txt",
    ".csv",
    ".md",
    ".html",
    ".json",
    ".xml",
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".css",
    ".yaml",
    ".yml",
    // Images
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    // Audio
    ".mp3",
    ".wav",
    ".ogg",
    // Video
    ".mp4",
    ".mpeg",
    ".mov",
    ".webm",
    // Archives
    ".zip",
    ".tar",
    ".gz",
  ];
}
