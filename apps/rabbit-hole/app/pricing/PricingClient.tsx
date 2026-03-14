"use client";

import { useEffect } from "react";

import { logPageView, logUserAction } from "@proto/logger";

export function PricingPageLogger() {
<<<<<<< HEAD
  const user = { id: "local-user", firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], primaryEmailAddress: { emailAddress: "local@localhost" } } as any;
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
    isSignedIn: true,
  };
>>>>>>> origin/main

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
<<<<<<< HEAD
  const user = { id: "local-user", firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], primaryEmailAddress: { emailAddress: "local@localhost" } } as any;
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
    isSignedIn: true,
  };
>>>>>>> origin/main

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
