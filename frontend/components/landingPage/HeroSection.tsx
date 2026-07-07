import Link from "next/link";
import { ArrowRight, Zap, ShieldCheck, TrendingUp } from "lucide-react";

/* ── Dashboard Mockup ──────────────────────────────────────────────────── */

const BAR_HEIGHTS = [34, 51, 43, 67, 57, 73, 61, 85, 70, 56, 80, 91, 75, 87, 93];

const MODELS = [
  { name: "gpt-4o",            provider: "OpenAI",    reqs: "234.2K", cost: "$421.30", lat: "1.2s", color: "#10B981", pct: 74 },
  { name: "claude-3-5-sonnet", provider: "Anthropic", reqs: "180.1K", cost: "$312.80", lat: "0.9s", color: "#8B5CF6", pct: 57 },
  { name: "gemini-2.0-flash",  provider: "Google",    reqs: "89.4K",  cost: "$76.20",  lat: "0.4s", color: "#3B82F6", pct: 28 },
];

const KPIS = [
  { v: "1.24M", l: "Requests",   c: "+12.3%", up: true  },
  { v: "48.3B", l: "Tokens",     c: "+8.1%",  up: true  },
  { v: "$847",  l: "Total Spend",c: "-3.2%",  up: false },
  { v: "0.8s",  l: "Avg Latency",c: "",       up: false },
];

