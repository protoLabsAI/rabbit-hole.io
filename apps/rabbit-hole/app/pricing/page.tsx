/**
 * Pricing Page
 *
 * Three-tier pricing: Free, Pro, Enterprise
 * Integrated with Clerk Organizations for plan management
 * Uses shadcn/ui components and respects whitelabel theming
 */

import Link from "next/link";

import { Icon } from "@proto/icon-system";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@proto/ui/atoms";

import { PricingPageLogger, PlanAction } from "./PricingClient";

export const metadata = {
  title: "Pricing - Rabbit Hole",
  description:
    "Choose the plan that fits your research needs. From free tier to enterprise scale.",
};

interface PlanFeature {
  name: string;
  included: boolean;
  value?: string;
}

interface PricingPlan {
  id: string;
  name: string;
  icon: React.ReactNode;
  price: string;
  billingCycle: string;
  description: string;
  cta: string;
  highlighted?: boolean;
  features: PlanFeature[];
}

const plans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    icon: <Icon name="users" size={24} />,
    price: "$0",
    billingCycle: "forever",
    description: "Perfect for personal research and experimentation",
    cta: "Get Started",
    features: [
      { name: "1 workspace seat", included: true },
      { name: "1,000 entities", included: true, value: "1,000 entities" },
      { name: "1 GB storage", included: true, value: "1 GB storage" },
      { name: "100 API calls/hour", included: true, value: "100/hour" },
      { name: "Public share links", included: true },
      { name: "Hash-based URLs", included: true, value: "v1/{hash}/..." },
      { name: "Custom subdomain", included: false },
      { name: "Organization sharing", included: false },
      { name: "Custom domains", included: false },
      { name: "Priority support", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    icon: <Icon name="zap" size={24} />,
    price: "$49",
    billingCycle: "/month",
    description: "For professional researchers and small teams",
    cta: "Upgrade to Pro",
    highlighted: true,
    features: [
      { name: "5 workspace seats", included: true, value: "5 seats" },
      {
        name: "50,000 entities",
        included: true,
        value: "50,000 entities",
      },
      { name: "50 GB storage", included: true, value: "50 GB storage" },
      { name: "1,000 API calls/hour", included: true, value: "1,000/hour" },
      { name: "Public share links", included: true },
      {
        name: "Custom subdomain",
        included: true,
        value: "yourteam.rabbit-hole.io",
      },
      { name: "Organization sharing", included: true },
      { name: "Private share links", included: true },
      { name: "Email support", included: true },
      { name: "Custom domains", included: false },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    icon: <Icon name="users" size={24} />,
    price: "Custom",
    billingCycle: "pricing",
    description: "For large organizations with advanced needs",
    cta: "Contact Sales",
    features: [
      { name: "Unlimited seats", included: true, value: "Unlimited" },
      {
        name: "1M+ entities",
        included: true,
        value: "1,000,000+ entities",
      },
      { name: "500 GB storage", included: true, value: "500 GB+" },
      {
        name: "Unlimited API calls",
        included: true,
        value: "Unlimited",
      },
      { name: "All share privacy levels", included: true },
      { name: "Custom subdomain", included: true },
      { name: "Multiple custom domains", included: true },
      { name: "SSO/SAML", included: true },
      { name: "Dedicated support", included: true },
      { name: "SLA guarantee", included: true },
    ],
  },
];

function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <Card
      className={`relative flex flex-col ${
        plan.highlighted
          ? "border-2 border-primary shadow-xl scale-105"
          : "border-border"
      }`}
    >
      {plan.highlighted && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          Most Popular
        </Badge>
      )}

      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {plan.icon}
          </div>
          <CardTitle className="text-2xl">{plan.name}</CardTitle>
        </div>
        <div className="mb-2">
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-bold">{plan.price}</span>
            <span className="text-muted-foreground text-lg">
              {plan.billingCycle}
            </span>
          </div>
        </div>
        <CardDescription className="text-base">
          {plan.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-3">
          {plan.features.map((feature, idx) => (
            <div key={idx} className="flex items-start gap-3">
              {feature.included ? (
                <Icon
                  name="check"
                  size={20}
                  className="text-success-600 flex-shrink-0 mt-0.5"
                />
              ) : (
                <Icon
                  name="x"
                  size={20}
                  className="text-muted-foreground/30 flex-shrink-0 mt-0.5"
                />
              )}
              <div className="flex-1">
                <span
                  className={
                    feature.included
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {feature.name}
                </span>
                {feature.value && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ({feature.value})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter>
        <PlanAction
          planId={plan.id}
          planName={plan.name}
          action="dashboard_billing"
        >
          <Button
            asChild
            className="w-full"
            size="lg"
            variant={plan.highlighted ? "default" : "outline"}
          >
            <Link href="/dashboard?tab=billing">{plan.cta}</Link>
          </Button>
        </PlanAction>

        {
          /* SignedOut: removed */
          <PlanAction planId={plan.id} planName={plan.name} action="sign_up">
            <Button
              asChild
              className="w-full"
              size="lg"
              variant={plan.highlighted ? "default" : "outline"}
            >
              <Link href="/sign-up">{plan.cta}</Link>
            </Button>
          </PlanAction>
        }
      </CardFooter>
    </Card>
  );
}

export default async function PricingPage() {
  const { userId } = { userId: "local-user" };

  return (
    <div className="min-h-screen bg-background">
      <PricingPageLogger />
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your research needs. Upgrade or downgrade
            at any time.
          </p>
          {userId && (
            <p className="text-sm text-muted-foreground mt-4">
              Signed in &middot;{" "}
              <Link href="/dashboard" className="text-primary hover:underline">
                Manage your workspace
              </Link>
            </p>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-20">
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>

        {/* FAQ Teaser */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold mb-8">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto space-y-6 text-left">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Can I change plans later?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! Upgrade or downgrade at any time. Pro-rated billing
                  applies when you upgrade mid-cycle. Downgrades take effect at
                  the next billing period.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  What happens if I exceed my quota?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  You&apos;ll receive notifications when approaching limits. For
                  entities and storage, you&apos;ll be prompted to upgrade. API
                  calls are rate-limited per hour and reset automatically.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  How does workspace seating work?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Each plan includes a number of seats (users who can access the
                  workspace). Free tier is 1 seat (just you), Pro is 5 seats,
                  Enterprise is unlimited. Invite team members from your
                  dashboard.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  What&apos;s included in storage?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Storage quota includes all files uploaded as evidence (PDFs,
                  images, documents). Graph data (entities and relationships)
                  does not count against storage limits.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Enterprise CTA */}
        <Card className="mt-20 bg-primary text-primary-foreground border-primary">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl mb-4">
              Need a custom solution?
            </CardTitle>
            <CardDescription className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
              Enterprise plans include dedicated support, custom integrations,
              and on-premise deployment options.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild size="lg" variant="secondary">
              <Link href="mailto:enterprise@rabbit-hole.io">
                Contact Enterprise Sales
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
