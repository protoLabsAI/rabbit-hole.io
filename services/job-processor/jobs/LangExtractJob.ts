/**
 * LangExtract Job
 *
 * Handles entity extraction from text using the LangExtract service
 * with rate limit handling and automatic retries
 */

import { Job } from "sidequest";

interface LangExtractJobData {
  // Input
  textContent: string;
  extractionPrompt: string;
  outputFormat?: Record<string, any>;

  // Context
  userId: string;
  orgId: string | null;
  workspaceId: string;

  // Optional metadata
  sourceEntityUid?: string; // If extracting from an entity
  jobType?: string; // e.g., "research", "document-analysis"
  modelId?: string;
  includeSourceGrounding?: boolean;
  temperature?: number;

  // Schema enforcement
  useSchemaConstraints?: boolean;
  customSchema?: Record<string, any>;
  examples?: Array<{ input_text: string; expected_output: any }>; // Full examples array
}

interface LangExtractJobResult {
  success: boolean;
  extractedEntities: any;
  metadata: {
    modelUsed: string;
    provider: string;
    processingTimeMs: number;
    tokenCount?: number;
    outputTokenCount?: number;
  };
  sourceGrounding?: any[];
  error?: string;
  errorType?: string; // For observability: rate_limit, quota_exhausted, client_error, server_error, validation_error, etc.
}

export class LangExtractJob extends Job {
  static readonly maxAttempts = 3;

  async run(data: LangExtractJobData): Promise<LangExtractJobResult> {
    const {
      textContent,
      extractionPrompt,
      outputFormat,
      userId,
      sourceEntityUid,
      jobType,
      modelId = "gemini-2.5-flash-lite",
      includeSourceGrounding = true,
      temperature,
      useSchemaConstraints = true,
      customSchema,
      examples,
    } = data;

    console.log(`🔍 Starting LangExtract job for ${userId}`);
    console.log(`📄 Content length: ${textContent.length} characters`);
    console.log(`🎯 Extraction goal: ${extractionPrompt}`);
    if (sourceEntityUid) {
      console.log(`🔗 Source entity: ${sourceEntityUid}`);
    }

    const startTime = Date.now();

    try {
      // Call LangExtract service - fail fast if URL not configured
      const serviceUrl = process.env.LANGEXTRACT_URL;
      if (!serviceUrl) {
        throw new Error(
          "LANGEXTRACT_URL environment variable is required but not set"
        );
      }

      const extractRequest: any = {
        text_or_documents: [textContent],
        prompt_description: extractionPrompt,
        model_id: modelId,
        include_source_grounding: includeSourceGrounding,
        use_schema_constraints: useSchemaConstraints,
      };

      // Schema enforcement: custom_schema OR examples OR outputFormat (priority order)
      if (customSchema) {
        // Explicit custom schema takes precedence
        extractRequest.custom_schema = customSchema;
      } else if (examples && examples.length > 0) {
        // Full examples array with real input_text (best for schema learning)
        extractRequest.examples = examples;
      } else if (outputFormat) {
        // Fallback: derive schema from outputFormat only
        extractRequest.examples = [
          {
            input_text: "Example text",
            expected_output: outputFormat,
          },
        ];
      }

      if (temperature !== undefined) {
        extractRequest.model_parameters = {
          temperature,
        };
      }

      console.log(`📡 Calling LangExtract: ${serviceUrl}/extract`);
      const sanitizedPayload = this.getSanitizedRequestSummary(extractRequest);
      console.log(
        `📦 Request Summary:`,
        JSON.stringify(sanitizedPayload, null, 2)
      );

      // Configure timeout (default 120s for LLM operations)
      const timeoutMs = parseInt(
        process.env.LANG_EXTRACT_TIMEOUT_MS ||
          process.env.JOB_FETCH_TIMEOUT_MS ||
          "120000",
        10
      );
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, timeoutMs);

      let response: Response;
      try {
        response = await fetch(`${serviceUrl}/extract`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(extractRequest),
          signal: abortController.signal,
        });
      } catch (fetchError: any) {
        // Treat abort/timeout as retryable error
        if (fetchError.name === "AbortError") {
          const error = new Error(
            `LangExtract request timed out after ${timeoutMs}ms`
          );
          (error as any).errorType = "timeout";
          throw error;
        }
        // Network errors are also retryable
        const error = new Error(
          `Network error calling LangExtract: ${fetchError.message}`
        );
        (error as any).errorType = "network_error";
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }

      // Handle rate limit errors (429 causes job retry)
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        const retryAfter = this.parseRetryAfter(errorData);

        console.warn(`⏳ Rate limited, retry after ${retryAfter}s`);

