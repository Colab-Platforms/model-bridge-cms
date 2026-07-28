"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ArrowRight, Menu, X, Sun, Moon } from "lucide-react";

const NAV_LINKS = [
  { label: "Models", href: "/models" },
  { label: "Docs", href: "/docs" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Blog", href: "/blog" },
];

// Routes that render their own full-screen layout and never had a Navbar —
// keep them opted out rather than forcing a global header into their design.
const NAVBAR_EXCLUDED_PREFIXES = ["/admin", "/auth", "/dashboard"];

export default function Navbar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const hidden = NAVBAR_EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

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

  // Publishes the Navbar's rendered height as a CSS var so fixed-position
  // descendants elsewhere in the tree (e.g. the dashboard sidebar) can offset
  // below it instead of being covered by it.
  useEffect(() => {
    const el = headerRef.current;
    if (hidden || !el) {
      document.documentElement.style.setProperty("--navbar-h", "0px");
      return;
    }
    const update = () => {
      document.documentElement.style.setProperty("--navbar-h", `${el.offsetHeight}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty("--navbar-h", "0px");
    };
    // Only re-run this setup/teardown when visibility itself changes — the
    // ResizeObserver above already tracks height changes caused by `scrolled`/
    // `mobileOpen` while visible. Including them here made this effect re-fire on
    // every scroll event (even while hidden on /dashboard), repeatedly resetting
    // --navbar-h to "0px" and clobbering the height another header (e.g. the
    // dashboard's own sticky header) had published, which snapped the fixed
    // sidebar's top offset back to 0 mid-scroll.
  }, [hidden]);

  if (hidden) return null;

  return (
    <header ref={headerRef} className="relative z-50 w-full px-6 pt-4 bg-background">
      <nav
        className={`max-w-[1200px] mx-auto flex items-center justify-between h-[58px] px-5 rounded-3xl border bg-white dark:bg-slate-900 backdrop-blur-md transition-all duration-500 ease-in-out ${scrolled
          ? "border-slate-200 dark:border-slate-800 shadow-[0_8px_32px_-4px_rgba(15,23,42,0.08)] scale-[0.98] py-1"
          : "border-slate-200/50 dark:border-slate-800/50 shadow-[0_2px_10px_rgba(15,23,42,0.02)]"
          }`}
      >
        {/* ── Logo ─────────────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ColabOne_Logo.png"
            alt="ColabOne Logo"
            style={{ height: "30px", width: "auto" }}
            className="group-hover:scale-110 transition-transform duration-300 rounded-md"
          />
          <span className="font-bold text-[#0F172A] dark:text-white text-[20px] tracking-[-0.03em]">
            ColabOne
          </span>
        </Link>

        {/* ── Center nav links ──────────────────────────────── */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[14px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-4 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all duration-200"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* ── Right CTA ─────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
          >
            {mounted && resolvedTheme === "dark" ? (
              <Sun className="w-[18px] h-[18px]" />
            ) : (
              <Moon className="w-[18px] h-[18px]" />
            )}
          </button>

          {user ? (
            <Link href="/dashboard">
              <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-white bg-[#0F172A] dark:bg-indigo-600 hover:bg-indigo-600 px-5 py-2.5 rounded-2xl transition-all duration-300 shadow-sm cursor-pointer">
                Dashboard
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="hidden sm:block text-[14px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-4 py-2 rounded-xl transition-all duration-200"
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
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer ──────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden max-w-[1200px] mx-auto mt-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-indigo-500/10 p-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-[15px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
            <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
              <span className="block text-center text-[15px] font-medium text-slate-600 dark:text-slate-300 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer">
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
