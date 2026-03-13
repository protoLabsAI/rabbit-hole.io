import { z } from "zod";

const modelConfigSchema = z.object({
  name: z.string().min(1, "Model name is required"),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const providerConfigSchema = z.object({
  enabled: z.boolean(),
  apiKey: z.string().optional(),
  baseURL: z.string().url().optional().or(z.literal("")),
  models: z.record(z.string(), z.array(modelConfigSchema)),
  metadata: z.record(z.string(), z.any()).optional(),
});

const llmProvidersConfigSchema = z.object({
  defaultProvider: z.string().optional(),
  defaultCategory: z
    .enum(["fast", "smart", "reasoning", "vision", "long", "coding"])
    .optional(),
  providers: z.record(z.string(), providerConfigSchema),
});

/**
 * Validate configuration object
 * @throws {Error} If configuration is invalid
 */
export function validateConfig(config: any): void {
  const result = llmProvidersConfigSchema.safeParse(config);

  if (!result.success) {
    // Zod v4 uses issues array instead of errors
    const issues = (result.error as any).issues || [];
    const messages = issues.map(
      (issue: any) => `${issue.path?.join?.(".") || "root"}: ${issue.message}`
    );
    throw new Error(
      `Invalid LLM provider configuration:\n${messages.join("\n")}`
    );
  }
}
