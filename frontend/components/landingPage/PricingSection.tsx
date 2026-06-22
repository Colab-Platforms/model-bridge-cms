import Link from "next/link";
import { Check, ArrowRight, Zap } from "lucide-react";

interface Plan {
  name: string;
  price: string;
  period?: string;
  description: string;
  cta: string;
  ctaHref: string;
  highlighted: boolean;
  badge?: string;
  features: string[];
}

const PLANS: Plan[] = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for side projects, prototypes, and learning ModelBridge.",
    cta: "Get Started — Free",
    ctaHref: "/auth/register",
    highlighted: false,
    features: [
      "Up to 1M tokens / month",
      "Access to 10 models",
      "Community routing only",
      "Basic usage analytics",
      "1 API key",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "$49",
    period: "/ month",
    description: "For startups and growing teams that need reliability and scale.",
    cta: "Start Free Trial",
    ctaHref: "/auth/register?plan=pro",
    highlighted: true,
    badge: "Most Popular",
    features: [
      "Up to 50M tokens / month",
      "Access to all 400+ models",
      "Smart routing + failover",
      "Full usage analytics + exports",
      "10 API keys",
      "Set per-key spend limits",
      "Team seat management",
      "Priority email support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Dedicated infrastructure, compliance controls, and SLA guarantees.",
    cta: "Talk to Sales",
    ctaHref: "/contact",
    highlighted: false,
    features: [
      "Unlimited tokens",
      "Dedicated cloud instance",
      "Custom model routing rules",
      "SOC 2 Type II compliance",
      "SAML SSO + SCIM",
      "99.99% uptime SLA",
      "Custom invoicing",
      "Dedicated customer success",
    ],
  },
];

function PricingCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={`relative flex flex-col rounded-[32px] p-8 transition-all duration-300 ${
        plan.highlighted
          ? "bg-[#0F172A] text-white shadow-[0_24px_48px_-12px_rgba(15,23,42,0.25)] scale-[1.05] z-10"
          : "bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5"
      }`}
    >
      {/* Badge */}
      {plan.badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="bg-indigo-600 text-white text-[11px] font-black px-4 py-1.5 rounded-full shadow-lg shadow-indigo-600/20 uppercase tracking-widest border border-indigo-500">
            {plan.badge}
          </div>
        </div>
      )}

      {/* Plan name */}
      <div
        className={`text-[12px] font-black uppercase tracking-[0.2em] mb-4 ${
          plan.highlighted ? "text-indigo-400" : "text-slate-400"
        }`}
      >
        {plan.name}
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-1 mb-4">
        <span
          className={`text-[56px] font-black tracking-tight leading-none ${
            plan.highlighted ? "text-white" : "text-[#0F172A]"
          }`}
        >
          {plan.price}
        </span>
        {plan.period && (
          <span
            className={`text-[15px] font-bold ${
              plan.highlighted ? "text-slate-400" : "text-slate-400"
            }`}
          >
            {plan.period}
          </span>
        )}
      </div>

      {/* Description */}
      <p
        className={`text-[15px] leading-relaxed mb-8 min-h-[48px] ${
          plan.highlighted ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {plan.description}
      </p>

      {/* CTA */}
      <Link href={plan.ctaHref}>
        <span
          className={`flex items-center justify-center gap-2 text-[15px] font-black py-4 rounded-2xl transition-all duration-300 cursor-pointer mb-8 mb-auto ${
            plan.highlighted
              ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
              : "bg-slate-50 text-[#0F172A] hover:bg-slate-100 border border-slate-200"
          }`}
        >
          {plan.cta}
        </span>
      </Link>

      {/* Features */}
      <ul className="flex flex-col gap-4 mt-8">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                plan.highlighted ? "bg-indigo-500/20" : "bg-indigo-50"
              }`}
            >
              <Check
                className={`w-3 h-3 ${
                  plan.highlighted ? "text-indigo-400" : "text-indigo-600"
                }`}
                strokeWidth={4}
              />
            </div>
            <span
              className={`text-[14px] font-semibold ${
                plan.highlighted ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {f}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PricingSection() {
  return (
    <section className="bg-[#F8FAFC] py-32">
      <div className="max-w-[1240px] mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-20">
          <p className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">
            Pricing
          </p>
          <h2 className="text-[44px] md:text-[56px] font-black text-[#0F172A] tracking-[-0.04em] leading-[0.95] mb-6">
            Pay as you <span className="text-indigo-600">scale.</span>
          </h2>
          <p className="text-[18px] text-slate-500 max-w-[520px] mx-auto leading-[1.6]">
            Start free, scale indefinitely. No setup fees, no hidden costs.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          {PLANS.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>

        {/* Note */}
        <p className="mt-12 text-center text-slate-400 text-sm font-medium">
          Need a custom plan? <Link href="/contact" className="text-indigo-600 font-bold hover:underline">Contact Sales</Link>
        </p>
      </div>
    </section>
  );
}
