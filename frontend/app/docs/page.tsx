"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Copy, Check, Search, X, ExternalLink,
  Package, Globe, Zap, Layers, Shield, RefreshCw, AlertTriangle, Box,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/landingPage/Footer";

// ── Syntax colours for dark code blocks ───────────────────────────────────────
const SYN = {
  keyword: "#818CF8",  // indigo-400
  string:  "#86EFAC",  // green-300
  comment: "#64748B",  // slate-500
  type:    "#7DD3FC",  // sky-300
  number:  "#FCA5A5",  // rose-300
  plain:   "#E2E8F0",  // slate-200
} as const;

// ── Single source of truth — drives both left nav and right TOC ───────────────
const SECTIONS = [
  {
    group: "Getting Started",
    items: [
      { id: "introduction", label: "Introduction" },
      { id: "installation", label: "Installation" },
      { id: "quickstart",   label: "Quick Start"  },
    ],
  },
  {
    group: "Core Concepts",
    items: [
      { id: "features",      label: "Features"      },
      { id: "configuration", label: "Configuration" },
      { id: "architecture",  label: "Architecture"  },
      { id: "environments",  label: "Environments"  },
    ],
  },
  {
    group: "Resources",
    items: [
      { id: "chat",     label: "Chat Completions" },
      { id: "streaming", label: "Streaming"       },
      { id: "models",   label: "Models"           },
      { id: "usage",    label: "Usage"            },
      { id: "credits",  label: "Credits"          },
    ],
  },
  {
    group: "Advanced",
    items: [
      { id: "errors",     label: "Error Handling"       },
      { id: "advanced",   label: "Advanced Usage"       },
      { id: "typescript", label: "TypeScript Reference" },
    ],
  },
];

const FLAT_SECTIONS = SECTIONS.flatMap(s => s.items);

// ── Code samples ──────────────────────────────────────────────────────────────
const INSTALL: Record<string, string> = {
  npm:  "npm install @model-bridge/sdk",
  pnpm: "pnpm add @model-bridge/sdk",
  yarn: "yarn add @model-bridge/sdk",
  bun:  "bun add @model-bridge/sdk",
};

const CODE_QUICKSTART = `import { ModelBridge } from "@model-bridge/sdk";

const client = new ModelBridge({
  apiKey: process.env.MODELBRIDGE_API_KEY,
});

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user",   content: "Hello, ModelBridge!" },
  ],
});

console.log(response.choices[0].message.content);`;

const CODE_CHAT = `const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user",   content: "Explain async iterators in TypeScript." },
  ],
  temperature: 0.7,
  max_tokens: 1024,
});

const message = response.choices[0].message;
console.log(message.role);     // "assistant"
console.log(message.content);  // "Async iterators allow..."

// Usage metadata on every response
console.log(response.usage.prompt_tokens);     // 24
console.log(response.usage.completion_tokens); // 152`;

const CODE_STREAMING = `const stream = await client.chat.completions.create({
  model: "claude-3-5-sonnet",
  messages: [{ role: "user", content: "Write a haiku about APIs." }],
  stream: true,
});

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content;
  if (delta) process.stdout.write(delta);
}`;

const CODE_MODELS = `// List all available models
const { data: models } = await client.models.list();

// Filter by provider
const anthropicModels = models.filter(m => m.provider === "anthropic");

// Retrieve model details + pricing
const model = await client.models.retrieve("gpt-4o");
console.log(model.pricing.inputPerMillion);   // "$2.50"
console.log(model.pricing.outputPerMillion);  // "$10.00"`;

const CODE_CONFIG = `const client = new ModelBridge({
  apiKey: "mb_...",           // Your ModelBridge API key (required)
  baseURL: "https://...",     // Custom base URL (optional)
  timeout: 30_000,            // Request timeout in ms (default: 60 000)
  maxRetries: 3,              // Max retry attempts (default: 2)
  defaultHeaders: {
    "X-Custom-Header": "value",
  },
});`;

