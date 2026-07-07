"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Info,
  Database,
  Cable,
  Eye,
  ShieldAlert,
  Layers,
  Sparkles,
  BrainCircuit,
  Gem,
  Zap,
  Plus,
  X,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ── Static reference data ────────────────────────────────────────────────────

const ZDR_ROWS = [
  { key: "nonFrontier", label: "Non-frontier", icon: Layers,       description: "All non-frontier model requests will require ZDR endpoints." },
  { key: "openai",      label: "OpenAI",       icon: Sparkles,     description: "First-party OpenAI endpoints will be disabled for requests." },
  { key: "anthropic",   label: "Anthropic",    icon: BrainCircuit, description: "First-party Anthropic endpoints will be disabled for requests." },
  { key: "gemini",      label: "Gemini",       icon: Gem,          description: "First-party Google Gemini endpoints will be disabled for requests." },
  { key: "groq",        label: "Groq",         icon: Zap,          description: "First-party Groq endpoints will be disabled for requests." },
] as const;

type ZdrKey = (typeof ZDR_ROWS)[number]["key"];

const DATA_TOGGLES = [
  {
    key: "paidTrain",
    title: "Paid endpoints that may train on request data",
    description: "Some providers may anonymously use your data for training purposes.",
    defaultChecked: false,
  },
  {
    key: "freeTrain",
    title: "Free endpoints that may train on request data",
    description: "Providers serving free models often retain and/or train on prompts and completions.",
    defaultChecked: true,
  },
  {
    key: "freePublish",
    title: "Free endpoints that may publish prompts",
    description: "Some free model providers may publish prompts and completions to public datasets.",
    defaultChecked: false,
  },
  {
    key: "discount",
    title: "Allow 1% data discount in projects",
    description: "Allow projects to consent to Model Bridge using your inputs/outputs to improve the product. Each project consents separately.",
    defaultChecked: false,
  },
] as const;

type DataToggleKey = (typeof DATA_TOGGLES)[number]["key"];

const ALL_PROVIDERS = ["OpenAI", "Anthropic", "Gemini", "Groq"] as const;

const ELIGIBLE_MODELS = [
  { name: "GPT-4o",           provider: "OpenAI",    icon: Sparkles },
  { name: "GPT-4o mini",      provider: "OpenAI",    icon: Sparkles },
  { name: "GPT-4.1",          provider: "OpenAI",    icon: Sparkles },
  { name: "Claude Opus 4.8",  provider: "Anthropic", icon: BrainCircuit },
  { name: "Claude Sonnet 5",  provider: "Anthropic", icon: BrainCircuit },
  { name: "Claude Haiku 4.5", provider: "Anthropic", icon: BrainCircuit },
  { name: "Gemini 2.5 Pro",   provider: "Gemini",    icon: Gem },
  { name: "Gemini 2.5 Flash", provider: "Gemini",    icon: Gem },
  { name: "Llama 3.3 70B",    provider: "Groq",      icon: Zap },
];

// ── Motion ────────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 30 } },
};

// ── Layout primitives ─────────────────────────────────────────────────────────

function SettingsSection({
  icon: Icon, title, description, children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 border-b border-border/40 pb-10 last:border-b-0 last:pb-0 md:grid-cols-[220px_1fr] md:gap-10">
      <div className="flex items-start gap-2">
        <Icon className="size-4 mt-0.5 text-muted-foreground shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="space-y-6 min-w-0">{children}</div>
    </div>
  );
}

function ToggleRow({
  icon: Icon, title, description, checked, onCheckedChange,
}: {
  icon?: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-2.5 min-w-0">
        {Icon && <Icon className="size-4 mt-0.5 text-muted-foreground shrink-0" />}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="shrink-0 mt-0.5" />
    </div>
  );
}

// ── Data Policies section ─────────────────────────────────────────────────────

