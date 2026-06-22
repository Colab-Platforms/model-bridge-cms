"use client";

import Link from "next/link";
import { SignupForm } from "@/components/forms/signup-form";

export default function SignupPage() {
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
            <SignupForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-indigo-900 flex flex-col items-center justify-center gap-6 p-12">
          <div className="text-center">
            <p className="text-4xl font-black text-white tracking-tighter leading-tight mb-3">
              Start building<br />in minutes
            </p>
            <p className="text-indigo-200 text-base font-medium">
              Free to start. No credit card required.
            </p>
          </div>
          <ul className="flex flex-col gap-3 w-full max-w-sm">
            {[
              "Access 400+ models via a single API",
              "Pay only for what you use",
              "Real-time usage logs & analytics",
              "Automatic fallbacks & routing",
            ].map((feat) => (
              <li key={feat} className="flex items-center gap-3 text-indigo-100 text-sm font-medium">
                <span className="flex size-5 items-center justify-center rounded-full bg-white/20 flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                {feat}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
