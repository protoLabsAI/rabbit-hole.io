/**
 * Evidence Pack API - Rabbit Hole Schema
 *
 * Returns all evidence and associated files for a specific content item,
 * providing complete provenance chain with file access URLs.
 */

import { NextRequest, NextResponse } from "next/server";

import { getGlobalNeo4jClient } from "@proto/database";

import { getObjectStoreConfig } from "../../../../../../../config/object-store.config";

interface EvidenceItem {
  uid: string;
  title: string;
  publisher: string;
  date: string;
  url: string;
  archive?: string[];
  kind:
    | "government"
    | "court"
    | "major_media"
    | "research"
    | "social"
    | "platform_log";
  reliability?: number;
  notes?: string;
  files: FileItem[];
}

interface FileItem {
  uid: string;
  content_hash: string;
  mime: string;
  bytes?: number;
  bucket: string;
  canonicalKey: string;
  aliases: string[];
  accessUrl?: string;
  derivations?: {
    transcript?: string;
    ocr?: string;
    text?: string;
    thumbnails?: string[];
  };
}

interface EvidencePackResponse {
  success: boolean;
  data?: {
    content: {
      uid: string;
      content_type: string;
      platform?: string;
      author?: string;
      published_at: string;
      url?: string;
      text_excerpt?: string;
    };
    evidence: EvidenceItem[];
    summary: {
      totalEvidenceItems: number;
      totalFiles: number;
      reliabilityScore: number; // weighted average
      evidenceTypes: Record<string, number>;
      fileTypes: Record<string, number>;
    };
  };
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentUid: string }> }
): Promise<NextResponse<EvidencePackResponse>> {
  const client = getGlobalNeo4jClient();

  try {
    const { contentUid } = await params;

    if (!contentUid) {
      return NextResponse.json(
        {
          success: false,
          error: "Content UID is required",
        },
        { status: 400 }
      );
    }

    console.log(`📦 Fetching evidence pack for content: ${contentUid}`);

    // First, get the content item details
    const contentResult = await client.executeRead(
      `
      MATCH (c:Content {uid: $contentUid})
      OPTIONAL MATCH (platform {uid: c.platform_uid})
      OPTIONAL MATCH (author {uid: c.author_uid})
      RETURN 
        c.uid AS uid,
        c.content_type AS contentType,
        c.published_at AS publishedAt,
        c.url AS url,
        c.text_excerpt AS textExcerpt,
        platform.name AS platformName,
        author.name AS authorName
    `,
      { contentUid }
    );

    if (contentResult.records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Content ${contentUid} not found`,
        },
        { status: 404 }
      );
    }

    const contentRecord = contentResult.records[0];
    const content = {
      uid: contentRecord.get("uid"),
      content_type: contentRecord.get("contentType"),
      platform: contentRecord.get("platformName"),
      author: contentRecord.get("authorName"),
      published_at: contentRecord.get("publishedAt")?.toString() || "",
      url: contentRecord.get("url"),
      text_excerpt: contentRecord.get("textExcerpt"),
    };

    // Get all evidence that supports this content, plus their files
    const evidenceQuery = `
      MATCH (c:Content {uid: $contentUid})<-[:EVIDENCES]-(e:Evidence)
      OPTIONAL MATCH (e)-[:HAS_FILE]->(f:File)
      RETURN 
        e.uid AS evidenceUid,
        e.title AS title,
        e.publisher AS publisher,
        e.date AS date,
        e.url AS url,
        e.archive AS archive,
        e.kind AS kind,
        e.reliability AS reliability,
        e.notes AS notes,
        collect(DISTINCT {
          uid: f.uid,
          content_hash: f.content_hash,
          mime: f.mime,
          bytes: f.bytes,
          bucket: f.bucket,
          key: f.key,
          aliases: f.aliases
        }) AS files
      ORDER BY e.date DESC
    `;

    const evidenceResult = await client.executeRead(evidenceQuery, {
      contentUid,
    });

    const objectStoreConfig = getObjectStoreConfig();

    const evidence: EvidenceItem[] = evidenceResult.records.map(
      (record: any) => {
        const files: FileItem[] = record
          .get("files")
          .filter((f: any) => f.uid !== null)
          .map((f: any) => {
            // Generate access URL based on object store config
            const accessUrl = generateFileAccessUrl(f, objectStoreConfig);

            return {
              uid: f.uid,
              content_hash: f.content_hash,
              mime: f.mime,
              bytes: f.bytes,
              bucket: f.bucket,
              canonicalKey: f.key,
              aliases: f.aliases || [],
              accessUrl,
            };
          });

        return {
          uid: record.get("evidenceUid"),
          title: record.get("title"),
          publisher: record.get("publisher"),
          date: record.get("date")?.toString() || "",
          url: record.get("url"),
          archive: record.get("archive"),
          kind: record.get("kind"),
          reliability: record.get("reliability"),
          notes: record.get("notes"),
          files,
        };
      }
    );

    // Calculate summary statistics
    const totalFiles = evidence.reduce((sum, e) => sum + e.files.length, 0);

    const reliabilityScores = evidence
      .map((e) => e.reliability)
      .filter((r): r is number => r !== null && r !== undefined);

    const reliabilityScore =
      reliabilityScores.length > 0
        ? reliabilityScores.reduce((sum, r) => sum + r, 0) /
          reliabilityScores.length
        : 0;

    const evidenceTypes = evidence.reduce(
      (acc, e) => {
        acc[e.kind] = (acc[e.kind] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const fileTypes = evidence.reduce(
      (acc, e) => {
        e.files.forEach((f) => {
          const type = f.mime.split("/")[0]; // video, audio, image, etc.
          acc[type] = (acc[type] || 0) + 1;
        });
        return acc;
      },
      {} as Record<string, number>
    );

    console.log(
      `📊 Evidence pack: ${evidence.length} evidence items, ${totalFiles} files`
    );

    return NextResponse.json({
      success: true,
      data: {
        content,
        evidence,
        summary: {
          totalEvidenceItems: evidence.length,
          totalFiles,
          reliabilityScore: Math.round(reliabilityScore * 100) / 100,
          evidenceTypes,
          fileTypes,
        },
      },
    });
  } catch (error) {
    console.error("Evidence pack API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch evidence pack",
      },
      { status: 500 }
    );
  }
}

/**
 * Generate file access URL based on object store configuration
 */
function generateFileAccessUrl(file: any, config: any): string {
  const { bucket, key } = file;

  switch (config.provider) {
    case "minio":
    case "s3":
      return `${config.connection.endpoint}/${bucket}/${key}`;

    case "gcs":
      return `https://storage.googleapis.com/${bucket}/${key}`;

    case "ipfs":
      // For IPFS, the content_hash would be the IPFS hash
      return `${config.connection.endpoint}/ipfs/${file.content_hash.replace("sha256-", "")}`;

    default:
      return `#unavailable-${config.provider}`;
  }
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: "/api/rabbit-hole/evidence-pack/[contentUid]",
      description: "Get complete evidence provenance for a content item",
      method: "GET",
      returns: [
        "Content item details",
        "All evidence that supports the content",
        "File attachments with access URLs",
        "Reliability scoring and statistics",
      ],
    },
    usage: {
      example:
        "/api/rabbit-hole/evidence-pack/content:x_2025_06_15_musk_left_violent",
    },
    schema: {
      evidenceKinds: [
        "government",
        "court",
        "major_media",
        "research",
        "social",
        "platform_log",
      ],
      fileAccess:
        "URLs generated based on object store provider (MinIO/S3/GCS/IPFS)",
      reliability: "Weighted average reliability score (0.0-1.0)",
    },
  });
}
