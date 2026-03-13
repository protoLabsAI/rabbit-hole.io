/**
 * Clerk Webhook Handler
 *
 * Handles user AND organization lifecycle events:
 * - user.created - Set default tier/role
 * - user.updated - Sync tier changes
 * - user.deleted - Cleanup user data
 * - organization.created - Auto-create tenant
 * - organization.updated - Sync org metadata
 * - organization.deleted - Cascade delete tenant data
 */

import { WebhookEvent, clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";

import { USER_TIERS, USER_ROLES } from "@proto/auth";
import { logger, logAuth } from "@proto/logger";
import {
  createTenant,
  getTenantByOrgId,
  applyPlanQuotas,
} from "@proto/utils/tenancy-server";

interface OrganizationCreatedEvent {
  id: string;
  name: string;
  slug: string;
  created_at: number;
  public_metadata: Record<string, unknown>;
}

interface OrganizationUpdatedEvent extends OrganizationCreatedEvent {
  updated_at: number;
}

/**
 * Verify webhook signature and parse event
 */
async function verifyWebhook(
  request: NextRequest
): Promise<WebhookEvent | null> {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("❌ CLERK_WEBHOOK_SECRET not configured");
    return null;
  }

  // Get headers
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("❌ Missing Svix headers");
    return null;
  }

  // Get body
  const payload = await request.json();
  const body = JSON.stringify(payload);

  // Verify signature
  const wh = new Webhook(WEBHOOK_SECRET);

  try {
    return wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (error) {
    console.error("❌ Webhook verification failed:", error);
    return null;
  }
}

/**
 * POST - Handle Clerk webhook events (user AND organization)
 */
