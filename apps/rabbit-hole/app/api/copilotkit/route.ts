/**
 * CopilotKit Runtime API Route
 *
 * Bridges CopilotKit frontend to LangGraph agents running on port 8123
 * Required for CopilotKit v1.10+ to connect to LangGraph CLI dev server
 *
 * Tier Enforcement: Requires Basic tier or higher for AI chat access
 */

// Suppress CopilotKit debug logs (must be first)
import "../lib/suppress-copilotkit-logs";

import {
  CopilotRuntime,
  LangGraphAgent,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { NextRequest, NextResponse } from "next/server";

import { getUserTier, getTierLimits } from "@proto/auth";

// Service adapter for multi-agent support (required by CopilotKit)
const serviceAdapter = new ExperimentalEmptyAdapter();

// Create CopilotKit runtime with LangGraph agents
const runtime = new CopilotRuntime({
  agents: {
    research_agent: new LangGraphAgent({
      deploymentUrl: process.env.LANGGRAPH_API_URL || "http://localhost:8123",
      graphId: "research_agent",
    }),
    writing_agent: new LangGraphAgent({
      deploymentUrl: process.env.LANGGRAPH_API_URL || "http://localhost:8123",
      graphId: "writing_agent",
    }),
  },
});

/**
 * POST handler for CopilotKit requests
 * Proxies requests from frontend to LangGraph agent runtime
 *
 * Tier Enforcement: Checks user tier before allowing AI chat access
 */
export const POST = async (req: NextRequest) => {
  // Authenticate user
<<<<<<< HEAD
  const user = { id: "local-user", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "" } as any;
=======
  const user = {
    id: "local-user",
    firstName: "Local",
    lastName: "User",
    username: "local-user",
    fullName: "Local User",
    emailAddresses: [{ emailAddress: "local@localhost" }],
    publicMetadata: { tier: "pro" },
    privateMetadata: { stats: {} },
  };
>>>>>>> origin/main

  if (!user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Authentication required for AI chat access",
      },
      { status: 401 }
    );
  }

  // Self-hosted: all users have AI chat access

  // User has access - proceed with CopilotKit
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
