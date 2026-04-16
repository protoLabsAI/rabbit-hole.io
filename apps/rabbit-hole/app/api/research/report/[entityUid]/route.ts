/**
 * Entity Research Report API
 *
 * Generates comprehensive markdown-formatted research reports
 * analyzing missing temporal data and research priorities for entities.
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuthAndLogging } from "@protolabsai/auth";
import { AnalysisResponse } from "@protolabsai/types";
import { getMissingDatesForEntity } from "@protolabsai/utils/atlas";

interface ResearchReportData {
  entityUid: string;
  entityName: string;
  markdownReport: string;
  metrics: {
    totalMissingDates: number;
    intrinsicMissing: number;
    temporalMissing: number;
    researchPriority: "high" | "medium" | "low";
  };
}

export const GET = withAuthAndLogging("research report")(async (
  request: NextRequest
): Promise<NextResponse<AnalysisResponse<ResearchReportData>>> => {
  const startTime = Date.now();

  try {
    // Extract entityUid from URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const entityUid = pathSegments[pathSegments.length - 1];

    console.log(`📊 Research report request from authenticated user`);

    if (!entityUid) {
      return NextResponse.json(
        {
          success: false,
          error: "Entity UID is required",
        },
        { status: 400 }
      );
    }

    console.log(
      `📊 Generating comprehensive research report for: ${entityUid}`
    );

    // Get missing dates analysis for the entity
    const missingDatesInfo = await getMissingDatesForEntity(entityUid);

    if (!missingDatesInfo) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to analyze entity: ${entityUid}`,
        },
        { status: 404 }
      );
    }

    // Get biographical analysis for the entity
    let biographicalAnalysis: any = null;
    try {
      const bioResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/research/biographical/${entityUid}`,
        {
          headers: {
            // Forward the authorization for the biographical analysis
            Cookie: request.headers.get("Cookie") || "",
          },
        }
      );

      if (bioResponse.ok) {
        const bioResult = await bioResponse.json();
        if (bioResult.success) {
          biographicalAnalysis = bioResult.data;
          console.log(
            `📊 Biographical analysis included: ${biographicalAnalysis?.researchPriority?.totalGaps || 0} biographical gaps`
          );
        }
      }
    } catch (error) {
      console.warn(
        "Failed to include biographical analysis in research report:",
        error
      );
      // Continue without biographical data - timeline-only report
    }

    // Generate comprehensive markdown report
    const markdownReport = generateMarkdownReport(
      missingDatesInfo,
      biographicalAnalysis
    );

    return NextResponse.json({
      success: true,
      data: {
        analysis: {
          entityUid: missingDatesInfo.entityUid,
          entityName: missingDatesInfo.entityName,
          markdownReport,
          metrics: {
            totalMissingDates: missingDatesInfo.summary.totalMissingDates,
            intrinsicMissing: missingDatesInfo.summary.intrinsicMissing,
            temporalMissing: missingDatesInfo.summary.relationshipsMissing,
            researchPriority: missingDatesInfo.summary.researchPriority,
          },
        },
        summary: {
          totalItems: missingDatesInfo.summary.totalMissingDates,
          processingTime: Date.now() - startTime,
          completenessScore:
            biographicalAnalysis?.researchPriority?.completenessScore || 1,
        },
        metadata: {
          analysisType: "research-report",
          version: "1.0",
          parameters: {
            includeBiographical: !!biographicalAnalysis,
            biographicalGaps:
              biographicalAnalysis?.researchPriority?.totalGaps || 0,
          },
        },
      },
    });
  } catch (error) {
    console.error("Research report API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate research report",
      },
      { status: 500 }
    );
  }
});

/**
 * Generate comprehensive markdown-formatted research report
 * Includes both timeline analysis and biographical analysis
 */
