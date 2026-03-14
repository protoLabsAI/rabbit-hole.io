/**
 * SignInClient - Clerk removed, redirects to /research
 */

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SignInClient() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/research");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-lg font-medium">Redirecting...</p>
      </div>
    </div>
  );
}
