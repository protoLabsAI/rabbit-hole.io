/**
 * Thin OpenAI-compat chat client. Points at the LiteLLM gateway by default
 * so all model traffic is observability-traced + cost-accounted in Langfuse.
 *
 * Intentionally hand-rolled (no openai SDK dep) so the CLI install stays
 * tiny. Only the chat/completions endpoint is used.
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export class LlmClient {
  constructor(
    private baseUrl: string,
    private apiKey: string | undefined,
    private model: string
  ) {}

  async chat(
    messages: ChatMessage[],
    opts: { temperature?: number; maxTokens?: number } = {}
  ): Promise<string> {
    if (!this.apiKey)
      throw new Error("RH_LLM_KEY not set (gateway/master key required)");
    const r = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 4000,
      }),
    });
    if (!r.ok)
      throw new Error(`llm chat failed: ${r.status} ${await r.text()}`);
    const json = (await r.json()) as {
      choices: { message: { content: string } }[];
    };
    return json.choices[0]?.message?.content ?? "";
  }
}
