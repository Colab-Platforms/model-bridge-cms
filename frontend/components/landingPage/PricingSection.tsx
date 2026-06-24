"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Sparkles,
  ImageIcon,
  Database,
  BarChart3,
  ShieldCheck,
  Bell,
  Lock,
  Building2,
  Gift,
} from "lucide-react";

// ── Data ──────────────────────────────────────────────────────────────────────

const RESOURCE_ROWS = [
  {
    Icon: MessageSquare,
    name: "Input Tokens",
    subtitle: "Text input to the model",
    description: "Prompts, messages, and instructions",
    price: "$0.15",
    unit: "/ 1M tokens",
    includes: "All models",
  },
  {
    Icon: Sparkles,
    name: "Output Tokens",
    subtitle: "Model-generated output",
    description: "Completions, responses, and generations",
    price: "$0.60",
    unit: "/ 1M tokens",
    includes: "All models",
  },
  {
    Icon: ImageIcon,
    name: "Image Generation",
    subtitle: "High-quality images",
    description: "Image generation and variations",
    price: "$0.04",
    unit: "/ image",
    includes: "All image models",
  },
  {
    Icon: Database,
    name: "Embeddings",
    subtitle: "Text embeddings",
    description: "Vectorization and search applications",
    price: "$0.08", 
    unit: "/ 1M tokens",
    includes: "All embedding models",
  },
];

const MODELS = [
  { label: "GPT-4o (example)", inputPerM: 2.5, outputPerM: 10.0 },
  { label: "GPT-4o mini", inputPerM: 0.15, outputPerM: 0.6 },
  { label: "Claude 3.5 Sonnet", inputPerM: 3.0, outputPerM: 15.0 },
  { label: "Claude 3.5 Haiku", inputPerM: 0.8, outputPerM: 4.0 },
  { label: "Gemini 1.5 Flash", inputPerM: 0.075, outputPerM: 0.3 },
  { label: "Llama 3.1 70B", inputPerM: 0.35, outputPerM: 0.4 },
];

