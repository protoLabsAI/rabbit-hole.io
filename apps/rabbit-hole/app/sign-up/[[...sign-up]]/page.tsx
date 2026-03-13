/**
 * Sign Up Page - Server Component Wrapper
 *
 * Custom sign-up page for Clerk authentication.
 */

import { Suspense } from "react";

import SignUpClient from "./SignUpClient";

export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpLoading />}>
      <SignUpClient />
    </Suspense>
  );
}

function SignUpLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-lg font-medium">Loading sign up...</p>
      </div>
    </div>
  );
}
