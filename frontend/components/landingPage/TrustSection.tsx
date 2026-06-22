const PROVIDERS = [
  { name: "OpenAI",    logo: "OAI" },
  { name: "Anthropic", logo: "ANT" },
  { name: "Google",    logo: "GGL" },
  { name: "Meta",      logo: "META" },
  { name: "Mistral",   logo: "MST" },
  { name: "DeepSeek",  logo: "DSK" },
  { name: "Cohere",    logo: "COH" },
  { name: "Groq",      logo: "GRQ" },
];

const METRICS = [
  { value: "400+",    label: "Models Supported",    sub: "Every major provider" },
  { value: "99.9%",   label: "Uptime SLA",          sub: "Enterprise reliability" },
  { value: "0.2s",    label: "Fastest Latency",     sub: "Global edge network" },
  { value: "30%",     label: "Avg. Savings",        sub: "Via smart routing" },
];

export default function TrustSection() {
  const doubled = [...PROVIDERS, ...PROVIDERS, ...PROVIDERS];

  return (
    <section className="bg-white border-y border-slate-100 py-16">
      <div className="max-w-[1200px] mx-auto px-6">

        {/* Eyebrow */}
        <p className="text-center text-[12px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-12">
          Infrastructure for the world's most ambitious AI teams
        </p>

        {/* Scrolling logos */}
        <div className="relative overflow-hidden">
          {/* Fade edges */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

          <div className="flex items-center gap-16 animate-scroll-x w-max pb-4">
            {doubled.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-3 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-default"
              >
                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                  {p.logo.slice(0, 2)}
                </div>
                <span className="text-[15px] font-bold text-slate-900 tracking-tight">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="mt-16 border-t border-slate-100" />

        {/* Metrics grid */}
        <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
          {METRICS.map((m) => (
            <div key={m.label} className="flex flex-col items-center">
              <div className="text-[44px] font-black text-[#0F172A] tracking-tighter mb-1">
                {m.value}
              </div>
              <div className="text-[14px] font-bold text-slate-900 mb-0.5">{m.label}</div>
              <div className="text-[12px] text-slate-400 font-medium tracking-wide italic">{m.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