const FEATURES = [
  {
    Icon: BarChart3,
    title: "Real-time usage",
    description: "Track your usage and costs in real time with detailed analytics.",
  },
  {
    Icon: ShieldCheck,
    title: "Set spend limits",
    description: "Set hard limits to avoid unexpected charges and control spend.",
  },
  {
    Icon: Bell,
    title: "Budget alerts",
    description: "Get notified before you reach your budget thresholds.",
  },
  {
    Icon: Lock,
    title: "Enterprise-grade security",
    description: "SOC 2 Type II, encryption in transit and at rest, and transparent billing.",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  marks,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  marks: string[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-bold text-[#0F172A]">{label}</label>
        <span className="text-[13px] font-black text-indigo-600">{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full accent-indigo-600 cursor-pointer"
      />
      <div className="flex justify-between text-[11px] text-slate-400 font-medium">
        {marks.map((m) => <span key={m}>{m}</span>)}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PricingSection() {
  const [requests, setRequests] = useState(10_000);
  const [inputTokens, setInputTokens] = useState(500);
  const [outputTokens, setOutputTokens] = useState(1_000);
  const [modelIdx, setModelIdx] = useState(0);

  const model = MODELS[modelIdx];

  const estimatedCost = useMemo(() => {
    const inputCost = (requests * inputTokens) / 1_000_000 * model.inputPerM;
    const outputCost = (requests * outputTokens) / 1_000_000 * model.outputPerM;
    return inputCost + outputCost;
  }, [requests, inputTokens, outputTokens, model]);

  return (
    <section className="bg-white py-32">
      <div className="max-w-[860px] mx-auto px-6">

        {/* ── Header ── */}
        <div className="text-center mb-14">
          <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.22em] mb-4">
            Pricing
          </p>
          <h2 className="text-[44px] md:text-[56px] font-black text-[#0F172A] tracking-[-0.04em] leading-[0.95] mb-5">
            Pay only for what you{" "}
            <span className="text-indigo-600">use.</span>
          </h2>
          <p className="text-[17px] text-slate-500 max-w-[440px] mx-auto leading-[1.6] mb-8">
            No subscriptions. No commitments. Just transparent, usage-based pricing.
          </p>

          {/* Free credits pill */}
          <div className="inline-flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-full p-1.5 pr-5">
            <Link href="/auth/register">
              <span className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-black px-5 py-2.5 rounded-full transition-colors cursor-pointer whitespace-nowrap">
                <Gift className="w-3.5 h-3.5" />
                Start with $5 free credits
              </span>
            </Link>
            <span className="text-[13px] text-slate-500 font-medium">No credit card required</span>
          </div>
        </div>

        {/* ── Resource pricing table ── */}
        <div className="mb-10">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-[19px] font-black text-[#0F172A] tracking-tight">
                Simple, usage-based pricing
              </h3>
              <p className="text-[13px] text-slate-400 mt-1">
                Pay per request, token, or resource. Prices in USD.
              </p>
            </div>
            <Link
              href="/pricing"
              className="text-[13px] font-bold text-indigo-600 hover:underline whitespace-nowrap mt-1"
            >
              View all pricing details →
            </Link>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_2fr_1.5fr_1.5fr] bg-slate-50 px-6 py-3 border-b border-slate-200">
              {["Resource", "What it's used for", "Price", "Includes"].map((h) => (
                <span key={h} className="text-[11px] font-black text-slate-400 uppercase tracking-[0.13em]">
                  {h}
                </span>
              ))}
            </div>

            {RESOURCE_ROWS.map((row, i) => (
              <div
                key={row.name}
                className={`grid grid-cols-[2fr_2fr_1.5fr_1.5fr] items-center px-6 py-5 transition-colors hover:bg-slate-50/60 ${
                  i < RESOURCE_ROWS.length - 1 ? "border-b border-slate-100" : ""
                }`}
              >
                {/* Resource */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <row.Icon className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#0F172A]">{row.name}</p>
                    <p className="text-[12px] text-slate-400">{row.subtitle}</p>
                  </div>
                </div>

                {/* What it's used for */}
                <p className="text-[13px] text-slate-500 pr-6">{row.description}</p>

                {/* Price */}
                <p className="text-[15px] font-black text-[#0F172A]">
                  {row.price}{" "}
                  <span className="text-[11px] font-semibold text-slate-400">{row.unit}</span>
                </p>

                {/* Includes */}
                <div className="flex items-center justify-between pr-1">
                  <span className="text-[13px] text-slate-500 font-medium">{row.includes}</span>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-slate-300 flex-shrink-0">
                    <path d="M2.5 4.5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-slate-400">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 text-slate-400">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 6.5v3.5M7 4.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Prices may vary by model.{" "}
            <Link href="/models" className="text-indigo-600 font-bold hover:underline">
              View model-specific pricing →
            </Link>
          </p>
        </div>

        {/* ── Cost estimator ── */}
        <div className="border border-slate-200 rounded-2xl p-8 mb-10">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div>
              <h3 className="text-[19px] font-black text-[#0F172A] tracking-tight">
                Estimate your monthly cost
              </h3>
              <p className="text-[13px] text-slate-400 mt-1">
                Adjust the values below to estimate your monthly spend.
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.13em] mb-1">
                Estimated monthly cost
              </p>
              <p className="text-[38px] font-black text-indigo-600 tracking-tight leading-none">
                ${estimatedCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[12px] text-slate-400 font-medium mt-1">USD / month</p>
            </div>
          </div>

          <div className="grid md:grid-cols-[1fr_1fr_1fr] gap-6 mb-6">
            <SliderField
              label="Requests per month"
              value={requests}
              min={1_000}
              max={1_000_000}
              step={1_000}
              onChange={setRequests}
              marks={["1K", "100K", "1M"]}
            />
            <SliderField
              label="Avg. input tokens / request"
              value={inputTokens}
              min={100}
              max={10_000}
              step={100}
              onChange={setInputTokens}
              marks={["100", "1K", "10K"]}
            />
            <SliderField
              label="Avg. output tokens / request"
              value={outputTokens}
              min={100}
              max={10_000}
              step={100}
              onChange={setOutputTokens}
              marks={["100", "1K", "10K"]}
            />
          </div>

          {/* Model selector */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-[0.1em]">Model</label>
              <select
                value={modelIdx}
                onChange={(e) => setModelIdx(Number(e.target.value))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
              >
                {MODELS.map((m, i) => (
                  <option key={m.label} value={i}>{m.label}</option>
                ))}
              </select>
            </div>
            <Link
              href="/models"
              className="text-[12px] font-bold text-indigo-600 hover:underline self-end mb-1"
            >
              Change model →
            </Link>
          </div>

          <p className="mt-6 text-[12px] text-slate-400 font-medium">
            This is an estimate only. Actual costs may vary based on model, usage, and other factors.
          </p>
        </div>

        {/* ── Feature highlights ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          {FEATURES.map((feat) => (
            <div key={feat.title} className="flex flex-col gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <feat.Icon className="w-4 h-4 text-indigo-600" />
              </div>
              <h4 className="text-[13px] font-black text-[#0F172A]">{feat.title}</h4>
              <p className="text-[12px] text-slate-400 leading-relaxed">{feat.description}</p>
            </div>
          ))}
        </div>

        {/* ── Enterprise banner ── */}
        <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-50 border border-slate-200 rounded-2xl px-7 py-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-7 h-7 text-indigo-600" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h4 className="text-[16px] font-black text-[#0F172A] tracking-tight">
              Need enterprise solutions?
            </h4>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Get custom pricing, dedicated infrastructure, SLA guarantees, and premium support.
            </p>
          </div>
          <div className="flex sm:flex-col gap-2.5 flex-shrink-0">
            <Link href="/contact">
              <span className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-black px-6 py-2.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap">
                Talk to Sales
              </span>
            </Link>
            <Link href="/enterprise">
              <span className="flex items-center justify-center border border-slate-200 bg-white hover:border-indigo-300 text-[#0F172A] text-[13px] font-black px-6 py-2.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap">
                Learn more
              </span>
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
