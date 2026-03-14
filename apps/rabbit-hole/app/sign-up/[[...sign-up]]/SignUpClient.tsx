/**
 * SignUpClient - Stub (Clerk removed)
 *
 * Authentication is handled locally without Clerk.
 */

"use client";

export default function SignUpClient() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md px-4 text-center">
        <h2 className="text-2xl font-semibold mb-4">Sign Up</h2>
        <p className="text-muted-foreground mb-6">
          Authentication is managed locally. No sign-up required.
        </p>
        <a
          href="/research"
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
        >
          Go to Research
        </a>
      </div>
    </div>
  );
}