function DataPoliciesSection() {
  const [zdr, setZdr] = useState<Record<ZdrKey, boolean>>({
    nonFrontier: false, openai: false, anthropic: false, gemini: false, groq: false,
  });
  const [toggles, setToggles] = useState<Record<DataToggleKey, boolean>>(
    Object.fromEntries(DATA_TOGGLES.map((t) => [t.key, t.defaultChecked])) as Record<DataToggleKey, boolean>
  );

  return (
    <SettingsSection
      icon={Database}
      title="Data Policies"
      description="Set data privacy and usage restrictions."
    >
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-foreground">Zero Data Retention</p>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              Requests are rejected instead of routed to endpoints that would retain your data.
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          Only route to provider endpoints that don&apos;t store your data. Reject requests that would require
          data retention. Only applies to provider routing, does not apply to plugins and tools you choose to enable.
        </p>

        <Card className="rounded-2xl border-border/40 bg-card/60 backdrop-blur-md shadow-sm p-0 mt-4">
          <CardContent className="p-0 divide-y divide-border/40">
            {ZDR_ROWS.map((row) => (
              <div key={row.key} className="px-4 py-3.5">
                <ToggleRow
                  icon={row.icon}
                  title={row.label}
                  description={row.description}
                  checked={zdr[row.key]}
                  onCheckedChange={(v) => setZdr((s) => ({ ...s, [row.key]: v }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="divide-y divide-border/40">
        {DATA_TOGGLES.map((t) => (
          <div key={t.key} className="py-4 first:pt-0 last:pb-0">
            <ToggleRow
              title={t.title}
              description={t.description}
              checked={toggles[t.key]}
              onCheckedChange={(v) => setToggles((s) => ({ ...s, [t.key]: v }))}
            />
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}

// ── Providers section ─────────────────────────────────────────────────────────

function ProviderListRow({
  title, description, selected, onAdd, onRemove,
}: {
  title: string;
  description: string;
  selected: string[];
  onAdd: (provider: string) => void;
  onRemove: (provider: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const available = ALL_PROVIDERS.filter((p) => !selected.includes(p));

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
        {available.length > 0 && (
          <Select
            open={picking}
            onOpenChange={setPicking}
            onValueChange={(v) => { onAdd(v); setPicking(false); }}
          >
            <SelectTrigger className="rounded-lg h-8 text-xs font-bold uppercase tracking-wider w-auto gap-1.5 shrink-0" size="sm">
              <Plus className="size-3.5" />
              <SelectValue placeholder="Add" />
            </SelectTrigger>
            <SelectContent>
              {available.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {selected.map((p) => (
            <Badge key={p} variant="outline" className="rounded-lg pr-1 gap-1">
              {p}
              <button
                type="button"
                onClick={() => onRemove(p)}
                className="rounded-full hover:bg-muted p-0.5 transition-colors"
                aria-label={`Remove ${p}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function ProvidersSection() {
  const [allowed, setAllowed] = useState<string[]>([]);
  const [ignored, setIgnored] = useState<string[]>([]);

  return (
    <SettingsSection
      icon={Cable}
      title="Providers"
      description="Control which providers are used for routing. Leave empty to allow all."
    >
      <ProviderListRow
        title="Allowed Providers"
        description="Exclusively enable these providers for your requests."
        selected={allowed}
        onAdd={(p) => setAllowed((s) => [...s, p])}
        onRemove={(p) => setAllowed((s) => s.filter((x) => x !== p))}
      />
      <ProviderListRow
        title="Ignored Providers"
        description="Exclude these providers from serving any requests."
        selected={ignored}
        onAdd={(p) => setIgnored((s) => [...s, p])}
        onRemove={(p) => setIgnored((s) => s.filter((x) => x !== p))}
      />
    </SettingsSection>
  );
}

// ── Eligibility Preview section ───────────────────────────────────────────────

function EligibilityPreviewSection() {
  return (
    <SettingsSection
      icon={Eye}
      title="Eligibility Preview"
      description="Providers and models available based on your account settings."
    >
      <div>
        <p className="text-xs font-semibold text-muted-foreground">
          <span className="text-foreground">{ELIGIBLE_MODELS.length} available</span>
          {" "}&middot;{" "}0 unavailable
        </p>
        <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-border/40 divide-y divide-border/40">
          {ELIGIBLE_MODELS.map((m) => (
            <div key={m.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <m.icon className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{m.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{m.provider}</span>
              </div>
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </SettingsSection>
  );
}

// ── Prompt Injection Allowlist section ────────────────────────────────────────

function PromptInjectionAllowlistSection() {
  const [patterns, setPatterns] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  const addPattern = () => {
    const value = draft.trim();
    if (!value || patterns.includes(value)) return;
    setPatterns((s) => [...s, value]);
    setDraft("");
  };

  return (
    <SettingsSection
      icon={ShieldAlert}
      title="Prompt Injection Allowlist"
      description="Phrases that should never trigger the prompt injection guardrail. Matching is case-insensitive and exact."
    >
      <div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Add phrases your users legitimately send that should not trigger the prompt injection guardrail.
          Matching is case-insensitive and exact.
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-border/40 bg-muted/30 px-4 py-3">
          <Info className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Allowlisted phrases only take effect when the{" "}
            <span className="text-primary font-medium inline-flex items-center gap-0.5">
              prompt injection guardrail <ExternalLink className="size-3" />
            </span>{" "}
            is enabled for the request. Without it enabled, these patterns have no effect.
          </p>
        </div>

        {patterns.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {patterns.map((p) => (
              <Badge key={p} variant="outline" className="rounded-lg pr-1 gap-1">
                {p}
                <button
                  type="button"
                  onClick={() => setPatterns((s) => s.filter((x) => x !== p))}
                  className="rounded-full hover:bg-muted p-0.5 transition-colors"
                  aria-label={`Remove ${p}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPattern(); } }}
            placeholder="e.g. ignore previous instructions"
            className="rounded-lg"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addPattern}
            className={cn("rounded-lg font-bold uppercase text-xs tracking-wider h-9 px-4 shrink-0")}
          >
            <Plus className="size-3.5" />
            Add pattern
          </Button>
        </div>
      </div>
    </SettingsSection>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PrivacyPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-5xl mx-auto space-y-6"
    >
      <motion.div variants={itemVariants}>
        <h2 className="text-3xl font-bold tracking-tight text-foreground/90">Privacy</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Restrictions to apply globally across your account. You can further restrict API keys with
          guardrails inside a project.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-10">
        <DataPoliciesSection />
        <ProvidersSection />
        <EligibilityPreviewSection />
        <PromptInjectionAllowlistSection />
      </motion.div>
    </motion.div>
  );
}
