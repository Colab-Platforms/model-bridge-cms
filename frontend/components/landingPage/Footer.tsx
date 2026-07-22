import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const LINKS = {
  Product: [
    { label: "Models",      href: "/models"   },
    { label: "Pricing",     href: "/pricing"  },
    { label: "Changelog",   href: "/changelog"},
    { label: "Status",      href: "/status"   },
    { label: "Roadmap",     href: "/roadmap"  },
  ],
  Resources: [
    { label: "Documentation", href: "/docs"      },
    { label: "Support",       href: "/support"   },
    { label: "API Reference",  href: "/docs/api"  },
    { label: "SDKs",           href: "/docs/sdks" },
    { label: "Examples",       href: "/examples"  },
    { label: "Blog",           href: "/blog"      },
  ],
  Company: [
    { label: "About",    href: "/about"   },
    { label: "Careers",  href: "/careers" },
    { label: "Contact",  href: "/contact" },
    { label: "Partners", href: "/partners"},
  ],
  Legal: [
    { label: "Privacy Policy",   href: "/privacy" },
    { label: "Terms of Service", href: "/terms"   },
    { label: "Refund Policy",    href: "/refunds" },
    { label: "Cookie Policy",    href: "/cookies" },
    { label: "SLA",              href: "/sla"     },
  ],
};

const SOCIALS = [
  { label: "GitHub",   href: "https://github.com",   Icon: GithubIcon   },
  { label: "Twitter",  href: "https://twitter.com",  Icon: TwitterIcon  },
  { label: "LinkedIn", href: "https://linkedin.com", Icon: LinkedinIcon },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 mt-20">

      {/* ── CTA banner ─────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-100">
        <div className="max-w-[1240px] mx-auto px-6 py-20 flex flex-col md:flex-row items-center justify-between gap-10">
          <div>
            <h3 className="text-3xl font-black text-[#0F172A] tracking-tighter mb-2">
              Ready to simplify your AI stack?
            </h3>
            <p className="text-lg text-slate-500 font-medium">
              Join 12,000+ developers already building on ColabOne.
            </p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0 w-full md:w-auto">
            <Link href="/auth/register" className="flex-1 md:flex-none">
              <span className="flex items-center justify-center gap-2 text-base font-black text-white bg-indigo-600 hover:bg-indigo-500 px-8 py-4 rounded-2xl transition-all duration-300 shadow-xl shadow-indigo-600/20 cursor-pointer">
                Get Started Free
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main footer ────────────────────────────────────────────────────── */}
      <div className="max-w-[1240px] mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-[1.8fr_1fr_1fr_1fr_1fr] gap-x-12 gap-y-12">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-6 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/ColabOne_Logo.png"
                alt="ColabOne Logo"
                style={{ height: "48px", width: "auto" }}
                className="group-hover:scale-110 transition-transform duration-300 drop-shadow-md"
              />
              <span className="font-black text-[#0F172A] text-xl tracking-tighter uppercase opacity-80">
                ColabOne
              </span>
            </Link>

            <p className="text-sm text-slate-500 leading-relaxed max-w-[240px] mb-6 font-medium">
              The intelligent AI infrastructure platform. One unified API for the world's best models.
            </p>

            <div className="flex items-center gap-3">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all duration-300"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {(Object.entries(LINKS) as [string, { label: string; href: string }[]][]).map(
            ([section, links]) => (
              <div key={section}>
                <div className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-6">
                  {section}
                </div>
                <ul className="flex flex-col gap-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[14px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400 font-bold tracking-tight">
            © {new Date().getFullYear()} ColabOne. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
             <Link href="/status" className="flex items-center gap-2 text-sm text-slate-400 font-bold hover:text-indigo-600">
               <div className="w-2 h-2 rounded-full bg-emerald-500" />
               System Status
             </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
