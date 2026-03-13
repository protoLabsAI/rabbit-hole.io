/**
 * Evidence Details API
 *
 * Provides detailed evidence information including title, publisher,
 * content excerpts, and source verification for enhanced popup display
 */

import { readFile } from "fs/promises";
import { join } from "path";

import { NextRequest, NextResponse } from "next/server";

const PARTITIONS_BASE = "public/evidence-graphs/partitioned";

interface EvidenceEntry {
  id: string;
  title: string;
  date: string;
  publisher: string;
  url: string;
  type: "primary" | "secondary" | "analysis" | "speech_act";
  notes?: string;
  quote?: string;
  archived?: boolean;
  reliability?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let { id } = params;

  // Fix malformed speech evidence IDs that have duplicate "speech:"
  // e.g., "ev_speech:speech:trump_2015_launch_mexicans_0" -> "ev_speech:trump_2015_launch_mexicans_0"
  if (id.includes("speech:speech:")) {
    id = id.replace("speech:speech:", "speech:");
  }

  try {
    // Search for evidence across all evidence partitions
    const evidenceCategories = [
      "government",
      "major-media",
      "major_media", // Also check underscore version
      "investigative",
      "broadcast-media",
      "broadcast_media", // Also check underscore version
      "other",
    ];

    for (const category of evidenceCategories) {
      try {
        const partitionPath = join(
          process.cwd(),
          PARTITIONS_BASE,
          "evidence",
          `${category}.json`
        );
        const partitionContent = await readFile(partitionPath, "utf-8");
        const partitionData = JSON.parse(partitionContent);

        // Handle both wrapped and direct array formats
        const partition = partitionData.data || partitionData;

        // Find evidence entry by ID
        const evidence = partition.find(
          (entry: EvidenceEntry) => entry.id === id
        );

        if (evidence) {
          // Enhance evidence with additional metadata
          const enhancedEvidence = {
            ...evidence,
            reliability: calculateReliability(evidence),
            archived: checkIfArchived(evidence),
            category: category,
            found_in: `evidence/${category}`,
          };

          return NextResponse.json({
            success: true,
            data: enhancedEvidence,
          });
        }
      } catch (partitionError) {
        // Continue searching other partitions
        console.warn(
          `Could not read evidence partition ${category}:`,
          partitionError
        );
      }
    }

    // If not found in evidence partitions, check for speech act evidence
    try {
      const speechActPath = join(process.cwd(), "hate_rhetoric_seed.json");
      const speechActContent = await readFile(speechActPath, "utf-8");
      const speechData = JSON.parse(speechActContent);

      // Check in speech acts
      if (speechData.evidence) {
        const speechEvidence = speechData.evidence.find(
          (entry: any) => entry.id === id
        );
        if (speechEvidence) {
          return NextResponse.json({
            success: true,
            data: {
              ...speechEvidence,
              type: "speech_act",
              reliability: 0.85, // High reliability for documented speech acts
              category: "speech_act",
              found_in: "hate_rhetoric_seed",
            },
          });
        }
      }
    } catch (speechError) {
      console.warn("Could not read speech act data:", speechError);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Evidence not found",
      },
      { status: 404 }
    );
  } catch (error) {
    console.error("❌ Evidence Details API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load evidence details",
      },
      { status: 500 }
    );
  }
}

// Calculate reliability score based on evidence properties
function calculateReliability(evidence: EvidenceEntry): number {
  let score = 0.5; // Base score

  // Publisher reliability
  const highReliabilityPublishers = [
    "Washington Post",
    "New York Times",
    "Wall Street Journal",
    "Reuters",
    "Associated Press",
    "BBC",
    "NPR",
    "PBS",
    "Federal Bureau of Investigation",
    "Department of Justice",
    "U.S. Senate",
    "U.S. House of Representatives",
  ];

  const mediumReliabilityPublishers = [
    "CNN",
    "Fox News",
    "MSNBC",
    "ABC News",
    "CBS News",
    "NBC News",
    "Politico",
    "The Hill",
    "USA Today",
  ];

  if (
    highReliabilityPublishers.some((pub) =>
      evidence.publisher.toLowerCase().includes(pub.toLowerCase())
    )
  ) {
    score += 0.4;
  } else if (
    mediumReliabilityPublishers.some((pub) =>
      evidence.publisher.toLowerCase().includes(pub.toLowerCase())
    )
  ) {
    score += 0.25;
  }

  // Primary source bonus
  if (evidence.type === "primary") {
    score += 0.2;
  } else if (evidence.type === "secondary") {
    score += 0.1;
  }

  // URL reliability (government domains, established media)
  if (evidence.url.includes(".gov")) {
    score += 0.25;
  } else if (evidence.url.includes(".edu")) {
    score += 0.15;
  }

  // Date recency (more recent = slightly more reliable for ongoing events)
  const evidenceDate = new Date(evidence.date);
  const now = new Date();
  const daysDiff =
    (now.getTime() - evidenceDate.getTime()) / (1000 * 3600 * 24);

  if (daysDiff < 30) {
    score += 0.05;
  } else if (daysDiff > 365 * 2) {
    score -= 0.05;
  }

  return Math.min(Math.max(score, 0), 1); // Clamp between 0 and 1
}

// Check if evidence is archived (simple heuristic)
function checkIfArchived(evidence: EvidenceEntry): boolean {
  if (evidence.notes?.toLowerCase().includes("archive")) {
    return true;
  }
  if (
    evidence.url.includes("archive.org") ||
    evidence.url.includes("web.archive.org") ||
    evidence.url.includes("archive.today")
  ) {
    return true;
  }
  return false;
}