        const error = new Error(
          `Rate limit exceeded. Retry after ${retryAfter} seconds.`
        );
        (error as any).retryAfter = retryAfter;
        (error as any).errorType = "rate_limit";
        throw error; // Triggers Sidequest retry with backoff
      }

      // Handle RESOURCE_EXHAUSTED (treated as rate limit)
      let errorText: string | null = null;
      if (response.status === 400) {
        errorText = await response.text();
        if (errorText && errorText.includes("RESOURCE_EXHAUSTED")) {
          console.warn(`⏳ Quota exhausted, will retry...`);
          const error = new Error(
            "Quota exhausted: RESOURCE_EXHAUSTED (will retry automatically)"
          );
          (error as any).errorType = "quota_exhausted";
          throw error;
        }
      }

      // Handle other errors
      if (!response.ok) {
        // Reuse errorText if already read, otherwise read it now
        if (!errorText) {
          errorText = await response.text();
        }
        console.error(
          `❌ LangExtract responded with ${response.status}: ${errorText || "Unknown error"}`
        );

        // 4xx errors (except 429) should not retry - return failure
        if (response.status >= 400 && response.status < 500) {
          return {
            success: false,
            extractedEntities: null,
            metadata: {
              modelUsed: modelId,
              provider: "unknown",
              processingTimeMs: Date.now() - startTime,
            },
            error: `Client error: ${response.status} - ${errorText ? errorText.substring(0, 200) : "Unknown error"}`,
            errorType: "client_error",
          };
        }

        // 5xx errors should retry
        const error = new Error(
          `LangExtract service error: ${response.status} ${response.statusText}`
        );
        (error as any).errorType = "server_error";
        throw error;
      }

      const result = (await response.json()) as any;

      if (!result.success) {
        // Distinguish between retryable and non-retryable errors
        const errorMessage = result.error || "Unknown error";
        const isTransient =
          result.errorType === "transient" ||
          result.isTransient === true ||
          result.rateLimit === true;

        if (isTransient) {
          // Transient errors should retry
          const error = new Error(
            `Transient extraction error: ${errorMessage}`
          );
          (error as any).errorType = result.errorType || "transient_error";
          throw error;
        }

        // Non-transient errors (validation/format) should not retry
        console.warn(
          `⚠️ Non-retryable extraction failure: ${errorMessage.substring(0, 200)}`
        );
        return {
          success: false,
          extractedEntities: null,
          metadata: {
            modelUsed: result.metadata?.model_used || modelId,
            provider: result.metadata?.provider || "unknown",
            processingTimeMs: Date.now() - startTime,
          },
          error: `Validation/format error: ${errorMessage}`,
          errorType: result.errorType || "validation_error",
        };
      }

      const processingTimeMs = Date.now() - startTime;

      console.log(
        `✅ Extraction completed using ${result.metadata?.model_used || modelId}`
      );
      console.log(`⏱️ Processing time: ${processingTimeMs}ms`);

      return {
        success: true,
        extractedEntities: result.data,
        metadata: {
          modelUsed: result.metadata?.model_used || modelId,
          provider: result.metadata?.provider || "gemini",
          processingTimeMs,
          tokenCount: result.metadata?.token_count,
          outputTokenCount: result.metadata?.output_token_count,
        },
        sourceGrounding: result.source_grounding || [],
      };
    } catch (error) {
      console.error(`❌ LangExtract job failed:`, error);

      // Throw to trigger Sidequest retry
      throw error;
    }
  }

  /**
   * Parse retry-after duration from Gemini error response
   */
  private parseRetryAfter(errorData: any): number {
    try {
      // Gemini returns: "Please retry in 24.195338507s"
      const message = errorData?.detail || JSON.stringify(errorData);
      const match = message.match(/retry in ([\d.]+)s/);
      if (match) {
        return Math.ceil(parseFloat(match[1]));
      }

      // Default to 60 seconds if can't parse
      return 60;
    } catch {
      return 60;
    }
  }

  /**
   * Sanitizes the request payload for logging by redacting sensitive text content
   * and summarizing document information.
   */
  private getSanitizedRequestSummary(request: any): any {
    const sanitizedRequest: any = { ...request };

    // Redact text_or_documents if it's an array of strings
    if (Array.isArray(sanitizedRequest.text_or_documents)) {
      sanitizedRequest.text_or_documents =
        sanitizedRequest.text_or_documents.map(
          (doc: string) => `<${doc.length} chars>`
        );
    }

    // Redact prompt_description if it's a string
    if (typeof sanitizedRequest.prompt_description === "string") {
      sanitizedRequest.prompt_description = `<${sanitizedRequest.prompt_description.length} chars>`;
    }

    // Redact custom_schema if it's an object
    if (sanitizedRequest.custom_schema) {
      const schemaFieldCount =
        typeof sanitizedRequest.custom_schema === "object"
          ? Object.keys(sanitizedRequest.custom_schema).length
          : 0;
      sanitizedRequest.custom_schema = {
        CUSTOM_SCHEMA_OMITTED: true,
        fieldCount: schemaFieldCount,
      };
    }

    // Redact examples if it's an array of objects
    if (sanitizedRequest.examples) {
      sanitizedRequest.examples = sanitizedRequest.examples.map(
        (example: any) => {
          const sanitizedExample: any = { ...example };
          // Redact input_text if it's a string
          if (typeof sanitizedExample.input_text === "string") {
            sanitizedExample.input_text = `<${sanitizedExample.input_text.length} chars>`;
          }
          // Redact expected_output if it's an object
          if (typeof sanitizedExample.expected_output === "object") {
            sanitizedExample.expected_output = {
              REDACTED: true,
              summary: "expected_output removed",
            };
          }
          return sanitizedExample;
        }
      );
    }

    // Redact outputFormat if it's an object
    if (sanitizedRequest.outputFormat) {
      const fieldsCount =
        typeof sanitizedRequest.outputFormat === "object"
          ? Object.keys(sanitizedRequest.outputFormat).length
          : 0;
      sanitizedRequest.outputFormat = {
        REDACTED: true,
        type: "outputFormat",
        fieldsCount,
      };
    }

    return sanitizedRequest;
  }
}