function DashboardMockup() {
  return (
    <div className="w-full rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden shadow-[0_24px_80px_rgba(15,23,42,0.11),0_4px_16px_rgba(15,23,42,0.05)] animate-float">

      {/* Window chrome */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#F1F5F9] bg-[#FAFAFA]">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          <span className="ml-3 text-[11px] font-medium text-[#94A3B8] select-none">ModelBridge Analytics</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[10px] text-[#475569] font-medium">All operational</span>
          </div>
          <div className="text-[10px] text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded-[5px] font-medium">Last 30d</div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 divide-x divide-[#F1F5F9]">
        {KPIS.map((s) => (
          <div key={s.l} className="px-3.5 py-3">
            <div className="text-[15px] font-bold text-[#0F172A] tracking-tight">{s.v}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[9.5px] text-[#94A3B8] font-medium">{s.l}</span>
              {s.c && (
                <span className={`text-[9.5px] font-bold ${s.up ? "text-[#22C55E]" : "text-[#F59E0B]"}`}>
                  {s.c}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="px-4 pt-3 pb-2.5 border-t border-[#F1F5F9]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9.5px] font-bold text-[#475569] uppercase tracking-wider">Request Volume</span>
          <span className="text-[9.5px] text-[#22C55E] font-semibold">↑ 23% vs last period</span>
        </div>
        <div className="flex items-end gap-[2.5px] h-[52px]">
          {BAR_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-[2px]"
              style={{
                height: `${h}%`,
                background:
                  i === BAR_HEIGHTS.length - 1
                    ? "#5B4DFF"
                    : `rgba(91,77,255,${0.18 + (h / 100) * 0.52})`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Model table */}
      <div className="border-t border-[#F1F5F9]">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-[9.5px] font-bold text-[#475569] uppercase tracking-wider">Model Performance</span>
          <span className="text-[9.5px] text-[#5B4DFF] font-semibold cursor-pointer">View all →</span>
        </div>
        <div className="divide-y divide-[#F8FAFC]">
          {MODELS.map((m) => (
            <div key={m.name} className="flex items-center gap-2.5 px-4 py-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-[#0F172A] truncate">{m.name}</div>
                <div className="text-[9.5px] text-[#94A3B8] font-medium">{m.provider}</div>
              </div>
              <div className="w-14 h-1 bg-[#F1F5F9] rounded-full overflow-hidden hidden sm:block">
                <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.color }} />
              </div>
              <div className="text-[10px] font-medium text-[#64748B] w-10 text-right">{m.reqs}</div>
              <div className="text-[10px] font-bold text-[#0F172A] w-12 text-right">{m.cost}</div>
              <div className="text-[10px] font-semibold text-[#22C55E] w-8 text-right">{m.lat}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className="border-t border-[#F1F5F9] px-4 py-2 bg-[#FAFAFA] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#5B4DFF] animate-pulse" />
          <span className="text-[9.5px] text-[#475569] font-medium">Smart routing active</span>
        </div>
        <span className="text-[9.5px] text-[#94A3B8]">Failover: 3 backups configured</span>
      </div>
    </div>
  );
}

/* ── Hero Section ──────────────────────────────────────────────────────── */

const TRUST_AVATARS = ["#5B4DFF", "#10B981", "#F59E0B", "#EC4899", "#3B82F6"];

export default function HeroSection() {
  return (
    <section
      className="relative min-h-[90vh] flex flex-col items-center justify-start pt-32 pb-20 overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 50% -20%, rgba(91,77,255,0.1) 0%, transparent 50%),
          radial-gradient(circle at 100% 100%, rgba(129,140,248,0.03) 0%, transparent 40%),
          #F8FAFC
        `,
      }}
    >
      {/* ── Background decoration ─────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none select-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(124, 58, 237, 0.08) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 0%, black 0%, transparent 100%)",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 0%, black 0%, transparent 100%)",
        }}
      />

      <div className="relative w-full max-w-[1200px] mx-auto px-6 flex flex-col items-center text-center">
        
        {/* Badge */}
        <div className="opacity-0-init animate-fade-in flex items-center gap-2.5 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm mb-10 translate-y-4">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[13px] font-medium text-slate-500">
            Trusted by <span className="font-bold text-indigo-600">12,000+ engineers</span>
          </span>
          <div className="w-px h-3 bg-slate-200 mx-1" />
          <Link href="/blog/v1-launch" className="flex items-center gap-1 text-[13px] font-bold text-indigo-600 hover:text-indigo-700">
            Reading v1.4 is out
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Headline */}
        <h1 className="opacity-0-init animate-fade-in-up delay-100 text-[56px] md:text-[72px] lg:text-[84px] font-black text-[#0F172A] leading-[0.95] tracking-[-0.05em] max-w-[900px]">
          One API. Every{" "}
          <span
            className="animate-gradient text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600"
            style={{ backgroundSize: '200% auto' }}
          >
            AI Model.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="opacity-0-init animate-fade-in-up delay-200 mt-8 text-[18px] md:text-[20px] text-slate-500 leading-[1.6] max-w-[640px]">
          The intelligent neural backbone for your AI applications. Connect to 150+ models with a single endpoint. Smart routing, automatic failover, and unified billing.
        </p>

        {/* CTAs */}
        <div className="opacity-0-init animate-fade-in-up delay-300 mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/auth/register">
            <span className="inline-flex items-center gap-2 text-[15px] font-bold text-white bg-[#5B4DFF] hover:bg-[#4338CA] px-8 py-4 rounded-2xl transition-all duration-300 shadow-[0_10px_20px_-5px_rgba(91,77,255,0.4)] hover:shadow-[0_15px_30px_-5px_rgba(91,77,255,0.5)] hover:-translate-y-0.5 cursor-pointer">
              Get Your API Key
              <ArrowRight className="w-4.5 h-4.5" />
            </span>
          </Link>
          <Link href="/docs">
            <span className="inline-flex items-center gap-2 text-[15px] font-bold text-slate-900 bg-white hover:bg-slate-50 px-8 py-4 rounded-2xl border border-slate-200 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer">
              Read the Docs
            </span>
          </Link>
        </div>

        {/* ── Mockup Container ─────────────────── */}
        <div className="opacity-0-init animate-fade-in-up delay-400 mt-20 relative w-full max-w-[1000px]">
          {/* Decorative glow */}
          <div className="absolute -inset-4 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 blur-3xl opacity-50 -z-10 rounded-[40px]" />
          
          {/* Main Dashboard Window */}
          <div className="relative z-10 scale-[1.02] md:scale-100">
            <DashboardMockup />
          </div>

          {/* Floating detail card 1 */}
          <div className="absolute -left-12 top-1/4 hidden xl:block animate-float delay-700">
            <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl w-48">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fastest Model</span>
              </div>
              <div className="text-[14px] font-bold text-slate-900">gemini-1.5-flash</div>
              <div className="text-[11px] text-emerald-500 font-semibold mt-1">0.24s Latency</div>
            </div>
          </div>

          {/* Floating detail card 2 */}
          <div className="absolute -right-12 bottom-1/4 hidden xl:block animate-float">
            <div className="bg-[#0F172A] p-4 rounded-2xl shadow-2xl w-52 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Routing Intelligence</span>
              </div>
              <div className="text-[12px] font-medium text-slate-300">Switched to <span className="text-white font-bold">Claude 3.5</span></div>
              <div className="text-[10px] text-slate-500 mt-1">Reason: Lower cost per token</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