const CODE_ERRORS = `import { ModelBridge, APIError, ModelBridgeError } from "@model-bridge/sdk";

const client = new ModelBridge({ apiKey: process.env.MODELBRIDGE_API_KEY });

try {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: "Hello!" }],
  });
} catch (error) {
  if (error instanceof APIError) {
    console.log(error.status);   // 429
    console.log(error.message);  // "Rate limit exceeded"
    console.log(error.code);     // "rate_limit_error"
  } else if (error instanceof ModelBridgeError) {
    console.log("SDK error:", error.message);
  }
}`;

const CODE_ADVANCED = `// Per-request timeout + retry override
const res = await client.chat.completions.create(
  { model: "gpt-4o", messages: [{ role: "user", content: "Hi!" }] },
  { timeout: 10_000, maxRetries: 0 }
);

// Cancel with AbortController
const controller = new AbortController();
setTimeout(() => controller.abort(), 5_000);

const res2 = await client.chat.completions.create(
  { model: "gpt-4o", messages: [{ role: "user", content: "Hi!" }] },
  { signal: controller.signal }
);`;

const CODE_TYPESCRIPT = `import type {
  ChatCompletion,
  ChatCompletionMessage,
  ChatCompletionChunk,
  Model,
  UsageRecord,
  CreditBalance,
  ModelBridgeClientOptions,
} from "@model-bridge/sdk";

const completion: ChatCompletion = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});`;

const CODE_USAGE = `const { data: records } = await client.usage.list({
  startDate: "2024-01-01",
  endDate:   "2024-01-31",
  limit: 50,
});

const stats = await client.usage.stats({ period: "30d" });
console.log(stats.totalTokens, stats.totalCostUsd);`;

const CODE_CREDITS = `// Check credit balance
const balance = await client.credits.balance();
console.log(balance.amount);    // "42.75"
console.log(balance.currency);  // "USD"

// Transaction history
const { data: txns } = await client.credits.transactions({ limit: 20 });
txns.forEach(t => console.log(t.type, t.amount, t.createdAt));`;

// ── Static data ───────────────────────────────────────────────────────────────
const FEATURES: { Icon: LucideIcon; title: string; desc: string }[] = [
  { Icon: Package,       title: "Zero Dependencies",     desc: "Pure TypeScript — no runtime deps. Ships tiny." },
  { Icon: Globe,         title: "Fetch-Based Transport", desc: "Native Fetch API — works in Node, browser, edge." },
  { Icon: Zap,           title: "Streaming Support",     desc: "First-class async iterator for real-time tokens." },
  { Icon: Layers,        title: "Resource Architecture", desc: "Organized around REST resources — intuitive API." },
  { Icon: Shield,        title: "Fully Type-Safe",       desc: "Complete TypeScript coverage. Autocomplete everything." },
  { Icon: RefreshCw,     title: "Automatic Retries",     desc: "Exponential backoff for transient errors and 429s." },
  { Icon: AlertTriangle, title: "Typed Error Handling",  desc: "Structured error classes with status and error codes." },
  { Icon: Box,           title: "ESM & CommonJS",        desc: "Dual package — import or require, tree-shakeable." },
];

const CONFIG_PARAMS = [
  { param: "apiKey",         type: "string",                 default: "—",                          desc: "Your ModelBridge API key (required)" },
  { param: "baseURL",        type: "string",                 default: "https://api.modelbridge.io", desc: "Override the API base URL" },
  { param: "timeout",        type: "number",                 default: "60 000",                     desc: "Request timeout in milliseconds" },
  { param: "maxRetries",     type: "number",                 default: "2",                          desc: "Max retry attempts on transient errors" },
  { param: "defaultHeaders", type: "Record<string, string>", default: "{}",                         desc: "Headers sent with every request" },
];

const ENVIRONMENTS = [
  { name: "Node.js 18+",        note: "Full support" },
  { name: "Browser",            note: "Via bundler"  },
  { name: "Cloudflare Workers", note: "Edge native"  },
  { name: "Vercel Edge",        note: "Edge native"  },
  { name: "Bun",                note: "Full support" },
  { name: "Deno",               note: "npm: prefix"  },
];

