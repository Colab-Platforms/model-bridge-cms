import Link from "next/link";
import { Check } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PricingTier {
  tier: string;
  price: string;
  priceSuffix: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted: boolean;
}

const PRICING_TIERS: PricingTier[] = [
  {
    tier: "Free Tier",
    price: "$0",
    priceSuffix: "forever",
    description: "Start building with free models and a full API key — no credit card required.",
    features: [
      "Access to free models",
      "OpenAI-compatible chat completions API",
      "Streaming responses (SSE)",
      "API key management — create, rotate, revoke",
      "Usage & activity logs",
      "Email support",
    ],
    cta: "Get API Key",
    ctaHref: "/auth/register",
    highlighted: false,
  },
  {
    tier: "Pay As You Go",
    price: "Usage-based",
    priceSuffix: "",
    description:
      "Pay only for what you use across every model we support — no monthly minimum, no lock-in.",
    features: [
      "Everything in Free",
      "OpenAI, Anthropic, Gemini, Groq, DeepSeek & Nvidia models",
      "Wallet-based credits with transparent per-token pricing",
      "Automatic refund on failed requests",
      "No monthly minimum",
      "Projects with isolated API keys & usage",
      "Model comparison & per-model pricing browser",
    ],
    cta: "Start Building",
    ctaHref: "/auth/register",
    highlighted: true,
  },
  {
    tier: "Scale",
    price: "Custom",
    priceSuffix: "",
    description: "For teams running high-volume workloads who need dedicated support and control.",
    features: [
      "Everything in Pay As You Go",
      "Full admin dashboard for managing users, providers & models",
      "Role-based access control for your team",
      "Dedicated infrastructure & reserved capacity",
      "Guaranteed uptime SLA",
      "Priority support & onboarding",
      "Invoice billing & volume discounts",
    ],
    cta: "Let's Talk",
    ctaHref: "/contact",
    highlighted: false,
  },
];

function PricingCard({ tier }: { tier: PricingTier }) {
  return (
    <div className={cn("flex", tier.highlighted && "md:z-10 md:scale-105")}>
      <Card
        className={cn(
          "flex h-full w-full flex-col justify-between gap-8 p-8",
          tier.highlighted
            ? "border-transparent bg-foreground text-background shadow-[0_25px_50px_-12px_color-mix(in_oklch,var(--primary)_45%,transparent)]"
            : "border-border bg-card text-card-foreground shadow-xs"
        )}
      >
        <div className="flex flex-col gap-6">
          <div>
            <p
              className={cn(
                "mb-4 text-xs font-semibold uppercase tracking-widest",
                tier.highlighted ? "text-background/60" : "text-muted-foreground"
              )}
            >
              {tier.tier}
            </p>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "text-4xl font-bold tracking-tight",
                  tier.highlighted ? "text-primary" : "text-foreground"
                )}
              >
                {tier.price}
              </span>
              {tier.priceSuffix && (
                <span
                  className={cn(
                    "text-sm",
                    tier.highlighted ? "text-background/60" : "text-muted-foreground"
                  )}
                >
                  {tier.priceSuffix}
                </span>
              )}
            </div>
            <p
              className={cn(
                "mt-3 text-sm leading-relaxed",
                tier.highlighted ? "text-background/70" : "text-muted-foreground"
              )}
            >
              {tier.description}
            </p>
          </div>

          <ul className="flex flex-col gap-3">
            {tier.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className={tier.highlighted ? "text-background/90" : "text-foreground"}>
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Button
          asChild
          variant={tier.highlighted ? "default" : "outline"}
          size="lg"
          className="w-full"
        >
          <Link href={tier.ctaHref}>{tier.cta}</Link>
        </Button>
      </Card>
    </div>
  );
}

export default function PricingSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Pricing
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Simple, usage-based pricing
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Start free, pay only for what you use, and scale to dedicated infrastructure when you&apos;re ready.
          </p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <PricingCard key={tier.tier} tier={tier} />
          ))}
        </div>
      </div>
    </section>
  );
}
