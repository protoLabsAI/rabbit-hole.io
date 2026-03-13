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
    this.client = new Client({
      endPoint:
        process.env.MINIO_ENDPOINT?.replace("http://", "").replace(
          "https://",
          ""
        ) || "localhost",
      port: parseInt(process.env.MINIO_PORT || "9000"),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ACCESS_KEY || "minio",
      secretKey: process.env.MINIO_SECRET_KEY || "minio123",
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
}
