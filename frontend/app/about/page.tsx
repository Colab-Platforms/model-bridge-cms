import { Compass, Layers, ShieldCheck, Sparkles } from "lucide-react";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/landingPage/Footer";

const STATS = [
  { value: "150+", label: "Models supported" },
  { value: "12,000+", label: "Developers building" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "30%", label: "Avg. cost savings" },
];

const VALUES = [
  {
    icon: Layers,
    iconBg: "#EEF2FF",
    iconColor: "#5B4DFF",
    title: "One interface, no lock-in",
    body: "Every provider behind the same request shape. Swap models by changing a string, not rewriting your integration.",
  },
  {
    icon: ShieldCheck,
    iconBg: "#ECFDF5",
    iconColor: "#16A34A",
    title: "Reliability by default",
    body: "Automatic failover and free-tier fallbacks mean a single provider outage never has to become your outage.",
  },
  {
    icon: Sparkles,
    iconBg: "#FFF7ED",
    iconColor: "#EA580C",
    title: "Transparent by design",
    body: "Every token, request, and dollar is logged and attributable — down to the API key and project that spent it.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <div className="pt-[86px]">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section
          className="relative pt-20 pb-16 px-6 overflow-hidden"
          style={{
            background: `radial-gradient(circle at 50% -10%, rgba(91,77,255,0.08) 0%, transparent 55%), #F8FAFC`,
          }}
        >
          <div className="relative max-w-[720px] mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm mb-8">
              <Compass className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[13px] font-medium text-slate-500">About ColabOne</span>
            </div>
            <h1 className="text-[40px] md:text-[54px] font-black text-[#0F172A] leading-[1.02] tracking-[-0.04em]">
              Building the neural backbone{" "}
              <span className="text-indigo-600">for AI applications.</span>
            </h1>
            <p className="mt-6 text-[16px] md:text-[17px] text-slate-500 leading-[1.6] max-w-[560px] mx-auto">
              ColabOne exists because every team building with AI ends up solving the same problem twice: juggling provider SDKs, credentials, and invoices instead of shipping product.
            </p>
          </div>
        </section>

        {/* ── Story ────────────────────────────────────────────────────────── */}
        <section className="px-6 py-8">
          <div className="max-w-[820px] mx-auto grid md:grid-cols-[1fr_auto] gap-10 items-start bg-white border border-slate-200 rounded-[32px] p-8 md:p-12">
            <div>
              <p className="text-[12px] font-bold text-indigo-600 uppercase tracking-[0.2em] mb-4">
                Why we started
              </p>
              <p className="text-[16px] text-slate-600 leading-[1.75] mb-5">
                We kept watching the same story play out: a team picks a model, builds around its quirks, then a better or cheaper one ships a month later — and switching means rewriting request formats, re-plumbing billing, and re-testing failure modes from scratch.
              </p>
              <p className="text-[16px] text-slate-600 leading-[1.75]">
                ColabOne is the layer we wished existed: one API key, one request shape, and a router smart enough to pick the right model for the job — while you keep full visibility into what every request actually cost.
              </p>
            </div>
            <div className="hidden md:flex flex-col gap-3 w-[180px] flex-shrink-0">
              <div className="bg-[#0F172A] rounded-2xl p-4">
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Founded</div>
                <div className="text-[20px] font-black text-white">2025</div>
              </div>
              <div className="bg-indigo-50 rounded-2xl p-4">
                <div className="text-[11px] text-indigo-600/70 font-semibold uppercase tracking-wide mb-1">HQ</div>
                <div className="text-[15px] font-bold text-[#0F172A]">Mumbai, India</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Values ───────────────────────────────────────────────────────── */}
        <section className="px-6 py-16">
          <div className="max-w-[1000px] mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-[28px] md:text-[34px] font-black text-[#0F172A] tracking-[-0.03em] mb-3">
                What we optimize for
              </h2>
              <p className="text-[15px] text-slate-500 max-w-[480px] mx-auto">
                Three principles guide every product decision we make.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-5">
              {VALUES.map((v) => (
                <div
                  key={v.title}
                  className="bg-white border border-slate-200 rounded-[24px] p-7 hover:border-indigo-200 hover:shadow-[0_8px_32px_rgba(91,77,255,0.08)] transition-all duration-250"
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: v.iconBg }}
                  >
                    <v.icon className="w-5 h-5" style={{ color: v.iconColor }} />
                  </div>
                  <h3 className="text-[15px] font-bold text-[#0F172A] mb-2 tracking-[-0.01em]">
                    {v.title}
                  </h3>
                  <p className="text-[13.5px] text-slate-500 leading-[1.65]">{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats ────────────────────────────────────────────────────────── */}
        <section className="px-6 pb-24">
          <div className="max-w-[1000px] mx-auto bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[32px] px-8 py-14 md:px-14">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 text-center">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="text-[36px] md:text-[42px] font-black text-white tracking-tighter mb-1">
                    {s.value}
                  </div>
                  <div className="text-[13px] font-semibold text-white/70">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
