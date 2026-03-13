import { logger } from "./logger";

export interface PageViewParams {
  page: string;
  userId?: string;
  tier?: string;
  sessionId?: string;
  referrer?: string;
  userAgent?: string;
  region?: string;
}

export interface UserActionParams {
  action: string;
  page: string;
  userId?: string;
  tier?: string;
  sessionId?: string;
  target?: string;
  value?: any;
  duration?: number;
}

export interface SessionParams {
  event: "start" | "end" | "active";
  sessionId: string;
  userId?: string;
  tier?: string;
  duration?: number;
  pageViews?: number;
  actions?: number;
}

export interface AuthEventParams {
  event: "login" | "logout" | "signup" | "token_refresh" | "unauthorized";
  userId?: string;
  tier?: string;
  method?: string;
  error?: Error;
  metadata?: Record<string, any>;
}

export function logPageView(params: PageViewParams) {
  logger.info(
    {
      type: "page_view",
      page: params.page,
      userId: params.userId || "anonymous",
      tier: params.tier,
      sessionId: params.sessionId,
      referrer: params.referrer,
      userAgent: params.userAgent,
      region: params.region,
    },
    `Page view: ${params.page}`
  );
}

export function logUserAction(params: UserActionParams) {
  logger.info(
    {
      type: "user_action",
      action: params.action,
      page: params.page,
      userId: params.userId || "anonymous",
      tier: params.tier,
      sessionId: params.sessionId,
      target: params.target,
      value: params.value,
      duration: params.duration,
    },
    `User action: ${params.action} on ${params.page}`
  );
}

export function logSession(params: SessionParams) {
  const level = params.event === "end" ? "info" : "debug";

  logger[level](
    {
      type: "session",
      event: params.event,
      sessionId: params.sessionId,
      userId: params.userId || "anonymous",
      tier: params.tier,
      duration: params.duration,
      pageViews: params.pageViews,
      actions: params.actions,
    },
    `Session ${params.event}: ${params.sessionId}`
  );
}

export function logAuth(params: AuthEventParams) {
  const level = params.error ? "error" : "info";

  logger[level](
    {
      type: "auth",
      event: params.event,
      userId: params.userId || "anonymous",
      tier: params.tier,
      method: params.method,
      error: params.error,
      ...params.metadata,
    },
    `Auth: ${params.event}`
  );
}

export function logWorkspaceOperation(params: {
  operation: "create" | "load" | "update" | "delete" | "switch_tab";
  workspaceId: string;
  userId?: string;
  tier?: string;
  tabCount?: number;
  entityCount?: number;
  duration?: number;
  error?: Error;
}) {
  const level = params.error ? "error" : "info";

  logger[level](
    {
      type: "workspace_operation",
      operation: params.operation,
      workspaceId: params.workspaceId,
      userId: params.userId || "anonymous",
      tier: params.tier,
      tabCount: params.tabCount,
      entityCount: params.entityCount,
      duration: params.duration,
      error: params.error,
    },
    `Workspace ${params.operation}: ${params.workspaceId}`
  );
}

export function logFeatureUsage(params: {
  feature: string;
  page: string;
  userId?: string;
  tier?: string;
  sessionId?: string;
  blocked?: boolean;
  reason?: string;
}) {
  logger.info(
    {
      type: "feature_usage",
      feature: params.feature,
      page: params.page,
      userId: params.userId || "anonymous",
      tier: params.tier,
      sessionId: params.sessionId,
      blocked: params.blocked,
      reason: params.reason,
    },
    `Feature ${params.blocked ? "blocked" : "used"}: ${params.feature}`
  );
}