const ERROR_TYPES = [
  "APIError", "AuthenticationError", "RateLimitError",
  "NotFoundError", "TimeoutError", "ModelBridgeError",
];

// ── Syntax highlighter ────────────────────────────────────────────────────────
function highlightLine(line: string): React.ReactNode {
  if (/^\s*\/\//.test(line)) return <span style={{ color: SYN.comment }}>{line}</span>;

  const regex =
    /("(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*')|(\/\/.*)|(\b(?:import|export|from|const|let|var|async|await|return|new|if|else|try|catch|throw|for|of|true|false|null|undefined|process)\b)|(\b[A-Z][a-zA-Z0-9]*\b)|(\b\d[\d_]*(?:\.\d+)?\b)/g;

  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(line)) !== null) {
    if (m.index > last)
      parts.push(<span key={last} style={{ color: SYN.plain }}>{line.slice(last, m.index)}</span>);
    const [full, str, cmt, kw, typ, num] = m;
    const color = str ? SYN.string : cmt ? SYN.comment : kw ? SYN.keyword : typ ? SYN.type : num ? SYN.number : SYN.plain;
    parts.push(<span key={m.index} style={{ color }}>{full}</span>);
    last = m.index + full.length;
  }
  if (last < line.length)
    parts.push(<span key={last} style={{ color: SYN.plain }}>{line.slice(last)}</span>);

  return parts.length ? <>{parts}</> : <span style={{ color: SYN.plain }}>{line}</span>;
}

function highlight(code: string) {
  return code.split("\n").map((line, i) => (
    <span key={i} style={{ display: "block" }}>{highlightLine(line)}</span>
  ));
}

// ── Sub-components ────────────────────────────────────────────────────────────
function CopyBtn({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setDone(true);
    setTimeout(() => setDone(false), 1400);
  }, [code]);

  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-all cursor-pointer ${
        done
          ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-400"
          : "border-white/10 bg-transparent text-slate-500 hover:text-slate-300"
      }`}
    >
      {done ? <Check size={10} /> : <Copy size={10} />}
      {done ? "Copied!" : "Copy"}
    </button>
  );
}

function CodeBlock({ code, lang = "typescript" }: { code: string; lang?: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm mb-6">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0F172A] border-b border-white/5">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest font-mono">{lang}</span>
        <CopyBtn code={code} />
      </div>
      <pre className="m-0 p-5 bg-[#0F172A] text-[13px] leading-[1.75] overflow-x-auto font-mono">
        <code>{highlight(code)}</code>
      </pre>
    </div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-[0.855em] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
      {children}
    </code>
  );
}

function Callout({ type = "tip", children }: { type?: "tip" | "info" | "warn"; children: React.ReactNode }) {
  const cfg = {
    tip:  { cls: "bg-indigo-50 border-l-indigo-500", icon: "✦", textCls: "text-indigo-900" },
    info: { cls: "bg-blue-50 border-l-blue-500",     icon: "ℹ", textCls: "text-blue-900"   },
    warn: { cls: "bg-amber-50 border-l-amber-500",   icon: "⚠", textCls: "text-amber-900"  },
  }[type];
  return (
    <div className={`border-l-4 rounded-r-lg p-4 flex gap-3 mb-6 ${cfg.cls}`}>
      <span className="flex-shrink-0 mt-0.5 text-sm">{cfg.icon}</span>
      <div className={`text-sm leading-relaxed ${cfg.textCls}`}>{children}</div>
    </div>
  );
}

// group on the wrapper lets the # link appear on heading hover
function SecHead({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div id={id} className="scroll-mt-[86px] mb-7 group">
      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2">{eyebrow}</p>
      <h2 className="text-2xl font-black text-[#0F172A] tracking-tight leading-tight flex items-baseline gap-2">
        {title}
        <a
          href={`#${id}`}
          className="text-base text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity no-underline"
          aria-hidden
        >
          #
        </a>
      </h2>
    </div>
  );
}

