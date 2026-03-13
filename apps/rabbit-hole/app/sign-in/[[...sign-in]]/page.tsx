/**
 * Sign In Page - Server Component Wrapper
 *
 * Custom sign-in page for Clerk authentication.
 * Users attempting to access protected routes are redirected here.
 */

import { Suspense } from "react";

import SignInClient from "./SignInClient";

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInClient />
    </Suspense>
  );
}

function SignInLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-lg font-medium">Loading sign in...</p>
      </div>
    </div>
  );
}
