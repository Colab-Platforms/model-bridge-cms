"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useState, useEffect } from "react";
import { ArrowRight, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Models", href: "/models" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
  { label: "Blog", href: "/blog" },
];

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 pt-6">
      <nav
        className={`max-w-[1200px] mx-auto flex items-center justify-between h-[58px] px-5 rounded-3xl border bg-white/70 backdrop-blur-md transition-all duration-500 ease-in-out ${
          scrolled
            ? "border-slate-200 shadow-[0_8px_32px_-4px_rgba(15,23,42,0.08)] scale-[0.98] py-1"
            : "border-slate-200/50 shadow-[0_2px_10px_rgba(15,23,42,0.02)]"
        }`}
      >
        {/* ── Logo ─────────────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5B4DFF] to-[#818CF8] flex items-center justify-center shadow-lg shadow-[#5B4DFF]/20 group-hover:scale-110 transition-transform duration-300">
            <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
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
          <span className="font-bold text-[#0F172A] text-[16px] tracking-[-0.03em]">
            ModelBridge
          </span>
        </Link>

        {/* ── Center nav links ──────────────────────────────── */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[14px] font-medium text-slate-600 hover:text-indigo-600 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all duration-200"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* ── Right CTA ─────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/dashboard">
              <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-white bg-[#0F172A] hover:bg-indigo-600 px-5 py-2.5 rounded-2xl transition-all duration-300 shadow-sm cursor-pointer">
                Dashboard
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="hidden sm:block text-[14px] font-medium text-slate-600 hover:text-indigo-600 px-4 py-2 rounded-xl transition-all duration-200"
              >
                Sign in
              </Link>
              <Link href="/auth/register">
                <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-white bg-[#5B4DFF] hover:bg-[#4338CA] px-5 py-2.5 rounded-2xl transition-all duration-300 shadow-[0_4px_12px_rgba(91,77,255,0.25)] hover:shadow-[0_8px_20px_rgba(91,77,255,0.35)] cursor-pointer">
                  Get Started
                </span>
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer ──────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden max-w-[1200px] mx-auto mt-3 rounded-2xl border border-slate-200/60 bg-white/95 backdrop-blur-xl shadow-2xl shadow-indigo-500/10 p-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-[15px] font-medium text-slate-600 hover:text-indigo-600 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
            <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
              <span className="block text-center text-[15px] font-medium text-slate-600 py-3 rounded-xl hover:bg-slate-50 transition-all cursor-pointer">
                Sign in
              </span>
            </Link>
            <Link href="/auth/register" onClick={() => setMobileOpen(false)}>
              <span className="block text-center text-[15px] font-semibold text-white bg-[#5B4DFF] py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-500/20">
                Get Started Free
              </span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