function generateMarkdownReport(
  missingInfo: any,
  biographicalAnalysis: any = null
): string {
  const {
    entityName,
    entityType,
    missingIntrinsicDates,
    missingRelationshipDates,
    summary,
  } = missingInfo;

  const priorityEmoji = {
    high: "🔴",
    medium: "🟡",
    low: "🟢",
  };

  const importanceEmoji = {
    critical: "🔴",
    major: "🟠",
    minor: "⚪",
  };

  // Calculate comprehensive metrics
  const biographicalGaps =
    biographicalAnalysis?.researchPriority?.totalGaps || 0;
  const totalResearchGaps = summary.totalMissingDates + biographicalGaps;
  const biographicalCompleteness = Math.round(
    (biographicalAnalysis?.researchPriority?.completenessScore || 1) * 100
  );

  let report = `# Comprehensive Research Analysis: ${entityName}

**Entity Type:** ${entityType}  
**Research Priority:** ${priorityEmoji[summary.researchPriority as keyof typeof priorityEmoji]} **${summary.researchPriority.toUpperCase()}**  
**Total Research Gaps:** ${totalResearchGaps} (${summary.totalMissingDates} temporal + ${biographicalGaps} biographical)

---

## 📊 Summary

| Metric | Count |
|--------|-------|
| **Total Missing Dates** | ${summary.totalMissingDates} |
| **Entity Dates Missing** | ${summary.intrinsicMissing} |
| **Relationship Dates Missing** | ${summary.relationshipsMissing} |
| **Research Priority** | ${summary.researchPriority} |
${
  biographicalAnalysis
    ? `| **Biographical Gaps** | ${biographicalGaps} |
| **Biographical Completeness** | ${biographicalCompleteness}% |`
    : ""
}

---
`;

  // Missing Intrinsic Dates Section
  if (missingIntrinsicDates.length > 0) {
    report += `## 🟡 Missing Entity Dates (${missingIntrinsicDates.length})

**Critical temporal data missing for ${entityName}:**

| Field | Importance | Research Needed |
|-------|------------|-----------------|
`;

    missingIntrinsicDates.forEach((missing: any) => {
      report += `| **${missing.label}** | ${importanceEmoji[missing.importance as keyof typeof importanceEmoji]} ${missing.importance} | ${missing.description} |\n`;
    });

    report += `\n**Research Actions:**\n\n`;
    missingIntrinsicDates.forEach((missing: any) => {
      report += `- [ ] Research ${missing.label} for ${entityName}\n`;
      report += `  - **Field:** \`${missing.field}\`\n`;
      report += `  - **Priority:** ${missing.importance}\n`;
      report += `  - **Method:** ${getResearchMethod(missing.field, entityType)}\n\n`;
    });

    report += `---\n\n`;
  }

  // Missing Relationship Dates Section
  if (missingRelationshipDates.length > 0) {
    report += `## 🟠 Missing Relationship Dates (${missingRelationshipDates.length})

**Relationships requiring temporal research:**

`;

    // Group by importance
    const byImportance = missingRelationshipDates.reduce(
      (acc: any, rel: any) => {
        if (!acc[rel.importance]) acc[rel.importance] = [];
        acc[rel.importance].push(rel);
        return acc;
      },
      {}
    );

    ["critical", "major", "minor"].forEach((importance) => {
      const relationships = byImportance[importance];
      if (!relationships || relationships.length === 0) return;

      report += `### ${importanceEmoji[importance as keyof typeof importanceEmoji]} ${importance.charAt(0).toUpperCase() + importance.slice(1)} Priority (${relationships.length})\n\n`;

      relationships.forEach((rel: any) => {
        report += `**${rel.relationshipType.replace(/_/g, " ")}** → ${rel.targetEntityName}\n`;
        report += `- **Relationship ID:** \`${rel.relationshipId}\`\n`;
        report += `- **Target:** ${rel.targetEntityName} (${rel.targetEntityUid})\n`;
        report += `- **Research Need:** ${rel.description}\n\n`;
      });
    });

    report += `**Bulk Research Actions:**\n\n`;
    const majorRelationships = missingRelationshipDates.filter(
      (r: any) => r.importance === "major"
    );
    if (majorRelationships.length > 0) {
      report += `- [ ] **Priority Focus:** Research dates for ${majorRelationships.length} major relationships\n`;
      majorRelationships.slice(0, 3).forEach((rel: any) => {
        report += `  - ${rel.relationshipType} with ${rel.targetEntityName}\n`;
      });
      if (majorRelationships.length > 3) {
        report += `  - ... and ${majorRelationships.length - 3} more major relationships\n`;
      }
      report += `\n`;
    }

    const minorRelationships = missingRelationshipDates.filter(
      (r: any) => r.importance === "minor"
    );
    if (minorRelationships.length > 0) {
      report += `- [ ] **Secondary Focus:** Research dates for ${minorRelationships.length} minor relationships\n\n`;
    }

    report += `---\n\n`;
  }

  // Biographical Gaps Section
  if (biographicalAnalysis && biographicalAnalysis.missingFields.length > 0) {
    report += `## 👤 Missing Biographical Data (${biographicalAnalysis.missingFields.length})

**Essential biographical information gaps:**

| Field | Priority | Research Suggestion |
|-------|----------|-------------------|
`;

    biographicalAnalysis.missingFields.forEach((field: any) => {
      const priorityEmoji =
        field.priority === "high"
          ? "🔴"
          : field.priority === "medium"
            ? "🟡"
            : "🟢";
      report += `| **${field.displayName}** | ${priorityEmoji} ${field.priority} | ${field.researchSuggestion} |\n`;
    });

    report += `\n**Biographical Research Actions:**\n\n`;

    // Group by priority
    const byPriority = biographicalAnalysis.missingFields.reduce(
      (acc: any, field: any) => {
        if (!acc[field.priority]) acc[field.priority] = [];
        acc[field.priority].push(field);
        return acc;
      },
      {}
    );

    ["high", "medium", "low"].forEach((priority) => {
      const fields = byPriority[priority];
      if (!fields || fields.length === 0) return;

      const priorityEmoji =
        priority === "high" ? "🔴" : priority === "medium" ? "🟡" : "🟢";
      report += `### ${priorityEmoji} ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority Biographical Research\n\n`;

      fields.forEach((field: any) => {
        report += `- [ ] **${field.displayName}** for ${entityName}\n`;
        report += `  - **Field:** \`${field.field}\`\n`;
        report += `  - **Method:** ${field.researchSuggestion}\n\n`;
      });
    });

    report += `**Research Guidance:**\n`;
    report += `- **Estimated Time:** ${biographicalAnalysis.researchGuidance.estimatedResearchTime}\n`;
    report += `- **Research Difficulty:** ${biographicalAnalysis.researchPriority.researchDifficulty}\n`;
    report += `- **Current Completeness:** ${biographicalCompleteness}%\n\n`;

    if (biographicalAnalysis.researchGuidance.searchKeywords?.length > 0) {
      report += `**Search Keywords:** ${biographicalAnalysis.researchGuidance.searchKeywords.join(", ")}\n\n`;
    }

    report += `---\n\n`;
  }

  // Research Recommendations
  report += `## 🎯 Research Recommendations

### Immediate Actions

`;

  if (
    summary.researchPriority === "high" ||
    (biographicalAnalysis &&
      biographicalAnalysis.researchPriority.researchDifficulty === "hard")
  ) {
    report += `**🔴 HIGH PRIORITY:** This entity requires immediate research attention.

`;

    let actionCounter = 1;

    // Biographical high-priority items
    if (biographicalAnalysis) {
      const highPriorityBio = biographicalAnalysis.missingFields.filter(
        (f: any) => f.priority === "high"
      );
      if (highPriorityBio.length > 0) {
        report += `${actionCounter}. **Critical Biographical Data** - Research missing ${highPriorityBio.map((f: any) => f.displayName.toLowerCase()).join(", ")}
   - Essential for entity understanding and analysis
   - ${biographicalAnalysis.researchPriority.researchDifficulty} difficulty research
   - Target: Complete within ${biographicalAnalysis.researchGuidance.estimatedResearchTime}

`;
        actionCounter++;
      }
    }

    if (missingIntrinsicDates.length > 0) {
      report += `${actionCounter}. **Critical Entity Dates** - Research missing ${missingIntrinsicDates.map((m: any) => m.label.toLowerCase()).join(", ")}
   - These are fundamental to understanding ${entityName}'s lifecycle
   - Use biographical sources, government records, or corporate filings
   - Target: Complete within 48-72 hours

`;
      actionCounter++;
    }

    if (summary.relationshipsMissing > 10) {
      report += `${actionCounter}. **Relationship Timeline** - ${summary.relationshipsMissing} relationships lack temporal data
   - Focus on major relationships (OWNS, HOLDS_ROLE, FUNDS) first
   - Use news archives, corporate announcements, and official records
   - Target: Complete major relationships within 1 week

`;
    }
  } else if (
    summary.researchPriority === "medium" ||
    (biographicalAnalysis &&
      biographicalAnalysis.researchPriority.researchDifficulty === "medium")
  ) {
    report += `**🟡 MEDIUM PRIORITY:** Moderate research needs for comprehensive analysis.

`;
    const actionCounter = 1;

    if (
      biographicalAnalysis &&
      biographicalAnalysis.researchPriority.totalGaps > 0
    ) {
      report += `${actionCounter}. **Biographical Completion** - Fill ${biographicalAnalysis.researchPriority.totalGaps} biographical gaps (${biographicalCompleteness}% complete)
${actionCounter + 1}. **Relationship Dating** - Focus on major relationships without temporal data
${actionCounter + 2}. **Entity Date Validation** - Verify any existing dates for accuracy

`;
    } else {
      report += `1. **Relationship Dating** - Focus on major relationships without temporal data
2. **Entity Date Validation** - Verify any existing dates for accuracy

`;
    }
  } else {
    report += `**🟢 LOW PRIORITY:** Research profile is relatively complete.

1. **Quality Review** - Validate existing temporal and biographical data for accuracy
2. **Minor Relationship Dating** - Add dates to remaining undated relationships when convenient
${
  biographicalAnalysis && biographicalAnalysis.researchPriority.totalGaps > 0
    ? `3. **Biographical Polish** - Complete remaining ${biographicalAnalysis.researchPriority.totalGaps} low-priority biographical fields`
    : ""
}

`;
  }

  // Research Sources
  report += `### Recommended Research Sources

**For ${entityType} entities:**

`;

  const sources = getResearchSources(entityType);
  sources.forEach((source) => {
    report += `- **${source.name}**: ${source.description}\n`;
    if (source.url) report += `  - URL: ${source.url}\n`;
    report += `  - Reliability: ${source.reliability}\n\n`;
  });

  // Research Impact
  report += `### Expected Research Impact

**Completion Goals:**
- **Timeline Completeness:** ${Math.round((1 - summary.totalMissingDates / (summary.totalMissingDates + 20)) * 100)}% (estimated)
${biographicalAnalysis ? `- **Biographical Completeness:** ${biographicalCompleteness}%` : ""}
- **Target Completeness:** 95% for intrinsic dates, 80% for major relationships, 90% for biographical data
- **Research ROI:** Each completed field improves entity analysis quality and research accuracy

**Benefits of Completion:**
- Enhanced timeline visualization with full chronological context
- Complete biographical profile for comprehensive entity understanding
- Improved relationship analysis and pattern recognition
- Better evidence correlation and source attribution
- Complete forensic analysis capabilities for ${entityName}
${biographicalAnalysis ? `- Improved research guidance with ${biographicalAnalysis.researchGuidance.searchKeywords.length} targeted search terms` : ""}

---

## 🔍 Research Methodology

### Data Collection Standards

**Date Format:** All dates must be in YYYY-MM-DD format  
**Evidence Required:** Every date must include source attribution  
**Confidence Scoring:** Rate source reliability 0.0-1.0  
**Validation:** Cross-reference dates across multiple sources when possible

### Quality Assurance

**Before adding temporal data:**
1. Verify date format and logical consistency
2. Include source evidence with reliability scoring
3. Cross-check against existing timeline events
4. Update relationship confidence scores appropriately

**After adding temporal data:**
1. Refresh entity timeline to verify changes
2. Check for timeline consistency issues
3. Update research priority classification
4. Monitor impact on related entity timelines

---

*Generated on ${new Date().toISOString().split("T")[0]} by Comprehensive Research Analysis System*  
*Timeline Analysis: ${summary.totalMissingDates} gaps • Biographical Analysis: ${biographicalGaps} gaps*
`;

  return report;
}

