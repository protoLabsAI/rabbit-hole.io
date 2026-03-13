/**
 * Source Fetcher - Multi-Source Data Retrieval
 *
 * Parallel fetching from multiple sources (Wikipedia, files, etc.)
 */

import { queryWikipedia } from "@proto/llm-tools";

export interface SourceData {
  type: "wikipedia" | "file" | "arxiv" | "custom";
  identifier: string;
  content: string;
  metadata: {
    url: string;
    length: number;
    retrievedAt: string;
    summary?: string; // Wikipedia summary for evidence
    [key: string]: any;
  };
}

interface FetchSourcesParams {
  entityNames: string[];
  files: File[];
  sources: string[];
}

interface FetchSourcesResult {
  sourceData: SourceData[];
  errors: string[];
}

/**
 * Parse comma-separated or array entity names
 */
export function parseEntityNames(input: string | string[]): string[] {
  if (Array.isArray(input)) return input;

  return input
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

/**
 * Fetch Wikipedia content using existing client with full content length
 */
async function fetchWikipediaContent(
  entityName: string
): Promise<{ extract: string; url: string; summary: string }> {
  // Use existing Wikipedia client with maximum content length for full article
  const wikiResponse = await queryWikipedia(entityName, {
    topKResults: 1,
    maxContentLength: 50000, // Get full article (default is 4000)
  });

  const page = wikiResponse.pages.find((p) => p !== null);

  if (!page) {
    return {
      extract: "",
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(entityName)}`,
      summary: "",
    };
  }

  return {
    extract: page.content,
    url: page.url,
    summary: page.summary,
  };
}

/**
 * Extract text from file based on type
 */
async function extractTextFromFile(file: File): Promise<string> {
  const fileExt = file.name.split(".").pop()?.toLowerCase();

  switch (fileExt) {
    case "txt":
    case "md":
      return await file.text();

    case "pdf": {
      const pdfBuffer = Buffer.from(await file.arrayBuffer());
      const pdf = (await import("pdf-parse")).default;
      const pdfData = await pdf(pdfBuffer);
      return pdfData.text;
    }

    case "docx": {
      const mammoth = (await import("mammoth")).default;
      const docxBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: docxBuffer });
      return result.value;
    }

    default:
      throw new Error(`Unsupported file type: .${fileExt}`);
  }
}

/**
 * Fetch data from all sources in parallel
 */
export async function fetchSources(
  params: FetchSourcesParams
): Promise<FetchSourcesResult> {
  const results: SourceData[] = [];
  const errors: string[] = [];

  // Fetch Wikipedia (parallel)
  if (params.sources.includes("wikipedia") && params.entityNames.length > 0) {
    const wikiPromises = params.entityNames.map(async (name) => {
      try {
        const content = await fetchWikipediaContent(name);
        return {
          type: "wikipedia" as const,
          identifier: name,
          content: content.extract,
          metadata: {
            url: content.url,
            length: content.extract.length,
            retrievedAt: new Date().toISOString(),
            summary: content.summary, // Include summary for evidence
          },
        };
      } catch (error) {
        errors.push(
          `Wikipedia fetch failed for ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
        return null;
      }
    });

    const wikiResults = await Promise.all(wikiPromises);
    // Filter out null and cast as SourceData[]
    results.push(
      ...(wikiResults.filter(
        (r): r is NonNullable<typeof r> => r !== null
      ) as SourceData[])
    );
  }

  // Extract files (parallel)
  if (params.files.length > 0) {
    const filePromises = params.files.map(async (file) => {
      try {
        const content = await extractTextFromFile(file);
        return {
          type: "file" as const,
          identifier: file.name,
          content,
          metadata: {
            url: `file://uploads/${file.name}`,
            length: content.length,
            retrievedAt: new Date().toISOString(),
            mimeType: file.type,
            size: file.size,
          },
        };
      } catch (error) {
        errors.push(
          `File extraction failed for ${file.name}: ${error instanceof Error ? error.message : String(error)}`
        );
        return null;
      }
    });

    const fileResults = await Promise.all(filePromises);
    // Filter out nulls with correct type predicate
    results.push(
      ...(fileResults.filter(
        (r): r is NonNullable<typeof r> => r !== null
      ) as SourceData[])
    );
  }

  return { sourceData: results, errors };
}
