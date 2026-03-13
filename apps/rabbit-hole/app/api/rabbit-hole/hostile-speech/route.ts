/**
 * Hostile Speech Report API - Rabbit Hole Schema
 *
 * Returns all hostile speech acts since a given date,
 * with speaker attribution and evidence provenance.
 */

import { NextRequest, NextResponse } from "next/server";

import { getGlobalNeo4jClient } from "@proto/database";

interface HostileSpeechAct {
  timestamp: string;
  speaker: {
    uid: string;
    name: string;
    type: string;
  };
  content: {
    uid: string;
    platform?: string;
    url?: string;
    text_excerpt?: string;
  };
  speechAct: {
    category: string;
    intensity: "low" | "medium" | "high" | "extreme";
    target_groups?: string[];
    confidence: number;
  };
  evidence: Array<{
    uid: string;
    title: string;
    publisher: string;
    url: string;
    reliability: number;
  }>;
}

interface HostileSpeechResponse {
  success: boolean;
  data?: {
    report: {
      fromDate: string;
      toDate: string;
      totalActs: number;
      speechActs: HostileSpeechAct[];
    };
    summary: {
      topSpeakers: Array<{ speaker: string; count: number }>;
      categories: Record<string, number>;
      intensityBreakdown: Record<string, number>;
      targetGroups: Record<string, number>;
    };
  };
  error?: string;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<HostileSpeechResponse>> {
  const client = getGlobalNeo4jClient();

  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("from");
    const toDate =
      searchParams.get("to") || new Date().toISOString().split("T")[0];

    if (!fromDate) {
      return NextResponse.json(
        {
          success: false,
          error: "from date parameter is required (format: YYYY-MM-DD)",
        },
        { status: 400 }
      );
    }

    console.log(
      `🔴 Fetching hostile speech acts from ${fromDate} to ${toDate}`
    );

    // Query for all hostile speech acts since the given date
    const hostileSpeechQuery = `
      MATCH (speaker)-[s:SPEECH_ACT]->(content:Content)
      WHERE s.sentiment = 'hostile' 
        AND s.at >= datetime($fromDate + 'T00:00:00Z')
        AND s.at <= datetime($toDate + 'T23:59:59Z')
      
      OPTIONAL MATCH (platform {uid: content.platform_uid})
      
      // Get evidence for this speech act
      OPTIONAL MATCH (evidence:Evidence)
      WHERE evidence.uid IN s.evidence_uids
      
      RETURN 
        s.at AS timestamp,
        speaker.uid AS speakerUid,
        speaker.name AS speakerName,
        labels(speaker)[0] AS speakerType,
        content.uid AS contentUid,
        content.url AS contentUrl,
        content.text_excerpt AS textExcerpt,
        platform.name AS platformName,
        s.category AS category,
        s.intensity AS intensity,
        s.target_groups AS targetGroups,
        s.confidence AS confidence,
        collect(DISTINCT {
          uid: evidence.uid,
          title: evidence.title,
          publisher: evidence.publisher,
          url: evidence.url,
          reliability: evidence.reliability
        }) AS evidence
      ORDER BY s.at DESC
    `;

    const result = await client.executeRead(hostileSpeechQuery, {
      fromDate,
      toDate,
    });

    const speechActs: HostileSpeechAct[] = result.records.map(
      (record: any) => ({
        timestamp: record.get("timestamp").toString(),
        speaker: {
          uid: record.get("speakerUid"),
          name: record.get("speakerName"),
          type: record.get("speakerType"),
        },
        content: {
          uid: record.get("contentUid"),
          platform: record.get("platformName"),
          url: record.get("contentUrl"),
          text_excerpt: record.get("textExcerpt"),
        },
        speechAct: {
          category: record.get("category"),
          intensity: record.get("intensity"),
          target_groups: record.get("targetGroups") || [],
          confidence: record.get("confidence") || 0.8,
        },
        evidence: record.get("evidence").filter((e: any) => e.uid !== null),
      })
    );

    // Calculate summary statistics
    const topSpeakers = speechActs.reduce(
      (acc, act) => {
        const speaker = act.speaker.name;
        acc[speaker] = (acc[speaker] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const topSpeakersArray = Object.entries(topSpeakers)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([speaker, count]) => ({ speaker, count }));

    const categories = speechActs.reduce(
      (acc, act) => {
        const category = act.speechAct.category;
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const intensityBreakdown = speechActs.reduce(
      (acc, act) => {
        const intensity = act.speechAct.intensity;
        acc[intensity] = (acc[intensity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const targetGroups = speechActs.reduce(
      (acc, act) => {
        act.speechAct.target_groups?.forEach((group) => {
          acc[group] = (acc[group] || 0) + 1;
        });
        return acc;
      },
      {} as Record<string, number>
    );

    console.log(`📊 Hostile speech report: ${speechActs.length} acts found`);
    console.log("🔴 Top categories:", Object.keys(categories).slice(0, 3));

    return NextResponse.json({
      success: true,
      data: {
        report: {
          fromDate,
          toDate,
          totalActs: speechActs.length,
          speechActs,
        },
        summary: {
          topSpeakers: topSpeakersArray,
          categories,
          intensityBreakdown,
          targetGroups,
        },
      },
    });
  } catch (error) {
    console.error("Hostile speech API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch hostile speech data",
      },
      { status: 500 }
    );
  }
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: "/api/rabbit-hole/hostile-speech",
      description: "Query hostile speech acts with date filtering",
      method: "GET",
      parameters: {
        from: "Start date (required, format: YYYY-MM-DD)",
        to: "End date (optional, defaults to today, format: YYYY-MM-DD)",
      },
    },
    usage: {
      examples: [
        "/api/rabbit-hole/hostile-speech?from=2025-01-01",
        "/api/rabbit-hole/hostile-speech?from=2025-06-01&to=2025-06-30",
      ],
    },
    schema: {
      speechAct: {
        categories: [
          "dehumanization",
          "xenophobic_trope",
          "religious_exclusionism",
          "great_replacement_rhetoric",
          "explicit_violence_incitement",
          "menacing_rhetoric",
          "accusation_demonization",
          "delegitimizing_press",
          "militarized_xenophobia",
          "bothsidesing_extremism",
          "conspiracy_promotion",
          "apocalyptic_threat_frame",
        ],
        intensities: ["low", "medium", "high", "extreme"],
      },
    },
  });
}