/**
 * Get recommended research sources for entity type
 */
function getResearchSources(entityType: string): Array<{
  name: string;
  description: string;
  url?: string;
  reliability: string;
}> {
  const commonSources = [
    {
      name: "Wikipedia",
      description: "Biographical and organizational information with citations",
      url: "https://en.wikipedia.org",
      reliability: "0.7-0.9 (verify citations)",
    },
  ];

  switch (entityType.toLowerCase()) {
    case "person":
      return [
        ...commonSources,
        {
          name: "Genealogy websites",
          description: "Birth and death records, family information",
          reliability: "0.6-0.8 (verify sources)",
        },
        {
          name: "Government vital records",
          description: "Official birth and death certificates",
          reliability: "0.9-1.0 (authoritative)",
        },
        {
          name: "News archives",
          description: "Life events, career milestones, public activities",
          reliability: "0.7-0.9 (depends on publication)",
        },
      ];

    case "organization":
      return [
        ...commonSources,
        {
          name: "Corporate registries",
          description: "Official incorporation and dissolution records",
          reliability: "0.9-1.0 (authoritative)",
        },
        {
          name: "SEC filings",
          description: "Public company founding dates, major events",
          url: "https://www.sec.gov/edgar",
          reliability: "0.9-1.0 (authoritative)",
        },
        {
          name: "Business news archives",
          description: "Company founding, acquisitions, major milestones",
          reliability: "0.8-0.9 (verify sources)",
        },
      ];

    case "platform":
      return [
        ...commonSources,
        {
          name: "Internet Archive",
          description: "Platform launch dates and historical changes",
          url: "https://archive.org",
          reliability: "0.8-0.9 (historical verification)",
        },
        {
          name: "Tech news archives",
          description: "Platform launches, shutdowns, major updates",
          reliability: "0.7-0.9 (verify sources)",
        },
      ];

    case "movement":
      return [
        ...commonSources,
        {
          name: "Academic publications",
          description: "Movement origins, development, transformation",
          reliability: "0.8-0.9 (peer reviewed)",
        },
        {
          name: "News archives",
          description: "Movement emergence and key events",
          reliability: "0.7-0.8 (verify sources)",
        },
      ];

    case "event":
      return [
        ...commonSources,
        {
          name: "News archives",
          description: "Event dates, duration, and details",
          reliability: "0.8-0.9 (contemporary reporting)",
        },
        {
          name: "Government records",
          description: "Official event documentation and dates",
          reliability: "0.9-1.0 (authoritative)",
        },
      ];

    default:
      return commonSources;
  }
}

