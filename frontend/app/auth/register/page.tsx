import Link from "next/link";
import { SignupForm } from "@/components/forms/signup-form";

export default function SignupPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-[#F8FAFC]">
      <div className="flex flex-col gap-4 p-6 md:p-10 justify-between">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                <path
                  d="M7.5 2L12.5 5V10L7.5 13L2.5 10V5L7.5 2Z"
                  fill="white"
                  fillOpacity="0.25"
                  stroke="white"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <path d="M7.5 4.5L10 6V9L7.5 10.5L5 9V6L7.5 4.5Z" fill="white" />
              </svg>
            </div>
            <span className="font-extrabold text-[#0F172A] tracking-tight uppercase text-sm">
              ModelBridge
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm bg-card border border-border/50 p-8 rounded-2xl shadow-xl shadow-slate-200/40">
            <SignupForm />
          </div>
        </div>
        <div className="text-center md:text-left text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} ModelBridge Inc. All rights reserved.
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
              Developer-First API
            </span>
            <h2 className="text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
              Integrate Once. <br/>Scale Infinitely.
            </h2>
            <p className="text-slate-400 text-base font-medium">
              Start building with 400+ models in minutes. Simple SDK, robust logging, and smart fallbacks.
            </p>
          </div>

          {/* Interactive Code Integration Mockup */}
          <div className="w-full max-w-md bg-[#0B0F19]/80 border border-slate-800/80 rounded-2xl p-6 shadow-2xl shadow-black/60 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-[10px] font-mono text-slate-500">model-bridge.ts</span>
            </div>

            <pre className="text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto">
              <code>
<span className="text-indigo-400">import</span> ModelBridge <span className="text-indigo-400">from</span> <span className="text-emerald-400">'@modelbridge/node'</span>;
<br />
<br /><span className="text-indigo-400">const</span> client = <span className="text-indigo-400">new</span> <span className="text-yellow-400">ModelBridge</span>(&#123;
<br />  apiKey: <span className="text-emerald-400">"mb_live_9a2f7c0d"</span>
<br />&#125;);
<br />
<br /><span className="text-indigo-400">const</span> response = <span className="text-indigo-400">await</span> client.chat.create(&#123;
<br />  model: <span className="text-emerald-400">"intelligent-routing"</span>,
<br />  messages: [&#123;
<br />    role: <span className="text-emerald-400">"user"</span>,
<br />    content: <span className="text-emerald-400">"Compare models"</span>
<br />  &#125;]
<br />&#125;);
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
