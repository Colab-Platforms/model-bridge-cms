import { Terminal, Puzzle, MousePointer2, Copy, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const BASE_URL = "https://model-bridge-cms-backend.onrender.com/api/v1";

const TOOLS: { name: string; slug: string; category: "VS Code Extension" | "IDE" | "CLI" }[] = [
  { name: "Claude Code", slug: "claude-code", category: "CLI" },
  { name: "Codex",       slug: "codex",       category: "CLI" },
  { name: "Cursor",      slug: "cursor",      category: "IDE" },
  { name: "Cline",       slug: "cline",       category: "VS Code Extension" },
  { name: "Copilot",     slug: "copilot",     category: "VS Code Extension" },
  { name: "Gemini CLI",  slug: "gemini-cli",  category: "CLI" },
  { name: "OpenCode",    slug: "opencode",    category: "CLI" },
  { name: "Kilo Code",   slug: "kilo-code",   category: "VS Code Extension" },
  { name: "Droid",       slug: "droid",       category: "CLI" },
  { name: "Continue",    slug: "continue",    category: "VS Code Extension" },
  { name: "Roo Code",    slug: "roo-code",    category: "VS Code Extension" },
  { name: "Antigravity", slug: "antigravity", category: "IDE" },
];

const CATEGORY_ICON: Record<(typeof TOOLS)[number]["category"], LucideIcon> = {
  "VS Code Extension": Puzzle,
  "IDE": MousePointer2,
  "CLI": Terminal,
};

export default function IntegrationsSection() {
  return (
    <section className="bg-[#F8FAFC] py-32">
      <div className="max-w-[1240px] mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">
            Drop-in Compatible
          </p>
          <h2 className="text-[44px] md:text-[56px] font-black text-[#0F172A] tracking-[-0.04em] leading-[0.95] mb-6">
            One config. Every coding tool <span className="text-indigo-600">works.</span>
          </h2>
          <p className="text-[18px] text-slate-500 max-w-[560px] mx-auto leading-[1.6]">
            Point any OpenAI-compatible CLI or editor at a single base URL — 150+ models behind the scenes.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8 items-start">

          {/* ── Config panel ──────────────────────────────────── */}
          <div>
            <div className="rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-[0_8px_32px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-1.5 px-4 py-3 bg-[#0F172A] border-b border-white/[0.07]">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                <span className="text-[11px] text-[#64748B] font-mono ml-3">your config</span>
              </div>

              <div className="bg-[#0F172A] px-6 py-6 flex flex-col gap-4">
                <div>
                  <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.15em] mb-1.5">Base URL</p>
                  <div className="flex items-center justify-between gap-3 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2">
                    <code className="text-[12.5px] font-mono text-indigo-300 truncate">{BASE_URL}</code>
                    <Copy className="w-3.5 h-3.5 text-[#475569] flex-shrink-0" />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.15em] mb-1.5">API Key</p>
                  <div className="flex items-center justify-between gap-3 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2">
                    <code className="text-[12.5px] font-mono text-[#94A3B8]">{"<from dashboard>"}</code>
                  </div>
                </div>
                <p className="text-[11.5px] text-[#475569] pt-1">One endpoint. Every tool points here.</p>
              </div>
            </div>

            <a
              href="/docs#integrations-overview"
              className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              View integration guides
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* ── Tool grid ─────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {TOOLS.map(tool => {
              const Icon = CATEGORY_ICON[tool.category];
              return (
                <a
                  key={tool.slug}
                  href={`/docs#integration-${tool.slug}`}
                  className="flex items-center gap-2.5 bg-white border border-[#E2E8F0] rounded-xl px-4 py-3.5 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 transition-all group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <span className="text-[13.5px] font-bold text-[#0F172A] group-hover:text-indigo-700 transition-colors truncate">
                    {tool.name}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
