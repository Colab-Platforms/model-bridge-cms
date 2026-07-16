"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, MapPin, Clock, Send, CheckCircle2, LifeBuoy, ArrowRight } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/landingPage/Footer";

const contactSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  email: z.email({ error: "Enter a valid email address" }),
  subject: z.string().min(3, "Subject must be at least 3 characters").max(120),
  message: z.string().min(20, "Please share a few more details").max(4000),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const CONTACT_CARDS = [
  {
    icon: Mail,
    iconBg: "#EEF2FF",
    iconColor: "#5B4DFF",
    title: "Email us",
    body: "For general enquiries and partnerships.",
    link: { label: "hello@colabone.ai", href: "mailto:hello@colabone.ai" },
  },
  {
    icon: LifeBuoy,
    iconBg: "#ECFDF5",
    iconColor: "#16A34A",
    title: "Need product help?",
    body: "Billing, API, or account issues go through Support instead.",
    link: { label: "Raise a support ticket", href: "/support/ticket" },
  },
  {
    icon: MapPin,
    iconBg: "#FFF7ED",
    iconColor: "#EA580C",
    title: "Registered office",
    body: "Colab Intelligence Ltd\nB202, Takshashila, Samant Estate,\nGoregaon East, Mumbai – 400063",
    link: null,
  },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({ resolver: zodResolver(contactSchema) });

  const onSubmit = async (values: ContactFormValues) => {
    void values;
    // No contact-message backend endpoint exists yet — this simulates
    // submission so the flow can be reviewed before the API lands.
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSubmitted(true);
    toast.success("Message sent — we'll be in touch.");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <div className="pt-[86px]">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section
          className="relative pt-20 pb-14 px-6 overflow-hidden"
          style={{
            background: `radial-gradient(circle at 50% -10%, rgba(91,77,255,0.08) 0%, transparent 55%), #F8FAFC`,
          }}
        >
          <div className="relative max-w-[680px] mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm mb-8">
              <Mail className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[13px] font-medium text-slate-500">Contact</span>
            </div>
            <h1 className="text-[40px] md:text-[52px] font-black text-[#0F172A] leading-[1.02] tracking-[-0.04em]">
              Let&apos;s talk.
            </h1>
            <p className="mt-5 text-[16px] md:text-[17px] text-slate-500 leading-[1.6] max-w-[520px] mx-auto">
              Questions about the platform, partnerships, or press — send us a note and a real person will get back to you.
            </p>
          </div>
        </section>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <section className="px-6 pb-28">
          <div className="max-w-[980px] mx-auto grid md:grid-cols-[1fr_1.35fr] gap-6 items-start">
            {/* Info cards */}
            <div className="flex flex-col gap-5">
              {CONTACT_CARDS.map((c) => (
                <div
                  key={c.title}
                  className="bg-white border border-slate-200 rounded-[24px] p-6"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: c.iconBg }}
                  >
                    <c.icon className="w-5 h-5" style={{ color: c.iconColor }} />
                  </div>
                  <h3 className="text-[14.5px] font-bold text-[#0F172A] mb-1.5">{c.title}</h3>
                  <p className="text-[13px] text-slate-500 leading-[1.65] whitespace-pre-line mb-3">
                    {c.body}
                  </p>
                  {c.link && (
                    <Link
                      href={c.link.href}
                      className="inline-flex items-center gap-1.5 text-[13px] font-bold"
                      style={{ color: c.iconColor }}
                    >
                      {c.link.label}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              ))}

              <div className="flex items-center gap-2.5 px-1 text-[12.5px] text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                We typically reply within 1–2 business days.
              </div>
            </div>

            {/* Form */}
            <div className="bg-white border border-slate-200 rounded-[28px] p-8 md:p-10">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h2 className="text-[22px] font-black text-[#0F172A] tracking-tight mb-2">
                    Message sent
                  </h2>
                  <p className="text-[14px] text-slate-500 max-w-[360px] mx-auto">
                    Thanks for reaching out. We&apos;ve received your message and will follow up by email shortly.
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-[20px] font-black text-[#0F172A] tracking-tight mb-6">
                    Send us a message
                  </h2>
                  <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="name" className="block text-[13px] font-bold text-[#0F172A] mb-2">
                          Name<span className="text-indigo-600">*</span>
                        </label>
                        <input
                          id="name"
                          type="text"
                          placeholder="Jane Doe"
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-[14px] text-[#0F172A] placeholder:text-slate-400 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                          {...register("name")}
                        />
                        {errors.name && (
                          <p className="mt-1.5 text-[12.5px] text-rose-600">{errors.name.message}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-[13px] font-bold text-[#0F172A] mb-2">
                          Email<span className="text-indigo-600">*</span>
                        </label>
                        <input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-[14px] text-[#0F172A] placeholder:text-slate-400 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                          {...register("email")}
                        />
                        {errors.email && (
                          <p className="mt-1.5 text-[12.5px] text-rose-600">{errors.email.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-[13px] font-bold text-[#0F172A] mb-2">
                        Subject<span className="text-indigo-600">*</span>
                      </label>
                      <input
                        id="subject"
                        type="text"
                        placeholder="What's this about?"
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-[14px] text-[#0F172A] placeholder:text-slate-400 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        {...register("subject")}
                      />
                      {errors.subject && (
                        <p className="mt-1.5 text-[12.5px] text-rose-600">{errors.subject.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-[13px] font-bold text-[#0F172A] mb-2">
                        Message<span className="text-indigo-600">*</span>
                      </label>
                      <textarea
                        id="message"
                        rows={5}
                        placeholder="Tell us a bit more…"
                        className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-[14px] text-[#0F172A] placeholder:text-slate-400 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                        {...register("message")}
                      />
                      {errors.message && (
                        <p className="mt-1.5 text-[12.5px] text-rose-600">{errors.message.message}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 text-[14.5px] font-bold text-white bg-[#5B4DFF] hover:bg-[#4338CA] disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3.5 rounded-2xl transition-all duration-300 shadow-[0_10px_20px_-5px_rgba(91,77,255,0.35)] cursor-pointer self-start"
                    >
                      {isSubmitting ? (
                        "Sending…"
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send message
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
