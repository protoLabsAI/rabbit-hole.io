import { tool } from "@langchain/core/tools";
import { z } from "zod";

import type {
  LangExtractRequest,
  LangExtractResponse,
} from "@protolabsai/types";

import { langextractConfig } from "../config/langextract-config";

/**
 * LangExtract Service Client Tool
 *
 * Calls the langextract microservice to extract structured entity data
 * from raw text using LLM-powered extraction.
 */
export const langextractClientTool = tool(
  async (input: unknown): Promise<LangExtractResponse> => {
    const args = input as LangExtractRequest;
    const {
      textOrDocuments,
      promptDescription = "Extract person information including name, occupation, education, and biographical details",
      modelId = langextractConfig.defaults.modelId,
      serviceUrl = langextractConfig.getServiceUrl(),
      includeSourceGrounding = true,
      examples = [
        {
          input_text:
            "Alex Thompson is the Chief Technology Officer at InnovateCorp. He graduated with a Masters in Engineering from MIT in 2019.",
          expected_output: {
            name: "Alex Thompson",
            occupation: "Chief Technology Officer",
            company: "InnovateCorp",
            education: ["Masters in Engineering from MIT (2019)"],
          },
        },
      ],
    } = args;

    console.log(`🔧 Calling langextract service for extraction...`);
    console.log(`📊 Input: ${textOrDocuments.length} documents`);

    try {
      const extractRequest = {
        text_or_documents: textOrDocuments,
        prompt_description: promptDescription,
        model_id: modelId,
        include_source_grounding: includeSourceGrounding,
        examples,
      };

      console.log(`📡 Making request to: ${serviceUrl}/extract`);

      const response = await fetch(`${serviceUrl}/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(extractRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `❌ LangExtract service responded with ${response.status}: ${errorText}`
        );
        console.error(
          `❌ Request was:`,
          JSON.stringify(extractRequest, null, 2)
        );
        throw new Error(
          `LangExtract service error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const result = (await response.json()) as any;

      if (!result.success) {
        throw new Error(
          `Extraction failed: ${result.error || "Unknown error"}`
        );
      }

      console.log(
        `✅ LangExtract extraction completed using ${
          result.metadata?.model_used || modelId
        }`
      );
      console.log(
        `⏱️ Processing time: ${result.metadata?.processing_time_ms || 0}ms`
      );

      return {
        success: true,
        extractedData: result.data,
        metadata: {
          modelUsed: result.metadata?.model_used || modelId,
          provider: result.metadata?.provider || "unknown",
          processingTimeMs: result.metadata?.processing_time_ms || 0,
          tokenCount: result.metadata?.token_count,
          outputTokenCount: result.metadata?.output_token_count,
          temperature: result.metadata?.temperature,
          maxTokens: result.metadata?.max_tokens,
          fenceOutput: result.metadata?.fence_output,
          useSchemaConstraints: result.metadata?.use_schema_constraints,
        },
        sourceGrounding: result.source_grounding || [],
        rawResponse: result,
      };
    } catch (error) {
      console.error(`❌ LangExtract service call failed:`, error);
      // Just throw the error, no fallback handling
      throw error;
    }
  },
  {
    name: "langextractClient",
    description:
      "Call langextract microservice to extract structured data from text using LLMs",
    schema: z.object({
      textOrDocuments: z
        .array(z.string())
        .min(1, "At least one document required")
        .describe("Array of text documents to extract from"),

      promptDescription: z
        .string()
        .optional()
        .describe("Description of what information to extract"),

      modelId: z
        .string()
        .optional()
        .describe(
          "Model ID to use (e.g., 'gemini-2.5-flash', 'gpt-4o', 'gemma2:2b')"
        ),

      serviceUrl: z
        .string()
        .optional()
        .describe("URL of the langextract service"),

      includeSourceGrounding: z
        .boolean()
        .optional()
        .describe("Whether to include source text grounding"),

      examples: z
        .array(
          z.object({
            input_text: z.string().describe("Example input text"),
            expected_output: z
              .record(z.string(), z.any())
              .describe("Expected structured output"),
          })
        )
        .optional()
        .describe("Few-shot learning examples"),

      customSchema: z
        .record(z.string(), z.any())
        .optional()
        .describe("Custom JSON schema for structured output"),

      modelParameters: z
        .object({
          temperature: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe("Sampling temperature"),
          maxTokens: z
            .number()
            .positive()
            .optional()
            .describe("Maximum tokens to generate"),
          topP: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe("Nucleus sampling parameter"),
          topK: z
            .number()
            .positive()
            .optional()
            .describe("Top-k sampling parameter"),
        })
        .optional()
        .describe("Model-specific parameters"),
    }),
  }
);
