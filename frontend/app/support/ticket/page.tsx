"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ChevronRight,
  Paperclip,
  X,
  Send,
  CheckCircle2,
  Clock,
  ArrowLeft,
} from "lucide-react";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/landingPage/Footer";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const CATEGORIES = [
  { value: "BILLING", label: "Billing & credits" },
  { value: "TECHNICAL", label: "Technical / API issue" },
  { value: "ACCOUNT", label: "Account & security" },
  { value: "OTHER", label: "Something else" },
];

const ticketSchema = z.object({
  category: z.string().min(1, "Choose a category"),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(120),
  description: z
    .string()
    .min(20, "Please give us a bit more detail (at least 20 characters)")
    .max(4000),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

export default function SupportTicketPage() {
  const [attachment, setAttachment] = useState<File | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !user) {
      router.replace("/auth/login?redirect=/support/ticket");
    }
  }, [hasHydrated, user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormValues>({ resolver: zodResolver(ticketSchema) });

  const onSubmit = async (values: TicketFormValues) => {
    const formData = new FormData();
    formData.append("category", values.category);
    formData.append("subject", values.subject);
    formData.append("description", values.description);
    if (attachment) {
      formData.append("attachment", attachment);
    }

    try {
      const result = await api.post("/support/tickets", formData);
      setReference(result.data.referenceNumber);
      toast.success("Your request has been submitted.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Failed to submit your request. Please try again.");
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > 10 * 1024 * 1024) {
      toast.error("Attachment must be 10MB or smaller.");
      e.target.value = "";
      return;
    }
    setAttachment(file);
  };

  if (!hasHydrated || !user) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <div className="pt-[86px] px-6 py-16">
        <div className="max-w-[640px] mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[13px] text-slate-400 font-medium mb-8">
            <Link href="/support" className="hover:text-indigo-600 transition-colors">
              Support
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600">Submit a request</span>
          </div>

          {reference ? (
            /* ── Success state ─────────────────────────────────────────────── */
            <div className="bg-white border border-slate-200 rounded-[28px] p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h1 className="text-[24px] font-black text-[#0F172A] tracking-tight mb-2">
                Request submitted
              </h1>
              <p className="text-[14.5px] text-slate-500 leading-relaxed max-w-[400px] mx-auto mb-6">
                We&apos;ve got it. A member of our support team will respond by email, usually within one business day.
              </p>
              <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 mb-8">
                <span className="text-[12px] font-medium text-slate-400">Reference</span>
                <span className="text-[13px] font-mono font-bold text-[#0F172A]">{reference}</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Link href="/support">
                  <span className="inline-flex items-center gap-2 text-[13.5px] font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-5 py-3 rounded-xl transition-all cursor-pointer">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Support
                  </span>
                </Link>
              </div>
            </div>
          ) : (
            /* ── Form ───────────────────────────────────────────────────────── */
            <div className="bg-white border border-slate-200 rounded-[28px] p-8 md:p-10">
              <h1 className="text-[26px] font-black text-[#0F172A] tracking-tight mb-2">
                Submit a request
              </h1>
              <p className="text-[13.5px] text-slate-500 mb-8">
                Fields marked with an asterisk (*) are required.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
                <div>
                  <label htmlFor="category" className="block text-[13px] font-bold text-[#0F172A] mb-2">
                    Category<span className="text-indigo-600">*</span>
                  </label>
                  <select
                    id="category"
                    defaultValue=""
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-[14px] text-[#0F172A] outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none"
                    {...register("category")}
                  >
                    <option value="" disabled>
                      Select a category
                    </option>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1.5 text-[12.5px] text-rose-600">{errors.category.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="subject" className="block text-[13px] font-bold text-[#0F172A] mb-2">
                    Subject<span className="text-indigo-600">*</span>
                  </label>
                  <input
                    id="subject"
                    type="text"
                    placeholder="A short summary of your issue"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-[14px] text-[#0F172A] placeholder:text-slate-400 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    {...register("subject")}
                  />
                  {errors.subject && (
                    <p className="mt-1.5 text-[12.5px] text-rose-600">{errors.subject.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-[13px] font-bold text-[#0F172A] mb-2">
                    Description<span className="text-indigo-600">*</span>
                  </label>
                  <p className="text-[12.5px] text-slate-400 mb-2">
                    Please include as much detail as possible — request IDs, API key prefix, or error messages help us respond faster.
                  </p>
                  <textarea
                    id="description"
                    rows={6}
                    placeholder="Describe what happened…"
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-[14px] text-[#0F172A] placeholder:text-slate-400 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="mt-1.5 text-[12.5px] text-rose-600">{errors.description.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-[#0F172A] mb-2">Attachment</label>
                  {attachment ? (
                    <div className="flex items-center justify-between gap-3 border border-slate-200 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-[13.5px] text-[#0F172A] font-medium truncate">
                          {attachment.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachment(null)}
                        aria-label="Remove attachment"
                        className="text-slate-400 hover:text-rose-600 transition-colors flex-shrink-0 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="attachment"
                      className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 rounded-xl py-7 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
                    >
                      <Paperclip className="w-4.5 h-4.5 text-slate-400" />
                      <span className="text-[13px] font-semibold text-indigo-600">
                        Choose a file or drag and drop here
                      </span>
                      <span className="text-[11.5px] text-slate-400">Optional — up to 10MB</span>
                      <input
                        id="attachment"
                        type="file"
                        className="hidden"
                        onChange={onFileChange}
                      />
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 text-[14.5px] font-bold text-white bg-[#5B4DFF] hover:bg-[#4338CA] disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3.5 rounded-2xl transition-all duration-300 shadow-[0_10px_20px_-5px_rgba(91,77,255,0.35)] cursor-pointer"
                >
                  {isSubmitting ? (
                    "Submitting…"
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit request
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {!reference && (
            <div className="mt-6 flex items-center gap-2.5 justify-center text-[12.5px] text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              Average first response time: under 1 business day
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
