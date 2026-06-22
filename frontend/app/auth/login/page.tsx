import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
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
            <span className="font-black text-[#0F172A] tracking-tighter uppercase text-sm opacity-80">
              ModelBridge
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-indigo-900 flex flex-col items-center justify-center gap-6 p-12">
          <div className="text-center">
            <p className="text-4xl font-black text-white tracking-tighter leading-tight mb-3">
              The unified interface<br />for LLMs
            </p>
            <p className="text-indigo-200 text-base font-medium">
              One API. Every model. Full control.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            {[
              { label: "Models", value: "400+" },
              { label: "Providers", value: "60+" },
              { label: "Tokens served", value: "100T+" },
              { label: "Developers", value: "8M+" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 rounded-xl p-4 text-center">
                <p className="text-white text-2xl font-black">{value}</p>
                <p className="text-indigo-200 text-xs font-semibold mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
