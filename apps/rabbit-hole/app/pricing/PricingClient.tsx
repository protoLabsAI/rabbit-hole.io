"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";

import { logPageView, logUserAction } from "@proto/logger";

export function PricingPageLogger() {
  const { user } = useUser();

  useEffect(() => {
    const sessionId =
      sessionStorage.getItem("sessionId") ||
      `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("sessionId", sessionId);

    logPageView({
      page: "/pricing",
      userId: user?.id,
      tier: (user?.publicMetadata?.tier as string) || undefined,
      sessionId,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
    });
  }, [user?.id]);

  return null;
}

interface PlanActionProps {
  planId: string;
  planName: string;
  action: string;
  children: React.ReactNode;
}

export function PlanAction({
  planId,
  planName,
  action,
  children,
}: PlanActionProps) {
  const { user } = useUser();

  const handleClick = () => {
    const sessionId =
      sessionStorage.getItem("sessionId") ||
      `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    logUserAction({
      action: "plan_cta_click",
      page: "/pricing",
      userId: user?.id,
      tier: (user?.publicMetadata?.tier as string) || undefined,
      sessionId,
      target: planId,
      value: { planName, action },
    });
  };

  return <div onClick={handleClick}>{children}</div>;
}
