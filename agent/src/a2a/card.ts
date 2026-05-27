/**
 * Agent card — served at /.well-known/agent-card.json (canonical) and
 * /.well-known/agent.json (legacy fallback) per the protoWorkstacean A2A spec.
 *
 * The card describes skills, capabilities, and auth to discovery consumers
 * (workstacean's SkillBrokerPlugin polls every ~10 minutes).
 */

export interface SecurityScheme {
  type: "apiKey";
  in: "header";
  name: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
}

export interface AgentCard {
  name: string;
  description: string;
  /** JSON-RPC endpoint — MUST end in /a2a per spec, else dispatch fails silently. */
  url: string;
  version: string;
  provider: {
    organization: string;
  };
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
    stateTransitionHistory?: boolean;
  };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: Skill[];
  securitySchemes: Record<string, SecurityScheme>;
  /**
   * Empty array means "no auth required." Must be `[{"apiKey":[]}]` (or similar)
   * to actually enforce the scheme — the transport layer reads this to decide
   * whether to require credentials on incoming requests.
   */
  security: Array<Record<string, string[]>>;
}

export interface AgentCardConfig {
  name: string;
  description: string;
  version: string;
  /** Base URL workstacean should use to reach us. Port + /a2a appended automatically. */
  advertiseUrl: string;
  skills: Skill[];
  /** When true, card advertises apiKey auth AND enforces it at the transport layer. */
  requireApiKey: boolean;
  capabilities?: Partial<AgentCard["capabilities"]>;
}

const RESEARCHER_SKILLS: Skill[] = [
  {
    id: "search",
    name: "Search",
    description:
      "Agentic web search backed by the rabbit-hole search engine — runs " +
      "the same agent as the chat UI and the OpenAI-compatible API. Returns " +
      "a consolidated markdown answer with inline [N] citations.",
    tags: ["search", "fast"],
    examples: ["Search for Anthropic's latest papers", "Find X's biography"],
    inputModes: ["text/plain"],
    outputModes: ["text/markdown"],
  },
  {
    id: "ingest_url",
    name: "Ingest URL",
    description:
      "Submit a URL (HTML page, PDF, audio, video, YouTube) to the media " +
      "processing pipeline. Returns the job ID + extracted text once " +
      "processing completes.",
    tags: ["ingest", "media"],
    examples: [
      "https://arxiv.org/abs/2401.00001",
      "https://www.youtube.com/watch?v=...",
    ],
    inputModes: ["text/plain"],
    outputModes: ["application/json"],
  },
];

export function buildAgentCard(cfg: AgentCardConfig): AgentCard {
  // Strip trailing slash and any /a2a suffix the caller might have baked in,
  // then append /a2a canonically so the url field always ends in /a2a as the spec requires.
  const base = cfg.advertiseUrl.replace(/\/+$/, "").replace(/\/a2a$/, "");
  // Strip leading "v" — callers pass AGENT_VERSION from a git tag ("v0.1.0")
  // but the spec + semver want the bare version ("0.1.0"). Normalize once
  // here so consumers don't end up with "vv0.1.0" from "v" + "v0.1.0".
  const version = cfg.version.replace(/^v/, "");
  return {
    name: cfg.name,
    description: cfg.description,
    url: `${base}/a2a`,
    version,
    provider: { organization: "protoLabsAI" },
    capabilities: {
      streaming: true,
      pushNotifications: true,
      stateTransitionHistory: false,
      ...cfg.capabilities,
    },
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/markdown"],
    skills: cfg.skills,
    securitySchemes: {
      apiKey: { type: "apiKey", in: "header", name: "X-API-Key" },
    },
    security: cfg.requireApiKey ? [{ apiKey: [] }] : [],
  };
}

export function defaultResearcherSkills(): Skill[] {
  return RESEARCHER_SKILLS;
}
