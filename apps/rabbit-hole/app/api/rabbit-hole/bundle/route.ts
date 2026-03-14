/**
 * Agent to Canvas Bridge API
 *
 * Receives RabbitHoleBundleData from the LangGraph agent, validates it,
 * and returns entities and relationships to the frontend canvas.
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import {
  RabbitHoleBundleSchema,
  safeValidate,
  type RabbitHoleBundleData,
} from "@proto/types";

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication required",
      },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid JSON in request body",
      },
      { status: 400 }
    );
  }

  const validation = safeValidate(RabbitHoleBundleSchema, body);
  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid bundle data: ${validation.error}`,
      },
      { status: 400 }
    );
  }

  const bundle: RabbitHoleBundleData = validation.data;

  return NextResponse.json({
    success: true,
    data: {
      entities: bundle.entities ?? [],
      relationships: bundle.relationships ?? [],
    },
  });
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      api: "Agent to Canvas Bridge API",
      description:
        "Receives RabbitHoleBundleData from the LangGraph agent and returns entities and relationships to the frontend canvas.",
      authentication: "required",
      schema: "RabbitHoleBundleSchema",
    },
  });
}