function SectionNext({ currentId }: { currentId: string }) {
  const idx = FLAT_SECTIONS.findIndex(s => s.id === currentId);
  const next = FLAT_SECTIONS[idx + 1];
  if (!next) return null;
  return (
    <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
      <a
        href={`#${next.id}`}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-400 hover:text-indigo-600 transition-colors"
      >
        Next: {next.label} →
      </a>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DocsPage() {
  const [active, setActive]       = useState("introduction");
  const [pkgTab, setPkgTab]       = useState<"npm" | "pnpm" | "yarn" | "bun">("npm");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return FLAT_SECTIONS.filter(s => s.label.toLowerCase().includes(q));
  }, [searchQuery]);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(v => !v); }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // IntersectionObserver — drives active item in both sidebars
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }),
      { rootMargin: "-15% 0% -65% 0%" }
    );
    FLAT_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      {/* Search overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 bg-[#0F172A]/50 z-[100] flex items-start justify-center pt-[15vh] backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-[540px] bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-indigo-500/10 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <Search size={15} className="text-slate-400 flex-shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search documentation…"
                className="flex-1 border-none bg-transparent text-[15px] text-[#0F172A] outline-none placeholder:text-slate-400 font-medium"
              />
              <button
                aria-label="Close search"
                onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            {searchQuery.trim() === "" ? (
              <div className="px-5 py-4 text-sm text-slate-400">
                Type to search across all documentation.
              </div>
            ) : searchResults.length === 0 ? (
              <div className="px-5 py-4 text-sm text-slate-400">
                No results for &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              <div className="py-2">
                {searchResults.map(item => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-indigo-50 text-[14px] text-[#0F172A] font-medium transition-colors"
                  >
                    <Search size={13} className="text-indigo-400 flex-shrink-0" />
                    {item.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Three-column layout — clears fixed navbar */}
      <div className="pt-[86px]">
        <div className="max-w-[1320px] mx-auto grid grid-cols-1 md:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_218px]">

          {/* ── Left sidebar ── */}
          <aside
            className="hidden md:flex flex-col sticky bg-white border-r border-slate-100 overflow-y-auto"
            style={{ top: "86px", height: "calc(100vh - 86px)" }}
          >
            <div className="p-5 flex flex-col gap-4 flex-1">
              {/* SDK identity */}
              <div className="flex items-center gap-2.5 px-1 pb-4 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-600/20 flex-shrink-0">
                  <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                    <path d="M7.5 2L12.5 5V10L7.5 13L2.5 10V5L7.5 2Z" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
                    <path d="M7.5 4.5L10 6V9L7.5 10.5L5 9V6L7.5 4.5Z" fill="white" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-black text-[#0F172A] tracking-tight leading-none">ModelBridge</p>
                  <p className="text-[11px] text-slate-400 font-medium leading-none mt-0.5">SDK</p>
                </div>
                <span className="ml-auto text-[10px] font-bold text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-full px-2 py-0.5 tracking-wide">
                  v1.0.0
                </span>
              </div>

              {/* Search trigger */}
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-slate-400 text-[13px] font-medium cursor-pointer"
              >
                <Search size={12} />
                <span className="flex-1 text-left">Search docs…</span>
                <span className="text-[10px] font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5">⌘K</span>
              </button>

              {/* Nav — derived from SECTIONS */}
              <nav className="flex flex-col gap-1">
                {SECTIONS.map(grp => (
                  <div key={grp.group} className="mb-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] px-3 mb-1.5">
                      {grp.group}
                    </p>
                    {grp.items.map(it => {
                      const isActive = active === it.id;
                      return (
                        <a
                          key={it.id}
                          href={`#${it.id}`}
                          className={`block px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all border-l-2 ${
                            isActive
                              ? "text-indigo-600 bg-indigo-50 border-indigo-500 font-semibold"
                              : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border-transparent"
                          }`}
                        >
                          {it.label}
                        </a>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </div>
          </aside>

          {/* ── Main content ── */}
          <main className="min-w-0 px-6 py-8 md:px-12 md:py-12 max-w-[760px]">

            {/* Introduction / Hero */}
            <div id="introduction" className="scroll-mt-[86px] mb-16">
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.18em]">Documentation · v1.0.0</span>
              </div>
              <h1 className="text-5xl font-black text-[#0F172A] tracking-tight leading-[1.05] mb-5">
                ModelBridge <span className="text-indigo-600">SDK</span>
              </h1>
              <p className="text-[17px] text-slate-600 leading-[1.72] mb-8 max-w-[560px]">
                A TypeScript SDK for the ModelBridge AI Gateway platform. Access 400+ models through a single, unified API — with streaming, retries, and full type-safety built in.
              </p>

              <div className="flex gap-3 mb-8 flex-wrap">
                <a
                  href="#quickstart"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 hover:-translate-y-0.5"
                >
                  Get Started →
                </a>
                <a
                  href="https://github.com"
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 bg-white hover:border-indigo-200 text-slate-700 text-sm font-bold rounded-2xl transition-all hover:-translate-y-0.5"
                >
                  <ExternalLink size={13} />View on GitHub
                </a>
              </div>

              {/* Install bar */}
              <div className="flex items-center justify-between px-4 py-3.5 bg-[#0F172A] rounded-2xl">
                <code className="font-mono text-[13.5px]" style={{ color: SYN.plain }}>
                  <span style={{ color: SYN.comment }}>$</span>{" "}
                  <span style={{ color: SYN.keyword }}>npm</span>{" "}
                  <span style={{ color: SYN.string }}>install @model-bridge/sdk</span>
                </code>
                <CopyBtn code="npm install @model-bridge/sdk" />
              </div>
              <SectionNext currentId="introduction" />
            </div>

            {/* Installation */}
            <section className="mb-14">
              <SecHead id="installation" eyebrow="Getting Started" title="Installation" />
              <div className="flex gap-0.5 border-b border-slate-200 mb-3">
                {(["npm","pnpm","yarn","bun"] as const).map(pkg => (
                  <button
                    key={pkg}
                    onClick={() => setPkgTab(pkg)}
                    className={`px-4 py-2 text-[13px] font-mono font-medium border-b-2 -mb-px transition-all cursor-pointer ${
                      pkgTab === pkg
                        ? "text-indigo-600 border-indigo-600"
                        : "text-slate-500 border-transparent hover:text-slate-700"
                    }`}
                  >
                    {pkg}
                  </button>
                ))}
              </div>
              <CodeBlock code={INSTALL[pkgTab]} lang="bash" />
              <p className="text-[14px] text-slate-600 leading-relaxed">
                Requires <InlineCode>Node.js 18+</InlineCode>, Bun, Deno, or a modern browser environment. No additional runtime dependencies.
              </p>
              <SectionNext currentId="installation" />
            </section>

            {/* Quick Start */}
            <section className="mb-14">
              <SecHead id="quickstart" eyebrow="Getting Started" title="Quick Start" />
              <Callout type="tip">
                Get your API key from the <a href="/dashboard/keys" className="text-indigo-600 font-semibold hover:underline">ModelBridge Dashboard</a>. Set it as <InlineCode>MODELBRIDGE_API_KEY</InlineCode> in your environment.
              </Callout>
              <CodeBlock code={CODE_QUICKSTART} />
              <SectionNext currentId="quickstart" />
            </section>

            {/* Features */}
            <section className="mb-14">
              <SecHead id="features" eyebrow="Overview" title="Features" />
              <div className="grid grid-cols-2 gap-3">
                {FEATURES.map(f => (
                  <div
                    key={f.title}
                    className="bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 transition-all duration-200 cursor-default group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mb-2.5">
                      <f.Icon size={15} className="text-indigo-600" />
                    </div>
                    <h3 className="text-[14px] font-bold text-[#0F172A] mb-1.5 group-hover:text-indigo-700 transition-colors">{f.title}</h3>
                    <p className="text-[13px] text-slate-500 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
              <SectionNext currentId="features" />
            </section>

            {/* Configuration */}
            <section className="mb-14">
              <SecHead id="configuration" eyebrow="Core Concepts" title="Configuration" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                Pass options to the <InlineCode>ModelBridge</InlineCode> constructor. Only <InlineCode>apiKey</InlineCode> is required.
              </p>
              <CodeBlock code={CODE_CONFIG} />
              <div className="border border-slate-200 rounded-xl overflow-hidden mt-5">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {["Parameter", "Type", "Default", "Description"].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CONFIG_PARAMS.map((row, i) => (
                      <tr key={row.param} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                        <td className={`px-4 py-3 ${i < CONFIG_PARAMS.length - 1 ? "border-b border-slate-100" : ""}`}><InlineCode>{row.param}</InlineCode></td>
                        <td className={`px-4 py-3 ${i < CONFIG_PARAMS.length - 1 ? "border-b border-slate-100" : ""}`}><InlineCode>{row.type}</InlineCode></td>
                        <td className={`px-4 py-3 font-mono text-[12px] text-slate-400 ${i < CONFIG_PARAMS.length - 1 ? "border-b border-slate-100" : ""}`}>{row.default}</td>
                        <td className={`px-4 py-3 text-slate-600 ${i < CONFIG_PARAMS.length - 1 ? "border-b border-slate-100" : ""}`}>{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <SectionNext currentId="configuration" />
            </section>

            {/* Architecture */}
            <section className="mb-14">
              <SecHead id="architecture" eyebrow="Core Concepts" title="Architecture" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                All resources share a single configured client. The transport layer uses the native Fetch API, making it compatible with every modern runtime.
              </p>
              <div className="bg-white border border-slate-200 rounded-xl p-8 mb-5">
                <div className="flex items-center justify-center flex-wrap gap-y-3">
                  {["Resources", "Core Client", "HTTP Layer", "Fetch API"].map((node, i, arr) => (
                    <div key={node} className="flex items-center">
                      <div className={`border rounded-lg px-4 py-2 text-[13px] font-semibold font-mono whitespace-nowrap transition-colors ${
                        i === 0 ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-700"
                      }`}>{node}</div>
                      {i < arr.length - 1 && <span className="px-2 text-indigo-400 font-bold">→</span>}
                    </div>
                  ))}
                </div>
                <p className="text-center text-[12px] text-slate-400 font-medium mt-4">
                  All resources share a single configured client instance
                </p>
              </div>
              <SectionNext currentId="architecture" />
            </section>

            {/* Environments */}
            <section className="mb-14">
              <SecHead id="environments" eyebrow="Core Concepts" title="Environment Support" />
              <div className="grid grid-cols-3 gap-3">
                {ENVIRONMENTS.map(env => (
                  <div key={env.name} className="bg-white border border-slate-200 rounded-xl p-4 text-center hover:border-indigo-200 transition-colors">
                    <p className="text-[13px] font-bold text-[#0F172A] mb-0.5">{env.name}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{env.note}</p>
                  </div>
                ))}
              </div>
              <SectionNext currentId="environments" />
            </section>

            {/* Chat Completions */}
            <section className="mb-14">
              <SecHead id="chat" eyebrow="Resources" title="Chat Completions" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                The primary resource for interacting with language models. Pass <InlineCode>temperature</InlineCode>, <InlineCode>max_tokens</InlineCode>, and any other model parameters alongside your messages.
              </p>
              <CodeBlock code={CODE_CHAT} />
              <SectionNext currentId="chat" />
            </section>

            {/* Streaming */}
            <section className="mb-14">
              <SecHead id="streaming" eyebrow="Resources" title="Streaming" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                Set <InlineCode>stream: true</InlineCode> to receive tokens as they are generated via an async iterator.
              </p>
              <CodeBlock code={CODE_STREAMING} />
              <Callout type="info">
                Streaming works in all environments that support <InlineCode>ReadableStream</InlineCode> — Node.js 18+, browsers, Cloudflare Workers, and Vercel Edge Functions.
              </Callout>
              <SectionNext currentId="streaming" />
            </section>

            {/* Models */}
            <section className="mb-14">
              <SecHead id="models" eyebrow="Resources" title="Models" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                Browse, filter, and retrieve metadata for all 400+ available models including real-time pricing.
              </p>
              <CodeBlock code={CODE_MODELS} />
              <SectionNext currentId="models" />
            </section>

            {/* Usage */}
            <section className="mb-14">
              <SecHead id="usage" eyebrow="Resources" title="Usage Records" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                Query your usage history and aggregate statistics for billing and analytics.
              </p>
              <CodeBlock code={CODE_USAGE} />
              <SectionNext currentId="usage" />
            </section>

            {/* Credits */}
            <section className="mb-14">
              <SecHead id="credits" eyebrow="Resources" title="Credits" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                Check your credit balance and list transaction history programmatically.
              </p>
              <CodeBlock code={CODE_CREDITS} />
              <Callout type="tip">
                Start with <strong>$5 free credits</strong> on signup — no credit card required.{" "}
                <a href="/auth/register" className="text-indigo-600 font-semibold hover:underline">Create your account →</a>
              </Callout>
              <SectionNext currentId="credits" />
            </section>

            {/* Error Handling */}
            <section className="mb-14">
              <SecHead id="errors" eyebrow="Advanced" title="Error Handling" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                The SDK exposes structured error classes with HTTP status codes and ModelBridge error codes.
              </p>
              <div className="flex flex-wrap gap-2 mb-5">
                {ERROR_TYPES.map(e => (
                  <span key={e} className="font-mono text-[12px] bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg px-3 py-1">
                    {e}
                  </span>
                ))}
              </div>
              <CodeBlock code={CODE_ERRORS} />
              <SectionNext currentId="errors" />
            </section>

            {/* Advanced Usage */}
            <section className="mb-14">
              <SecHead id="advanced" eyebrow="Advanced" title="Advanced Usage" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                Override per-request options, cancel with <InlineCode>AbortController</InlineCode>, and configure custom retry behaviour.
              </p>
              <CodeBlock code={CODE_ADVANCED} />
              <SectionNext currentId="advanced" />
            </section>

            {/* TypeScript Reference */}
            <section className="mb-14">
              <SecHead id="typescript" eyebrow="Reference" title="TypeScript Reference" />
              <p className="text-[15px] text-slate-600 leading-[1.75] mb-5">
                All SDK types are exported from the main entry point and can be imported directly.
              </p>
              <CodeBlock code={CODE_TYPESCRIPT} />
            </section>
          </main>

          {/* ── Right TOC — derived from FLAT_SECTIONS ── */}
          <aside
            className="hidden xl:block sticky bg-white border-l border-slate-100 overflow-y-auto"
            style={{ top: "86px", height: "calc(100vh - 86px)" }}
          >
            <div className="px-5 py-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] mb-3">On this page</p>
              <nav className="flex flex-col gap-0.5">
                {FLAT_SECTIONS.map(item => {
                  const isActive = active === item.id;
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`text-[12.5px] px-3 py-1 rounded-lg border-l-2 transition-all ${
                        isActive
                          ? "text-indigo-600 border-indigo-500 bg-indigo-50 font-semibold"
                          : "text-slate-400 border-transparent hover:text-slate-600"
                      }`}
                    >
                      {item.label}
                    </a>
                  );
                })}
              </nav>
              <div className="mt-6 pt-5 border-t border-slate-100">
                <a
                  href="https://github.com"
                  className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-indigo-600 transition-colors font-medium"
                >
                  <ExternalLink size={11} />Edit on GitHub
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
}
