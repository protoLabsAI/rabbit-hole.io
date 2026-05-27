/**
 * MinIO Service for file operations
 *
 * Handles file download and upload operations with MinIO object storage
 */

import { Client } from "minio";

export class MinioService {
  private client: Client;
  private bucketName = "evidence-raw";

  constructor() {
    // minio-js validates `endPoint` as a bare hostname and rejects a
    // colon-suffixed value ("Invalid endPoint : minio:9000"). Common env
    // conventions (and this repo's docker-compose) set MINIO_ENDPOINT to a
    // host:port or a full URL, so strip the scheme and split off any port.
    // An explicit MINIO_PORT wins; otherwise fall back to a port embedded in
    // the endpoint, then 9000. (#288)
    const rawEndpoint = (process.env.MINIO_ENDPOINT || "localhost")
      .replace("http://", "")
      .replace("https://", "");
    const [host, portFromEndpoint] = rawEndpoint.split(":");

    this.client = new Client({
      endPoint: host || "localhost",
      port: parseInt(process.env.MINIO_PORT || portFromEndpoint || "9000", 10),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ACCESS_KEY || "minio",
      secretKey: process.env.MINIO_SECRET_KEY || "",
    });
  }

  async downloadFile(canonicalKey: string): Promise<Buffer> {
    try {
      console.log(`📥 Downloading file from MinIO: ${canonicalKey}`);

      const stream = await this.client.getObject(this.bucketName, canonicalKey);

      // Convert stream to buffer
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
      });
    } catch (error) {
      console.error(`❌ Failed to download file ${canonicalKey}:`, error);
      throw new Error(
        `MinIO download failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async fileExists(canonicalKey: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucketName, canonicalKey);
      return true;
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "NotFound"
      ) {
        return false;
      }
      throw error;
    }
  }

  async getFileInfo(canonicalKey: string) {
    try {
      const stat = await this.client.statObject(this.bucketName, canonicalKey);
      return {
        size: stat.size,
        etag: stat.etag,
        lastModified: stat.lastModified,
      };
    } catch (error) {
      throw new Error(
        `Failed to get file info: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async uploadBuffer(
    key: string,
    buffer: Buffer,
    contentType: string,
    bucket?: string
  ): Promise<void> {
    const targetBucket = bucket ?? this.bucketName;
    try {
      await this.client.putObject(targetBucket, key, buffer, buffer.length, {
        "Content-Type": contentType,
      });
    } catch (error) {
      console.error(`❌ Failed to upload to MinIO: ${key}`, error);
      throw new Error(
        `MinIO upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
