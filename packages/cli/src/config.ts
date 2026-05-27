import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { parse as parseYaml } from "yaml";

/**
 * Resolved CLI configuration.
 *
 * Sources, in priority order (highest first):
 *   1. CLI flags (handed in via `overrides` from the command layer)
 *   2. Env vars (RH_* prefix)
 *   3. `~/.config/rh/config.yaml`
 *   4. Defaults baked in below
 */
export type Config = {
  jobProcessorUrl: string;
  /** SearXNG JSON endpoint — our in-house web search. Preferred over Tavily. */
  searxngEndpoint: string;
  /** Optional external fallback when SearXNG is unreachable / unset. */
  tavilyApiKey?: string;
  llmBaseUrl: string;
  llmKey?: string;
  llmModel: string;
};

const DEFAULTS: Config = {
  // Defaults assume the CLI is running inside the docker network where
  // job-processor + gateway + searxng resolve as service hostnames. Override
  // via env (e.g. http://ava:8680) when running from outside.
  jobProcessorUrl: "http://job-processor:8680",
  searxngEndpoint: "http://searxng:8080",
  llmBaseUrl: "http://gateway:4000/v1",
  llmModel: "protolabs/smart",
};

function loadFile(): Partial<Config> {
  const path =
    process.env.RH_CONFIG_PATH || join(homedir(), ".config/rh/config.yaml");
  if (!existsSync(path)) return {};
  try {
    const raw = parseYaml(readFileSync(path, "utf8")) || {};
    return {
      jobProcessorUrl: raw.job_processor_url,
      searxngEndpoint: raw.searxng_endpoint,
      tavilyApiKey: raw.tavily_api_key,
      llmBaseUrl: raw.llm_base_url,
      llmKey: raw.llm_key,
      llmModel: raw.llm_model,
    };
  } catch (err) {
    process.stderr.write(
      `rh: warning: failed to parse ${path}: ${(err as Error).message}\n`
    );
    return {};
  }
}

function loadEnv(): Partial<Config> {
  return {
    jobProcessorUrl: process.env.RH_JOB_PROCESSOR_URL,
    searxngEndpoint:
      process.env.RH_SEARXNG_ENDPOINT || process.env.SEARXNG_ENDPOINT,
    tavilyApiKey: process.env.RH_TAVILY_API_KEY || process.env.TAVILY_API_KEY,
    llmBaseUrl: process.env.RH_LLM_BASE_URL || process.env.OPENAI_BASE_URL,
    llmKey: process.env.RH_LLM_KEY || process.env.OPENAI_API_KEY,
    llmModel: process.env.RH_LLM_MODEL,
  };
}

export function loadConfig(overrides: Partial<Config> = {}): Config {
  const file = loadFile();
  const env = loadEnv();
  return {
    ...DEFAULTS,
    ...stripUndef(file),
    ...stripUndef(env),
    ...stripUndef(overrides),
  };
}

function stripUndef<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(o) as (keyof T)[]) {
    if (o[k] !== undefined && o[k] !== "") out[k] = o[k];
  }
  return out;
}
