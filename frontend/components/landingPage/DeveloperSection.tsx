import { Terminal, Copy, CheckCircle2 } from "lucide-react";

/* ── Syntax-highlighted code block ──────────────────────────────────────── */

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-[12.5px] leading-[1.9] block">{children}</code>
  );
}
const Dim    = ({ t }: { t: string }) => <span className="text-[#64748B]">{t}</span>;
const Kw     = ({ t }: { t: string }) => <span className="text-[#C084FC]">{t}</span>;
const Str    = ({ t }: { t: string }) => <span className="text-[#86EFAC]">{t}</span>;
const Fn     = ({ t }: { t: string }) => <span className="text-[#7DD3FC]">{t}</span>;
const Obj    = ({ t }: { t: string }) => <span className="text-[#FDE68A]">{t}</span>;
const Prop   = ({ t }: { t: string }) => <span className="text-[#94A3B8]">{t}</span>;
const Val    = ({ t }: { t: string }) => <span className="text-[#FB923C]">{t}</span>;
const Cm     = ({ t }: { t: string }) => <span className="text-[#475569] italic">{t}</span>;

const SDK_FEATURES = [
  {
    title: "OpenAI-compatible",
    description: "Drop-in replacement for the OpenAI SDK. Change one line of code to unlock every provider.",
  },
  {
    title: "Smart routing with `auto`",
    description: "Pass `model: 'auto'` and let our router pick the optimal model per request based on your policy.",
  },
  {
    title: "Streaming supported",
    description: "Full streaming support across all providers with a single unified interface.",
  },
  {
    title: "TypeScript + Python SDKs",
    description: "Idiomatic SDKs for TypeScript and Python. REST API for every other language.",
  },
];

export default function DeveloperSection() {
  return (
    <section className="bg-white py-32">
      <div className="max-w-[1240px] mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-20">
          <p className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">
            Developer Experience
          </p>
          <h2 className="text-[44px] md:text-[56px] font-black text-[#0F172A] tracking-[-0.04em] leading-[0.95] mb-6">
            Integrate in <span className="text-indigo-600">seconds.</span>
          </h2>
          <p className="text-[18px] text-slate-500 max-w-[520px] mx-auto leading-[1.6]">
            One SDK, every provider. API-compatible with the OpenAI standard.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-16 items-center">

          {/* ── Code block ──────────────────────────────────── */}
          <div className="rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-[0_8px_32px_rgba(15,23,42,0.08)]">

            {/* Window bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0F172A] border-b border-white/[0.07]">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                <Terminal className="w-3.5 h-3.5 text-[#475569] ml-3" />
                <span className="text-[11px] text-[#475569] font-medium ml-1">integration.ts</span>
              </div>
              <button className="flex items-center gap-1.5 text-[10px] text-[#475569] hover:text-[#94A3B8] transition-colors px-2 py-1 rounded-md hover:bg-white/[0.06]">
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>

            {/* Code */}
            <div className="bg-[#0F172A] px-6 py-5 overflow-x-auto">
              <Code>
                <Cm t="// ── Before: locked to one provider ────────────────" />{"\n"}
                <Kw t="import" /> <Obj t="OpenAI" /> <Kw t="from" /> <Str t="'openai'" />{"\n"}
                <Kw t="const" /> client = <Kw t="new" /> <Fn t="OpenAI" />{"({ "}<Prop t="apiKey" />{": process.env."}<Val t="OPENAI_API_KEY" />{" });"}{"\n"}
                {"\n"}
                <Cm t="// ── After: all providers, one SDK ──────────────────" />{"\n"}
                <Kw t="import" /> <Obj t="ModelBridge" /> <Kw t="from" /> <Str t="'@modelbridge/sdk'" />{"\n"}
                <Kw t="const" /> client = <Kw t="new" /> <Fn t="ModelBridge" />{"({ "}<Prop t="apiKey" />{": process.env."}<Val t="MODELBRIDGE_API_KEY" />{" });"}{"\n"}
                {"\n"}
                <Cm t="// ── Smart routing — picks the best model for you ───" />{"\n"}
                <Kw t="const" /> response = <Kw t="await" /> client.<Obj t="chat" />.<Obj t="completions" />.<Fn t="create" />{"({"}{"\n"}
                {"  "}<Prop t="model" />{": "}<Str t="'auto'" />{",  "}<Cm t="// or 'gpt-4o', 'claude-3-5-sonnet', ..." />{"\n"}
                {"  "}<Prop t="messages" />{": [{ "}<Prop t="role" />{": "}<Str t="'user'" />{", "}<Prop t="content" />{": "}<Str t="'Hello!'" />{" }],"}{"\n"}
                {"});"}{"\n"}
                {"\n"}
                <Cm t="// Response includes routing metadata" />{"\n"}
                <Fn t="console" />.<Fn t="log" />{"("}<Obj t="response" />.<Obj t="choices" />{"[0]."}<Obj t="message" />{"."}<Val t="content" />{");"}{"\n"}
                <Cm t="// Routed to: claude-3-5-sonnet | Latency: 0.4s | Cost: $0.0018" />
              </Code>
            </div>

            {/* Bottom status bar */}
            <div className="bg-[#0A0F1E] px-6 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
                  <span className="text-[10px] text-[#475569] font-medium">No provider lock-in</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
                  <span className="text-[10px] text-[#475569] font-medium">Automatic fallback</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                <span className="text-[10px] text-[#22C55E] font-semibold">Live</span>
              </div>
            </div>
          </div>

          {/* ── Feature bullets ──────────────────────────────── */}
          <div className="flex flex-col gap-5">
            {SDK_FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="flex gap-4 p-4 rounded-2xl border border-[#F1F5F9] hover:border-[#E2E8F0] hover:bg-[#FAFAFA] transition-all duration-200"
              >
                <div className="w-8 h-8 rounded-xl bg-[#EEF2FF] flex items-center justify-center text-[12px] font-bold text-[#5B4DFF] flex-shrink-0 mt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <div className="text-[14px] font-bold text-[#0F172A] mb-1">{f.title}</div>
                  <div className="text-[13px] text-[#64748B] leading-[1.6]">{f.description}</div>
                </div>
              </div>
            ))}

            {/* Install line */}
            <div className="mt-2 flex items-center gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3">
              <Terminal className="w-4 h-4 text-[#94A3B8] flex-shrink-0" />
              <code className="text-[12.5px] font-mono text-[#334155]">
                npm install @modelbridge/sdk
              </code>
              <div className="ml-auto flex items-center gap-1 text-[11px] text-[#94A3B8]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                v1.4.2
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
