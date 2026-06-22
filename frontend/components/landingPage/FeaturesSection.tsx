import {
  Zap,
  ShieldCheck,
  TrendingDown,
  BarChart3,
  ArrowLeftRight,
  CreditCard,
  LucideIcon,
} from "lucide-react";

interface Feature {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  tag?: string;
}

const FEATURES: Feature[] = [
  {
    icon: Zap,
    iconBg: "#EEF2FF",
    iconColor: "#5B4DFF",
    title: "Smart Model Routing",
    description:
      "Automatically route each request to the best-performing model based on cost, latency, and capability. Set policies once — we handle the rest.",
    tag: "Intelligent",
  },
  {
    icon: ShieldCheck,
    iconBg: "#ECFDF5",
    iconColor: "#16A34A",
    title: "Automatic Failover",
    description:
      "If a provider goes down, ModelBridge instantly reroutes to a backup with zero code changes. Your app stays live even when providers don't.",
    tag: "99.9% SLA",
  },
  {
    icon: TrendingDown,
    iconBg: "#FFF7ED",
    iconColor: "#EA580C",
    title: "Cost Optimization",
    description:
      "Reduce your AI spend by up to 30% with intelligent model selection, token caching, and real-time provider price comparisons.",
    tag: "Save 30%",
  },
  {
    icon: BarChart3,
    iconBg: "#F0F9FF",
    iconColor: "#0284C7",
    title: "Usage Analytics",
    description:
      "Track every token, every request, every dollar. Drill into usage by model, API key, project, or time period with one-click exports.",
  },
  {
    icon: ArrowLeftRight,
    iconBg: "#F5F3FF",
    iconColor: "#7C3AED",
    title: "Model Comparison",
    description:
      "Benchmark any two models side-by-side on speed, cost, and quality. Make data-driven model decisions, not guesses.",
  },
  {
    icon: CreditCard,
    iconBg: "#FFF1F2",
    iconColor: "#BE123C",
    title: "Unified Billing",
    description:
      "One invoice for all your AI providers. Prepay credits, set team budgets, and manage spending across the entire organization in one place.",
  },
];

function FeatureCard({ feature }: { feature: Feature }) {
  const { icon: Icon, iconBg, iconColor, title, description, tag } = feature;

  return (
    <div className="group relative bg-white border border-[#E2E8F0] rounded-2xl p-6 hover:border-[#C7D2FE] hover:shadow-[0_8px_32px_rgba(91,77,255,0.08)] transition-all duration-250 cursor-default">
      {/* Top: icon + tag */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200"
          style={{ background: iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} strokeWidth={2} />
        </div>
        {tag && (
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
            style={{
              color: iconColor,
              background: iconBg,
              borderColor: `${iconColor}20`,
            }}
          >
            {tag}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-bold text-[#0F172A] mb-2 tracking-[-0.01em]">
        {title}
      </h3>

      {/* Description */}
      <p className="text-[13.5px] text-[#64748B] leading-[1.65]">{description}</p>

      {/* Subtle bottom accent line on hover */}
      <div
        className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent, ${iconColor}60, transparent)`,
        }}
      />
    </div>
  );
}

export default function FeaturesSection() {
  return (
    <section className="bg-white py-32 overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-6">
        
        {/* Header */}
        <div className="text-center mb-20">
          <p className="text-[12px] font-bold text-indigo-600 uppercase tracking-[0.2em] mb-4">
            The Infrastructure Layer
          </p>
          <h2 className="text-[44px] md:text-[56px] font-black text-[#0F172A] tracking-[-0.04em] leading-[0.95] mb-6">
            Engineered for <span className="text-indigo-600">reliability.</span>
          </h2>
          <p className="text-[18px] text-slate-500 max-w-[580px] mx-auto leading-[1.6]">
            We handle the complexities of multi-provider orchestration so your team can focus on building what matters.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6">
          
          {/* Main: Smart Routing (Large) */}
          <div className="md:col-span-6 lg:col-span-8 bg-slate-50 border border-slate-200 rounded-[32px] p-10 flex flex-col justify-between group hover:border-indigo-200 transition-all duration-300 relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-indigo-500/5 mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-[#0F172A] mb-4">Smart Model Routing</h3>
              <p className="text-slate-600 text-lg leading-relaxed max-w-sm">
                Our dynamic router executes each request on the optimal model based on your custom cost, speed, and quality policies.
              </p>
            </div>
            
            {/* Visual simulation */}
            <div className="absolute right-0 bottom-0 top-0 w-1/2 bg-gradient-to-l from-indigo-100/50 to-transparent flex items-center justify-end pr-10">
               <div className="flex flex-col gap-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`w-32 h-10 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center px-3 gap-2 opacity-${40 + (i*20)}`}>
                       <div className="w-2 h-2 rounded-full bg-emerald-500" />
                       <div className="w-16 h-1.5 bg-slate-100 rounded-full" />
                    </div>
                  ))}
               </div>
            </div>
          </div>

          {/* Failover (Medium) */}
          <div className="md:col-span-6 lg:col-span-4 bg-[#0F172A] rounded-[32px] p-10 flex flex-col justify-between group">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-4">Instant Failover</h3>
              <p className="text-slate-400 text-lg leading-relaxed">
                99.99% uptime guaranteed. If OpenAI dips, we switch to Claude in milliseconds.
              </p>
            </div>
          </div>

          {/* Analytics (Small) */}
          <div className="md:col-span-3 lg:col-span-4 bg-white border border-slate-200 rounded-[32px] p-8 flex flex-col gap-6 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-2">Deep Analytics</h3>
              <p className="text-slate-500 text-base leading-relaxed">
                Every token and request tracked. Real-time cost transparency.
              </p>
            </div>
          </div>

          {/* Cost (Small) */}
          <div className="md:col-span-3 lg:col-span-4 bg-white border border-slate-200 rounded-[32px] p-8 flex flex-col gap-6 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-2">Cost Reduction</h3>
              <p className="text-slate-500 text-base leading-relaxed">
                Save 30% on average by leveraging cheaper models for simple tasks.
              </p>
            </div>
          </div>

          {/* Billing (Small) */}
          <div className="md:col-span-6 lg:col-span-4 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[32px] p-8 flex flex-col justify-between">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Unified Billing</h3>
              <p className="text-white/80 text-base leading-relaxed">
                One invoice for every AI provider. No more complex credit management.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
