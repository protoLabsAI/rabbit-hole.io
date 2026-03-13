"use client";

import dynamic from "next/dynamic";

export const LLMProviderPlayground = dynamic(
  () =>
    import("@proto/llm-tools/playgrounds/llm-provider-playground").then(
      (m) => ({
        default: m.LLMProviderPlayground,
      })
    ),
  { ssr: false }
);
