"use client";

import Link from "next/link";
import { useState } from "react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@proto/ui/atoms";

import { useTheme } from "../context/ThemeProvider";

export default function WaitlistPage() {
  const { branding } = useTheme();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      // TODO: Implement waitlist API endpoint
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSubmitStatus("success");
        setEmail("");
      } else {
        setSubmitStatus("error");
      }
    } catch (error) {
      console.error("Waitlist submission error:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background via-background to-muted/20 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />

      <div className="relative flex items-center justify-center min-h-screen px-4 py-20">
        <div className="max-w-3xl mx-auto w-full space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <span className="text-2xl">{branding?.logo || "✏️"}</span>
              <span className="text-lg font-medium">
                {branding?.name || "research-graph.com"}
              </span>
            </Link>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
              Join the Waitlist
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Be the first to experience the future of evidence-based knowledge
              graphs. Get exclusive early access when we launch.
            </p>
          </div>

          {/* Waitlist Form Card */}
          <Card className="backdrop-blur-sm bg-card/50 border-border/50 shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                Reserve Your Early Access
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleWaitlistSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="text-sm font-medium text-foreground"
                    >
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      disabled={isSubmitting}
                      className="h-12 text-base"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    size="lg"
                    className="w-full h-12"
                  >
                    {isSubmitting ? "Joining..." : "Join Waitlist"}
                  </Button>
                </div>

                {submitStatus === "success" && (
                  <div className="flex items-center gap-3 text-success-600 bg-success-50 dark:bg-success-950/20 p-4 rounded-lg">
                    <span className="text-2xl">✓</span>
                    <div className="flex-1">
                      <p className="font-medium">You&apos;re on the list!</p>
                      <p className="text-sm">
                        We&apos;ll notify you when we launch. Check your email
                        for confirmation.
                      </p>
                    </div>
                  </div>
                )}

                {submitStatus === "error" && (
                  <div className="flex items-center gap-3 text-error-600 bg-error-50 dark:bg-error-950/20 p-4 rounded-lg">
                    <span className="text-2xl">✗</span>
                    <div className="flex-1">
                      <p className="font-medium">Something went wrong</p>
                      <p className="text-sm">
                        Please try again or contact support if the issue
                        persists.
                      </p>
                    </div>
                  </div>
                )}
              </form>

              {/* Benefits List */}
              <div className="mt-8 pt-8 border-t border-border">
                <h3 className="font-semibold text-foreground mb-4">
                  What you&apos;ll get:
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-0.5">✓</span>
                    <span className="text-muted-foreground">
                      Priority access to the platform before public launch
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-0.5">✓</span>
                    <span className="text-muted-foreground">
                      Exclusive updates on development progress
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-0.5">✓</span>
                    <span className="text-muted-foreground">
                      Special launch pricing for early adopters
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-0.5">✓</span>
                    <span className="text-muted-foreground">
                      Direct input on features and roadmap
                    </span>
                  </li>
                </ul>
              </div>

              {/* Privacy Note */}
              <p className="text-muted-foreground text-sm text-center mt-8">
                We respect your privacy. No spam, ever. Unsubscribe anytime.
              </p>
            </CardContent>
          </Card>

          {/* Back to Home Link */}
          <div className="text-center">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
