"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, GitBranch, Zap, CheckCircle2, Copy, Check, ChevronRight } from "lucide-react";

const SYN = {
  keyword: "#818CF8",
  string:  "#86EFAC",
  comment: "#64748B",
  type:    "#7DD3FC",
  plain:   "#E2E8F0",
} as const;

function highlightLine(line: string): React.ReactNode {
  if (/^\s*\/\//.test(line)) return <span style={{ color: SYN.comment }}>{line}</span>;
  const regex =
    /("(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*')|(\/\/.*)|(\b(?:import|export|from|const|let|var|async|await|return|new|if|else|for|of|true|false|null)\b)|(\b[A-Z][a-zA-Z0-9]*\b)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) parts.push(<span key={last} style={{ color: SYN.plain }}>{line.slice(last, m.index)}</span>);
    const [full, str, cmt, kw, typ] = m;
    const color = str ? SYN.string : cmt ? SYN.comment : kw ? SYN.keyword : typ ? SYN.type : SYN.plain;
    parts.push(<span key={m.index} style={{ color }}>{full}</span>);
    last = m.index + full.length;
  }
  if (last < line.length) parts.push(<span key={last} style={{ color: SYN.plain }}>{line.slice(last)}</span>);
  return parts.length ? <>{parts}</> : <span style={{ color: SYN.plain }}>{line}</span>;
}

function highlight(code: string) {
  return code.split("\n").map((line, i) => (
    <span key={i} style={{ display: "block" }}>{highlightLine(line)}</span>
  ));
}

const CODE_BOT = `import { ColabOne } from "@colab-one/sdk";

const client = new ColabOne({
  apiKey: process.env.COLABONE_API_KEY,
});

const history = [
  { role: "system", content: "You are a support agent." },
];

async function chat(userMsg: string) {
  history.push({ role: "user", content: userMsg });

  // Fan out to 3 models — pick fastest success
  const result = await client.chat.completions.create({
    models: ["gpt-4o-mini", "claude-3-haiku", "gemini-2-flash"],
    messages: history,
  });

  const best = result.results.find(r => r.status === "success");
  history.push({ role: "assistant", content: best.content });
  return best; // .content, .model, .latencyMs, .billing
}`;

const STEPS = [
  { num: "01", title: "Install the SDK", code: "npm install @colab-one/sdk" },
  { num: "02", title: "Get your API key", code: "COLABONE_API_KEY=mb_..." },
  { num: "03", title: "Pick your models", code: 'models: ["gpt-4o", "claude-3-5-sonnet"]' },
  { num: "04", title: "Ship your bot", code: "npx ts-node your-agent.ts" },
];

const USE_CASES = [
  {
    icon: Bot,
    title: "Customer Support Bots",
    desc: "Build support chatbots that never go offline — if GPT-4 is slow, Claude answers instantly.",
    badge: "Most popular",
    badgeColor: "bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  },
  {
    icon: GitBranch,
    title: "AI Comparison Tools",
    desc: "Let your users see answers from multiple models side-by-side in one request.",
    badge: "Multi-model",
    badgeColor: "bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400",
  },
  {
    icon: Zap,
    title: "Latency-Optimised Agents",
    desc: "Route to whichever model responds first. Build sub-second AI pipelines.",
    badge: "Speed",
    badgeColor: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
];

function CopyBtn({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(code);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-all ${
        done ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-400" : "border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-300"
      }`}
    >
      {done ? <Check size={10} /> : <Copy size={10} />}
      {done ? "Copied!" : "Copy"}
    </button>
  );
}

export default function MultiModelSection() {
  return (
    <section className="bg-[#F8FAFC] dark:bg-[#0B0F19] py-24 border-t border-slate-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-full px-4 py-1.5 mb-5">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">New · Multi-Model Routing</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#0F172A] dark:text-white tracking-tight leading-tight mb-5">
            Build AI chatbots & agents<br />
            <span className="text-indigo-600 dark:text-indigo-400">in minutes, not weeks</span>
          </h2>
          <p className="text-[17px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-[580px] mx-auto">
            Send one request. Fan out to multiple AI models simultaneously. Pick the fastest, cheapest, or best response — automatically.
          </p>
        </div>

        {/* Two-column: steps + code */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start mb-20">

          {/* Left — steps */}
          <div className="flex flex-col gap-6">
            <p className="text-[13px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              From zero to production in 4 steps
            </p>
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="flex items-start gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-indigo-200 dark:hover:border-indigo-500/40 hover:shadow-md hover:shadow-indigo-500/5 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white text-[13px] font-black flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-600/20">
                  {step.num}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#0F172A] dark:text-white mb-1">{step.title}</p>
                  <div className="flex items-center justify-between bg-[#0F172A] rounded-lg px-3 py-2">
                    <code className="font-mono text-[12px]" style={{ color: SYN.string }}>{step.code}</code>
                    <CopyBtn code={step.code} />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex gap-3 mt-2">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/20 hover:-translate-y-0.5"
              >
                Start for free →
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 px-6 py-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-500/40 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-2xl transition-all hover:-translate-y-0.5"
              >
                Read the docs <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {/* Right — code */}
          <div>
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/5">
              <div className="flex items-center gap-2 px-4 py-3 bg-[#0F172A] border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <span className="flex-1 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-widest">
                  agent.ts
                </span>
                <CopyBtn code={CODE_BOT} />
              </div>
              <pre className="m-0 p-6 bg-[#0F172A] text-[12.5px] leading-[1.8] overflow-x-auto font-mono">
                <code>{highlight(CODE_BOT)}</code>
              </pre>
            </div>

            {/* Response preview */}
            <div className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Response</p>
              <div className="flex flex-col gap-2">
                {[
                  { model: "gpt-4o-mini",   status: "success", ms: "312ms",  content: "Of course! Let me help you..." },
                  { model: "claude-3-haiku", status: "success", ms: "441ms",  content: "Sure, I'd be happy to..." },
                  { model: "gemini-2-flash", status: "timeout", ms: "—",     content: null },
                ].map((r) => (
                  <div key={r.model} className="flex items-center gap-3 text-[12px]">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.status === "success" ? "bg-green-500" : "bg-red-400"}`} />
                    <span className="font-mono text-slate-500 dark:text-slate-400 w-36 truncate">{r.model}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === "success" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                      {r.status}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 ml-auto font-mono">{r.ms}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Use case cards */}
        <div className="mb-16">
          <p className="text-[13px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mb-8">
            What you can build with multi-model routing
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {USE_CASES.map((uc) => (
              <div
                key={uc.title}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:border-indigo-200 dark:hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                    <uc.icon size={18} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className={`text-[10px] font-bold rounded-full px-2.5 py-1 ${uc.badgeColor}`}>
                    {uc.badge}
                  </span>
                </div>
                <h3 className="text-[15px] font-bold text-[#0F172A] dark:text-white mb-2 group-hover:text-indigo-700 transition-colors">{uc.title}</h3>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Feature checklist strip */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-8 text-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <h3 className="text-2xl font-black mb-2 tracking-tight">Everything you need to ship</h3>
              <p className="text-indigo-100 text-[14px] leading-relaxed">
                One SDK, one API key, one invoice — for every AI provider.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                "Parallel model execution",
                "Per-model billing breakdown",
                "Auto-retry on failure",
                "Per-model latency tracking",
                "Token usage per model",
                "Streaming (single model)",
                "150+ models",
                "OpenAI-compatible shape",
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-[13px] font-medium text-indigo-100">
                  <CheckCircle2 size={14} className="text-indigo-300 flex-shrink-0" />
                  {feat}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
