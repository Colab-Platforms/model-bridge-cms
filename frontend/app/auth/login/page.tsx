import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-[#F8FAFC]">
      <div className="flex flex-col gap-4 p-6 md:p-10 justify-between">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ColabOne_Logo.png"
              alt="ColabOne Logo"
              style={{ height: "38px", width: "auto" }}
              className="group-hover:scale-105 transition-transform duration-300 drop-shadow-md rounded-md"
            />
            <span className="font-extrabold text-[#0F172A] tracking-tight uppercase text-sm">
              ColabOne
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm bg-card border border-border/50 p-8 rounded-2xl shadow-xl shadow-slate-200/40">
            <LoginForm />
          </div>
        </div>
        <div className="text-center md:text-left text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} ColabOne Inc. All rights reserved.
        </div>
      </div>
      
      {/* Visual SaaS Right Panel */}
      <div className="relative hidden bg-[#030712] lg:block overflow-hidden border-l border-slate-900">
        {/* Glowing Background Artifices */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        
        {/* Subtle Grid overlay */}
        <div className="absolute inset-0 opacity-15" style={{ 
          backgroundImage: "radial-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px)", 
          backgroundSize: "20px 20px" 
        }} />

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-10 p-12">
          <div className="text-center max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-4 border border-primary/20">
              New: Automatic Fallbacks
            </span>
            <h2 className="text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
              The Unified Interface <br/>for Language Models
            </h2>
            <p className="text-slate-400 text-base font-medium">
              One API integration. Access all major providers. Smart failovers. Real-time cost routing.
            </p>
          </div>

          {/* Interactive Routing Visual Card Mockup */}
          <div className="w-full max-w-md bg-[#0B0F19]/80 border border-slate-800/80 rounded-2xl p-6 shadow-2xl shadow-black/60 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
              <span className="text-[10px] font-mono text-slate-500">POST /v1/chat/completions</span>
            </div>

            <div className="space-y-3">
              {/* Route 1: OpenAI */}
              <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                    GP
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white leading-none">gpt-4o</p>
                    <p className="text-[9.5px] text-primary/80 mt-1 font-medium">OpenAI · Primary Route</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono text-emerald-400 font-bold">99.9% Success</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">Latency: 280ms</p>
                </div>
              </div>

              {/* Connecting Line Visual */}
              <div className="flex justify-center my-[-4px]">
                <div className="w-[1.5px] h-4 bg-gradient-to-b from-primary/30 to-slate-800" />
              </div>

              {/* Route 2: Anthropic */}
              <div className="flex items-center justify-between bg-slate-900/40 border border-slate-800/60 rounded-xl p-3.5 opacity-60 hover:opacity-85 transition-opacity">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold">
                    CL
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-300 leading-none">claude-3-5-sonnet</p>
                    <p className="text-[9.5px] text-slate-500 mt-1 font-medium">Anthropic · Failover Route</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono text-slate-400 font-bold">Fallback Standby</p>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">Latency: 410ms</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
