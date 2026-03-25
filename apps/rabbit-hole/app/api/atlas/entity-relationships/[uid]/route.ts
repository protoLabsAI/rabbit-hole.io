/**
 * Atlas Entity Relationships API
 *
 * Returns all relationships for an entity, grouped by relationship type.
 * Supports the EntityRelationships and RelatedEntities UI components.
 */

import { NextRequest, NextResponse } from "next/server";

import { getGlobalNeo4jClient } from "@proto/database";

export interface RelationshipRow {
  relType: string;
  sentiment: string | null;
  otherUid: string;
  otherName: string;
  otherType: string;
}

export interface RelatedEntityRow {
  uid: string;
  name: string;
  type: string;
  connections: number;
}

export interface EntityRelationshipsResponse {
  success: boolean;
  data?: {
    relationships: RelationshipRow[];
    related: RelatedEntityRow[];
  };
  error?: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
): Promise<NextResponse<EntityRelationshipsResponse>> {
  const client = getGlobalNeo4jClient();

  try {
    const { uid } = await params;

    // 1-hop relationships grouped-ready query
    const relResult = await client.executeRead(
      `
      MATCH (e {uid: $uid})-[r]-(other)
      WHERE other.uid IS NOT NULL
      RETURN
        type(r)       AS relType,
        r.sentiment   AS sentiment,
        other.uid     AS otherUid,
        other.name    AS otherName,
        coalesce(other.type, labels(other)[0], 'entity') AS otherType
      ORDER BY relType
      `,
      { uid }
    );

    const relationships: RelationshipRow[] = relResult.records.map((rec) => ({
      relType: rec.get("relType") as string,
      sentiment: rec.get("sentiment") as string | null,
      otherUid: rec.get("otherUid") as string,
      otherName: rec.get("otherName") as string,
      otherType: (rec.get("otherType") as string)?.toLowerCase() ?? "entity",
    }));

    // 2-hop related entities, ordered by connection count
    const relatedResult = await client.executeRead(
      `
      MATCH (e {uid: $uid})-[*1..2]-(related)
      WHERE related.uid IS NOT NULL AND related.uid <> $uid
      WITH related, count(*) AS connections
      ORDER BY connections DESC
      LIMIT 10
      RETURN
        related.uid  AS uid,
        related.name AS name,
        coalesce(related.type, labels(related)[0], 'entity') AS type,
        connections
      `,
      { uid }
    );

    const related: RelatedEntityRow[] = relatedResult.records.map((rec) => ({
      uid: rec.get("uid") as string,
      name: rec.get("name") as string,
      type: (rec.get("type") as string)?.toLowerCase() ?? "entity",
      connections: (rec.get("connections") as any)?.toNumber
        ? (rec.get("connections") as any).toNumber()
        : Number(rec.get("connections")),
    }));

    return NextResponse.json({
      success: true,
      data: { relationships, related },
    });
  } catch (error) {
    console.error("Atlas entity-relationships API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch entity relationships",
      },
      { status: 500 }
    );
  }
}