/**
 * Get research method for specific field and entity type
 */
function getResearchMethod(field: string, entityType: string): string {
  const methodMap: Record<string, Record<string, string>> = {
    Person: {
      birthDate:
        "Check biographical sources, genealogy records, government vital statistics",
      deathDate: "Check obituaries, death certificates, news archives",
    },
    Organization: {
      founded:
        "Check corporate registries, SEC filings, business news archives",
      dissolved: "Check dissolution filings, bankruptcy records, news reports",
      acquired: "Check M&A announcements, SEC filings, business news",
    },
    Platform: {
      launched:
        "Check tech news archives, Internet Archive, company announcements",
      shutdown: "Check tech news, company announcements, user communications",
    },
    Movement: {
      founded: "Check academic sources, news archives, movement documentation",
      ended: "Check news archives, academic analysis, movement documentation",
    },
    Event: {
      date: "Check news archives, government records, eyewitness accounts",
      endDate: "Check event documentation, news coverage, official records",
    },
  };

  return (
    methodMap[entityType]?.[field] ||
    `Research ${field} using appropriate sources for ${entityType} entities`
  );
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: "/api/research/report/[entityUid]",
      description:
        "Generate comprehensive markdown research report for entity temporal gaps",
      method: "GET",
      parameters: {
        entityUid: "Entity UID (required)",
      },
    },
    usage: {
      examples: [
        "/api/research/report/person:donald_trump",
        "/api/research/report/org:infowars",
        "/api/research/report/movement:maga",
        "/api/research/report/event:january_6_2021_capitol_attack",
      ],
    },
  });
}
