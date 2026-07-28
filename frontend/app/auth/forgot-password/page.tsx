import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";

export default function ForgotPasswordPage() {
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
            <ForgotPasswordForm />
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
              Account Security
            </span>
            <h2 className="text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
              Get back into <br/>your account
            </h2>
            <p className="text-slate-400 text-base font-medium">
              Verify your email with a one-time code and set a new password in seconds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
