"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { ProjectSwitcher } from "@/components/layout/team-switcher";

const NAV_LINKS = [
  { label: "Models", href: "/models" },
  { label: "Docs", href: "/docs" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Blog", href: "/blog" },
];

export function DashboardHeader() {
  const headerRef = useRef<HTMLElement>(null);

  // Publishes this header's height as --navbar-h so the sidebar (which reads that var
  // to position itself below any top bar) offsets correctly — same mechanism the public
  // Navbar uses, just taken over by this header on /dashboard routes.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
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
  }, []);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md"
    >
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        {/* Logo */}
        <Link href="/" className="group flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ColabOne_Logo.png"
            alt="ColabOne Logo"
            style={{ height: "26px", width: "auto" }}
            className="rounded-md transition-transform duration-300 group-hover:scale-110"
          />
          <span className="hidden text-[16px] font-bold tracking-[-0.03em] text-foreground sm:inline">
            ColabOne
          </span>
        </Link>

        {/* Right-aligned group — project selector, then public site nav links */}
        <div className="ml-auto flex items-center gap-2">
          <ProjectSwitcher />
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-lg px-3 py-1.5 text-[13.5px] font-medium text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