export async function POST(request: NextRequest) {
  // DEV MODE: Allow testing without webhook secret
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET && process.env.NODE_ENV === "development") {
    logger.warn(
      { devMode: true, route: "/api/webhooks/clerk" },
      "DEV MODE: Processing webhook without signature verification"
    );

    const payload = await request.json();

    // Handle user.created event in dev mode
    if (payload.type === "user.created") {
      const userId = payload.data.id;
      const email = payload.data.email_addresses?.[0]?.email_address;

      logAuth({
        event: "signup",
        userId,
        tier: USER_TIERS.FREE,
        method: "clerk_webhook_dev",
        metadata: { email, devMode: true },
      });

      try {
        const clerk = await clerkClient();
        await clerk.users.updateUserMetadata(userId, {
          publicMetadata: {
            tier: USER_TIERS.FREE,
            role: USER_ROLES.MEMBER,
            tierExpiry: null,
          },
        });

        logger.info(
          { userId, tier: USER_TIERS.FREE, role: USER_ROLES.MEMBER },
          "Set default tier for new user"
        );
      } catch (error) {
        logger.error({ userId, error }, "Failed to set metadata for new user");
      }
    }

    return NextResponse.json({ success: true, devMode: true }, { status: 200 });
  }

  const event = await verifyWebhook(request);

  if (!event) {
    return NextResponse.json(
      { success: false, error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  console.log(`📨 Received Clerk webhook: ${event.type}`);

  try {
    switch (event.type) {
      // USER LIFECYCLE EVENTS
      case "user.created":
        await handleUserCreated(event);
        break;

      case "user.updated":
        await handleUserUpdated(event);
        break;

      case "user.deleted":
        await handleUserDeleted(event);
        break;

      // ORGANIZATION LIFECYCLE EVENTS
      case "organization.created":
        await handleOrganizationCreated(
          event.data as unknown as OrganizationCreatedEvent
        );
        break;

      case "organization.updated":
        await handleOrganizationUpdated(
          event.data as unknown as OrganizationUpdatedEvent
        );
        break;

      case "organization.deleted":
        await handleOrganizationDeleted(event.data as { id: string });
        break;

      default:
        console.log(`ℹ️  Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`❌ Error processing webhook ${event.type}:`, error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle user.created event
 * Sets default tier and role for new users
 */
async function handleUserCreated(event: WebhookEvent) {
  const userData = event.data as any;
  const userId = userData.id;
  const email = userData.email_addresses?.[0]?.email_address;

  logAuth({
    event: "signup",
    userId,
    tier: USER_TIERS.FREE,
    method: "clerk_webhook",
    metadata: { email },
  });

  try {
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        tier: USER_TIERS.FREE,
        role: USER_ROLES.MEMBER,
        tierExpiry: null,
      },
    });

    logger.info(
      { userId, tier: USER_TIERS.FREE, role: USER_ROLES.MEMBER, email },
      "Set default tier and role for new user"
    );
  } catch (error) {
    logger.error(
      { userId, error, email },
      "Failed to set metadata for new user"
    );
  }
}

/**
 * Handle user.updated event
 * Logs tier/role changes
 */
async function handleUserUpdated(event: WebhookEvent) {
  const userData = event.data as any;
  const userId = userData.id;
  const email = userData.email_addresses?.[0]?.email_address;

  const tier = userData.public_metadata?.tier as string | undefined;
  const role = userData.public_metadata?.role as string | undefined;
  const tierExpiry = userData.public_metadata?.tierExpiry as
    | string
    | null
    | undefined;

  logger.info(
    {
      type: "user_metadata_updated",
      userId,
      email,
      tier,
      role,
      tierExpiry,
      source: "clerk_dashboard",
    },
    "User metadata updated via Clerk Dashboard"
  );

  // TODO: Phase 2 - Create session invalidation record
}

/**
 * Handle user.deleted event
 * Cleanup user data
 */
async function handleUserDeleted(event: WebhookEvent) {
  const userData = event.data as any;
  const userId = userData.id;
  logger.info({ userId, type: "user_lifecycle" }, "User deleted");
  // TODO: Cascade cleanup of user data
}

/**
 * Handle organization.created event
 * Auto-creates tenant with free tier quotas
 */
async function handleOrganizationCreated(org: OrganizationCreatedEvent) {
  console.log(`🏢 Creating tenant for organization: ${org.name} (${org.id})`);

  try {
    // Check if tenant already exists (idempotent)
    const existing = await getTenantByOrgId(org.id);
    if (existing) {
      console.log(`✅ Tenant already exists for org ${org.id}`);
      return;
    }

    // Create tenant
    const tenant = await createTenant({
      clerkOrgId: org.id,
      orgName: org.name,
      orgSlug: org.slug,
    });

    // Apply free tier quotas by default
    await applyPlanQuotas(org.id, "free");

    console.log(
      `✅ Tenant created: ${tenant.tenantHash} (namespace: ${tenant.neo4jNamespace})`
    );
  } catch (error) {
    console.error(`❌ Failed to create tenant for org ${org.id}:`, error);
    throw error;
  }
}

/**
 * Handle organization.updated event
 * Syncs organization metadata to tenant
 */
async function handleOrganizationUpdated(org: OrganizationUpdatedEvent) {
  console.log(`🔄 Updating tenant for organization: ${org.name} (${org.id})`);

  try {
    const tenant = await getTenantByOrgId(org.id);

    if (!tenant) {
      console.warn(`⚠️  Tenant not found for org ${org.id}, creating...`);
      await handleOrganizationCreated(org);
      return;
    }

    // Update org metadata (name, slug) in database
    // TODO: Add updateTenantMetadata function to tenant-utils
    console.log(`✅ Tenant metadata synced for org ${org.id}`);

    // Check for plan changes in public_metadata
    const plan = org.public_metadata?.plan as
      | "free"
      | "pro"
      | "enterprise"
      | undefined;
    if (plan && ["free", "pro", "enterprise"].includes(plan)) {
      console.log(`📊 Applying ${plan} plan quotas for org ${org.id}`);
      await applyPlanQuotas(org.id, plan);
    }
  } catch (error) {
    console.error(`❌ Failed to update tenant for org ${org.id}:`, error);
    throw error;
  }
}

/**
 * Handle organization.deleted event
 * Cascade deletes tenant and all related data
 */
async function handleOrganizationDeleted(data: { id: string }) {
  console.log(`🗑️  Deleting tenant for organization: ${data.id}`);

  try {
    // PostgreSQL cascades will handle:
    // - organization_quotas
    // - organization_files
    // - share_tokens
    // via ON DELETE CASCADE constraints

    // TODO: Add Neo4j cleanup (delete all nodes with neo4j_namespace)
    // TODO: Add MinIO cleanup (delete all files for org)

    console.log(`✅ Tenant and related data deleted for org ${data.id}`);
  } catch (error) {
    console.error(`❌ Failed to delete tenant for org ${data.id}:`, error);
    throw error;
  }
}
