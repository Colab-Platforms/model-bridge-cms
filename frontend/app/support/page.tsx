"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  Search,
  Ticket,
  BookOpen,
  ArrowRight,
  ChevronDown,
  Mail,
} from "lucide-react";
import Footer from "@/components/landingPage/Footer";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqGroup {
  group: string;
  items: FaqItem[];
}

const FAQ_GROUPS: FaqGroup[] = [
  {
    group: "Getting started",
    items: [
      {
        q: "Why should I use ColabOne?",
        a: "ColabOne gives you one API key and one SDK for 150+ models across OpenAI, Anthropic, Google, and more. Instead of integrating every provider separately, you write your code once — we handle routing, failover, and billing behind a single unified endpoint.",
      },
      {
        q: "How do I get my API key?",
        a: "Create a free account, then open Dashboard → API Keys → New Key. Your key is shown once at creation, so copy and store it somewhere safe. You can scope it to a project and set a credit limit if you like.",
      },
      {
        q: "Which languages and SDKs are supported?",
        a: "We ship a TypeScript/JavaScript SDK today, with Python, Go, and Java on the roadmap. Because every endpoint is OpenAI-compatible, you can also point most existing OpenAI SDKs straight at our base URL with no code changes.",
      },
    ],
  },
  {
    group: "Billing & credits",
    items: [
      {
        q: "How am I billed for usage?",
        a: "ColabOne runs on prepaid credits. You top up your wallet, and every request deducts the provider's cost plus our platform fee at the time it completes. You can watch the balance drop in real time from the Credits & Wallet page.",
      },
      {
        q: "What payment methods do you accept?",
        a: "Top-ups are processed securely through Paddle and accept all major debit/credit cards. Paddle acts as our merchant of record, so tax and invoicing are handled automatically wherever you're based.",
      },
      {
        q: "Where can I find my invoices?",
        a: "Every successful top-up generates a PDF invoice automatically. Head to Dashboard → Billing → Invoices to view or download any invoice, filterable by date or status.",
      },
    ],
  },
  {
    group: "Models & routing",
    items: [
      {
        q: "Which models can I access?",
        a: "Browse the full, live catalog at /models — it's filterable by provider, capability, context window, and price, and updates as we add new models.",
      },
      {
        q: "What does automatic routing do?",
        a: "Set model to \"auto\" and we classify the complexity of your prompt, then route it to the cheapest model capable of handling it well — falling back automatically if a provider has an outage.",
      },
      {
        q: "Can I call multiple models in one request?",
        a: "Yes. Pass an array to the model field and we'll fan the request out to every model in parallel, returning each result alongside a combined usage summary — handy for quick comparisons.",
      },
    ],
  },
  {
    group: "Account & security",
    items: [
      {
        q: "How do I rotate or revoke an API key?",
        a: "From Dashboard → API Keys, open the key's menu and choose Rotate to issue a new secret (the old one stops working immediately) or Revoke to disable it entirely. Both actions are logged to your activity log.",
      },
      {
        q: "How do I reset my password?",
        a: "Use \"Forgot password\" on the sign-in page, or if you're already signed in, go to Settings → Security to change it directly and review your active sessions.",
      },
      {
        q: "Is my prompt data used to train models?",
        a: "No. ColabOne does not use your request or response content to train any model. Requests are forwarded to your chosen provider under their standard API terms and logged only for your own usage analytics.",
      },
    ],
  },
];

function FaqAccordionItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden transition-colors hover:border-indigo-200 dark:hover:border-indigo-500/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer"
      >
        <span className="text-[14.5px] font-semibold text-[#0F172A] dark:text-white">{item.q}</span>
        <ChevronDown
          className={`w-4.5 h-4.5 text-slate-400 dark:text-slate-500 flex-shrink-0 transition-transform duration-300 ${
            open ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-4 text-[13.5px] text-slate-500 dark:text-slate-400 leading-[1.7]">{item.a}</p>
        </div>
      </div>
    </div>
  );
}

export default function SupportPage() {
  const [query, setQuery] = useState("");

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ_GROUPS;
    return FAQ_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter(
        (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
      ),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19]">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section
          className="relative pt-20 pb-16 px-6 overflow-hidden bg-[#F8FAFC] dark:bg-[#0B0F19]"
          style={{
            backgroundImage: `radial-gradient(circle at 50% -10%, rgba(91,77,255,0.08) 0%, transparent 55%)`,
          }}
        >
          <div className="relative max-w-[680px] mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-4 py-1.5 shadow-sm mb-8">
              <LifeBuoy className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Support Center</span>
            </div>

            <h1 className="text-[40px] md:text-[52px] font-black text-[#0F172A] dark:text-white leading-[1.02] tracking-[-0.04em]">
              Hello, how can we help?
            </h1>
            <p className="mt-5 text-[16px] md:text-[17px] text-slate-500 dark:text-slate-400 leading-[1.6] max-w-[520px] mx-auto">
              Search the help center, raise a ticket, or browse the docs — our team typically replies within one business day.
            </p>

            <div className="mt-9 relative max-w-[440px] mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for answers…"
                className="w-full h-12 pl-11 pr-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[14px] text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm outline-none focus:border-indigo-300 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
              />
            </div>
          </div>
        </section>

        {/* ── Action cards ─────────────────────────────────────────────────── */}
        <section className="px-6 -mt-2">
          <div className="max-w-[820px] mx-auto grid sm:grid-cols-2 gap-5">
            <Link
              href="/support/ticket"
              className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-7 flex flex-col items-start hover:border-indigo-200 dark:hover:border-indigo-500/40 hover:shadow-[0_16px_40px_rgba(91,77,255,0.1)] transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Ticket className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-[16px] font-bold text-[#0F172A] dark:text-white mb-1.5">Raise a ticket</h3>
              <p className="text-[13.5px] text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                Get personalized help from our support team for account, billing, or technical issues.
              </p>
              <span className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-indigo-600 dark:text-indigo-400">
                Create ticket
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>

            <Link
              href="/docs"
              className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-7 flex flex-col items-start hover:border-indigo-200 dark:hover:border-indigo-500/40 hover:shadow-[0_16px_40px_rgba(91,77,255,0.1)] transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-[16px] font-bold text-[#0F172A] dark:text-white mb-1.5">Documentation</h3>
              <p className="text-[13.5px] text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                Technical documentation, SDK reference, and integration guides for every endpoint.
              </p>
              <span className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-emerald-600 dark:text-emerald-400">
                View docs
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section className="px-6 py-24">
          <div className="max-w-[720px] mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-[30px] md:text-[36px] font-black text-[#0F172A] dark:text-white tracking-[-0.03em] mb-3">
                Frequently asked questions
              </h2>
              <p className="text-[15px] text-slate-500 dark:text-slate-400">Find answers to common questions about ColabOne.</p>
            </div>

            {filteredGroups.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[14px] text-slate-500 dark:text-slate-400 mb-4">
                  No answers matched &ldquo;{query}&rdquo;.
                </p>
                <Link
                  href="/support/ticket"
                  className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-indigo-600 dark:text-indigo-400"
                >
                  Ask our team instead
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-10">
                {filteredGroups.map((g) => (
                  <div key={g.group}>
                    <h3 className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.14em] mb-4 px-1">
                      {g.group}
                    </h3>
                    <div className="flex flex-col gap-3">
                      {g.items.map((item) => (
                        <FaqAccordionItem key={item.q} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Still need help banner ───────────────────────────────────────── */}
        <section className="px-6 pb-24">
          <div className="max-w-[820px] mx-auto bg-[#0F172A] rounded-[32px] px-8 py-12 md:px-14 md:py-14 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h3 className="text-[24px] font-black text-white tracking-tight mb-2">
                Still need a hand?
              </h3>
              <p className="text-[14.5px] text-slate-400 max-w-[380px]">
                Our team reads every ticket. Tell us what&apos;s going on and we&apos;ll get back to you fast.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link href="/support/ticket">
                <span className="inline-flex items-center gap-2 text-[14px] font-bold text-[#0F172A] bg-white hover:bg-slate-100 px-6 py-3.5 rounded-2xl transition-all cursor-pointer">
                  <Ticket className="w-4 h-4" />
                  Raise a ticket
                </span>
              </Link>
              <Link href="/contact">
                <span className="inline-flex items-center gap-2 text-[14px] font-bold text-white bg-white/10 hover:bg-white/15 px-6 py-3.5 rounded-2xl border border-white/10 transition-all cursor-pointer">
                  <Mail className="w-4 h-4" />
                  Contact us
                </span>
              </Link>
            </div>
          </div>
        </section>

      <Footer />
    </div>
  );
}
