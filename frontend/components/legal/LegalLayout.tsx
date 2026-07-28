import { ReactNode } from "react";
import { Scale } from "lucide-react";
import Footer from "@/components/landingPage/Footer";

interface LegalSection {
  heading: string;
  body: ReactNode;
}

interface LegalLayoutProps {
  eyebrow: string;
  title: string;
  intro: string;
  effectiveDate: string;
  sections: LegalSection[];
}

export default function LegalLayout({ eyebrow, title, intro, effectiveDate, sections }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19]">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section
          className="relative pt-20 pb-14 px-6 overflow-hidden bg-[#F8FAFC] dark:bg-[#0B0F19]"
          style={{
            backgroundImage: `radial-gradient(circle at 50% -10%, rgba(91,77,255,0.08) 0%, transparent 55%)`,
          }}
        >
          <div className="relative max-w-[720px] mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-4 py-1.5 shadow-sm mb-8">
              <Scale className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{eyebrow}</span>
            </div>
            <h1 className="text-[36px] md:text-[48px] font-black text-[#0F172A] dark:text-white leading-[1.05] tracking-[-0.04em]">
              {title}
            </h1>
            <p className="mt-5 text-[15px] md:text-[16px] text-slate-500 dark:text-slate-400 leading-[1.6] max-w-[560px] mx-auto">
              {intro}
            </p>
            <p className="mt-4 text-[13px] font-semibold text-slate-400 dark:text-slate-500">
              Effective date: {effectiveDate}
            </p>
          </div>
        </section>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <section className="px-6 pb-28">
          <div className="max-w-[820px] mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] p-8 md:p-14">
            <div className="flex flex-col gap-10">
              {sections.map((s, i) => (
                <div key={s.heading}>
                  <h2 className="text-[18px] md:text-[19px] font-black text-[#0F172A] dark:text-white tracking-[-0.02em] mb-3">
                    {i + 1}. {s.heading}
                  </h2>
                  <div className="text-[14.5px] text-slate-600 dark:text-slate-300 leading-[1.8] flex flex-col gap-3">
                    {s.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      <Footer />
    </div>
  );
}
