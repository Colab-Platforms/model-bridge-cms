"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BrainCircuit,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Search,
  PowerOff,
  Power,
  ShieldAlert,
  Cpu,
  Database,
  DollarSign,
  Layers,
} from "lucide-react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminModel {
  id: string;
  providerId: string;
  slug: string;
  displayName: string | null;
  description: string | null;
  contextLength: number | null;
  maxOutputTokens: number | null;
  tokenizer: string | null;
  inputPricePerToken: string | null;
  outputPricePerToken: string | null;
  cacheWritePricePerToken: string | null;
  cacheReadPricePerToken: string | null;
  inputModalities: string[];
  outputModalities: string[];
  supportedParameters: string[];
  defaultForCapabilities: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  provider: {
    id: string;
    slug: string | null;
    displayName: string | null;
    providerLogo: string | null;
    isActive: boolean;
  };
}

interface AdminProvider {
  id: string;
  slug: string | null;
  displayName: string | null;
  providerLogo: string | null;
  isActive: boolean;
}

interface ModelForm {
  providerId: string;
  slug: string;
  displayName: string;
  description: string;
  contextLength: string;
  maxOutputTokens: string;
  tokenizer: string;
  inputPricePerToken: string;
  outputPricePerToken: string;
  cacheWritePricePerToken: string;
  cacheReadPricePerToken: string;
  inputModalities: string;
  outputModalities: string;
  supportedParameters: string;
  defaultForCapabilities: string;
  isActive: boolean;
}

const EMPTY_FORM: ModelForm = {
  providerId: "",
  slug: "",
  displayName: "",
  description: "",
  contextLength: "",
  maxOutputTokens: "",
  tokenizer: "",
  inputPricePerToken: "",
  outputPricePerToken: "",
  cacheWritePricePerToken: "",
  cacheReadPricePerToken: "",
  inputModalities: "",
  outputModalities: "",
  supportedParameters: "",
  defaultForCapabilities: "",
  isActive: true,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtPrice(v: string | null) {
  if (!v) return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  if (n === 0) return "$0";
  return `$${n.toFixed(8)}`;
}

function fmtCtx(n: number | null) {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function getModelName(m: Pick<AdminModel, "displayName" | "slug">) {
  return m.displayName ?? m.slug;
}

function modelToForm(m: AdminModel): ModelForm {
  return {
    providerId: m.providerId,
    slug: m.slug,
    displayName: m.displayName ?? "",
    description: m.description ?? "",
    contextLength: m.contextLength != null ? String(m.contextLength) : "",
    maxOutputTokens: m.maxOutputTokens != null ? String(m.maxOutputTokens) : "",
    tokenizer: m.tokenizer ?? "",
    inputPricePerToken: m.inputPricePerToken ?? "",
    outputPricePerToken: m.outputPricePerToken ?? "",
    cacheWritePricePerToken: m.cacheWritePricePerToken ?? "",
    cacheReadPricePerToken: m.cacheReadPricePerToken ?? "",
    inputModalities: m.inputModalities.join(", "),
    outputModalities: m.outputModalities.join(", "),
    supportedParameters: m.supportedParameters.join(", "),
    defaultForCapabilities: m.defaultForCapabilities.join(", "),
    isActive: m.isActive,
  };
}

function splitArr(s: string): string[] {
  return s.split(",").map((v) => v.trim()).filter(Boolean);
}

function buildCreatePayload(form: ModelForm) {
  const payload: Record<string, unknown> = {
    providerId: form.providerId,
    slug: form.slug.trim(),
    isActive: form.isActive,
  };
  if (form.displayName.trim())         payload.displayName         = form.displayName.trim();
  if (form.description.trim())         payload.description         = form.description.trim();
  if (form.contextLength.trim())       payload.contextLength       = parseInt(form.contextLength, 10);
  if (form.maxOutputTokens.trim())     payload.maxOutputTokens     = parseInt(form.maxOutputTokens, 10);
  if (form.tokenizer.trim())           payload.tokenizer           = form.tokenizer.trim();
  if (form.inputPricePerToken.trim())  payload.inputPricePerToken  = form.inputPricePerToken.trim();
  if (form.outputPricePerToken.trim()) payload.outputPricePerToken = form.outputPricePerToken.trim();
  if (form.cacheWritePricePerToken.trim()) payload.cacheWritePricePerToken = form.cacheWritePricePerToken.trim();
  if (form.cacheReadPricePerToken.trim())  payload.cacheReadPricePerToken  = form.cacheReadPricePerToken.trim();
  const inMod = splitArr(form.inputModalities);
  const outMod = splitArr(form.outputModalities);
  const supParam = splitArr(form.supportedParameters);
  const defCap = splitArr(form.defaultForCapabilities);
  if (inMod.length)   payload.inputModalities        = inMod;
  if (outMod.length)  payload.outputModalities       = outMod;
  if (supParam.length) payload.supportedParameters   = supParam;
  if (defCap.length)  payload.defaultForCapabilities = defCap;
  return payload;
}

function buildUpdatePayload(form: ModelForm, original: AdminModel) {
  const payload: Record<string, unknown> = {};
  if (form.providerId !== original.providerId) payload.providerId = form.providerId;
  if (form.slug.trim() !== original.slug)      payload.slug       = form.slug.trim();
  if (form.isActive !== original.isActive)     payload.isActive   = form.isActive;

  const strField = (key: keyof ModelForm, orig: string | null) => {
    const v = (form[key] as string).trim();
    if (v !== (orig ?? "")) payload[key] = v || null;
  };
  strField("displayName",         original.displayName);
  strField("description",         original.description);
  strField("tokenizer",           original.tokenizer);
  strField("inputPricePerToken",  original.inputPricePerToken);
  strField("outputPricePerToken", original.outputPricePerToken);
  strField("cacheWritePricePerToken", original.cacheWritePricePerToken);
  strField("cacheReadPricePerToken",  original.cacheReadPricePerToken);

  const ctxVal = form.contextLength.trim() ? parseInt(form.contextLength, 10) : null;
  if (ctxVal !== original.contextLength) payload.contextLength = ctxVal;
  const maxVal = form.maxOutputTokens.trim() ? parseInt(form.maxOutputTokens, 10) : null;
  if (maxVal !== original.maxOutputTokens) payload.maxOutputTokens = maxVal;

  const inMod   = splitArr(form.inputModalities);
  const outMod  = splitArr(form.outputModalities);
  const supParam = splitArr(form.supportedParameters);
  const defCap  = splitArr(form.defaultForCapabilities);
  if (JSON.stringify(inMod)    !== JSON.stringify(original.inputModalities))        payload.inputModalities        = inMod;
  if (JSON.stringify(outMod)   !== JSON.stringify(original.outputModalities))       payload.outputModalities       = outMod;
  if (JSON.stringify(supParam) !== JSON.stringify(original.supportedParameters))    payload.supportedParameters    = supParam;
  if (JSON.stringify(defCap)   !== JSON.stringify(original.defaultForCapabilities)) payload.defaultForCapabilities = defCap;

  return payload;
}

// ─── Shared UI atoms ─────────────────────────────────────────────────────────

const PROVIDER_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
];

function providerColor(slug: string | null) {
  const n = (slug ?? "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return PROVIDER_COLORS[n % PROVIDER_COLORS.length];
}

function ProviderBadge({ provider }: { provider: AdminModel["provider"] }) {
  const name = provider.displayName ?? provider.slug ?? "Unknown";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", providerColor(provider.slug))}>
      {name}
    </span>
  );
}

const STATUS_STYLES = {
  active:   { pill: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800", dot: "bg-emerald-500 animate-pulse", label: "Active" },
  inactive: { pill: "bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700",                 dot: "bg-zinc-400",                label: "Inactive" },
};

function StatusPill({ isActive }: { isActive: boolean }) {
  const s = STATUS_STYLES[isActive ? "active" : "inactive"];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", s.pill)}>
      <span className={cn("size-1.5 rounded-full shrink-0", s.dot)} />
      {s.label}
    </span>
  );
}

function StatCard({
  title, value, icon: Icon, iconBg, loading,
}: {
  title: string; value: number | string; icon: React.ElementType; iconBg: string; loading?: boolean;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
            {loading
              ? <Skeleton className="h-8 w-14 mt-1" />
              : <p className="text-2xl font-bold tracking-tight">{value}</p>
            }
          </div>
          <div className={cn("size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", iconBg)}>
            <Icon className="size-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, totalRecords, pageSize, onPageChange }: {
  page: number; totalPages: number; totalRecords: number; pageSize: number; onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, totalRecords);
  let pages: number[];
  if (totalPages <= 7) pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  else if (page <= 4)  pages = [1, 2, 3, 4, 5];
  else if (page >= totalPages - 3) pages = Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
  else pages = [page - 2, page - 1, page, page + 1, page + 2];

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
      <p className="text-xs text-muted-foreground order-2 sm:order-1">
        Showing <span className="font-medium text-foreground">{from}–{to}</span> of{" "}
        <span className="font-medium text-foreground">{totalRecords}</span> models
      </p>
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</Button>
        {pages[0] > 1 && <>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => onPageChange(1)}>1</Button>
          {pages[0] > 2 && <span className="text-muted-foreground text-xs px-0.5">…</span>}
        </>}
        {pages.map((p) => (
          <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => onPageChange(p)}>{p}</Button>
        ))}
        {pages[pages.length - 1] < totalPages && <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="text-muted-foreground text-xs px-0.5">…</span>}
          <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => onPageChange(totalPages)}>{totalPages}</Button>
        </>}
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

// ─── Model Sheet (Create / Edit) ──────────────────────────────────────────────

function ModelSheet({
  open, mode, model, providers, onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  model: AdminModel | null;
  providers: AdminProvider[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ModelForm>(EMPTY_FORM);

  React.useEffect(() => {
    if (open) {
      setForm(model ? modelToForm(model) : EMPTY_FORM);
    }
  }, [open, model]);

  const { mutate: saveModel, isPending } = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      mode === "create"
        ? api.post("/models", payload).then((r) => r.data)
        : api.patch(`/models/${model!.id}`, payload).then((r) => r.data),
    onSuccess: () => {
      toast.success(mode === "create" ? "Model created" : "Model updated");
      queryClient.invalidateQueries({ queryKey: ["admin-models"] });
      queryClient.invalidateQueries({ queryKey: ["admin-models-count"] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to save model"),
  });

  const handleSave = () => {
    if (!form.providerId) { toast.error("Provider is required"); return; }
    if (!form.slug.trim()) { toast.error("Slug is required"); return; }

    if (mode === "create") {
      saveModel(buildCreatePayload(form));
    } else {
      if (!model) return;
      const payload = buildUpdatePayload(form, model);
      if (!Object.keys(payload).length) { toast.info("No changes to save"); return; }
      saveModel(payload);
    }
  };

  const set = (key: keyof ModelForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const field = (label: string, key: keyof ModelForm, placeholder = "", hint?: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input className="h-9 text-sm" value={(form[key] as string)} onChange={set(key)} placeholder={placeholder} />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          {mode === "edit" && model ? (
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border/60">
                {model.provider.providerLogo
                  ? <img src={model.provider.providerLogo} alt={model.provider.displayName ?? ""} className="size-full object-contain p-1.5" />
                  : <BrainCircuit className="size-5 text-muted-foreground" />
                }
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-base font-semibold truncate">{getModelName(model)}</SheetTitle>
                <SheetDescription className="text-xs truncate">{model.slug}</SheetDescription>
              </div>
            </div>
          ) : (
            <>
              <SheetTitle className="text-base font-semibold">Add Model</SheetTitle>
              <SheetDescription className="text-xs">Register a new LLM model and its pricing.</SheetDescription>
            </>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Identity */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BrainCircuit className="size-3.5" /> Identity
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Provider <span className="text-destructive">*</span></Label>
              <Select value={form.providerId} onValueChange={(v) => setForm((p) => ({ ...p, providerId: v }))}>
                <SelectTrigger className="h-9 text-sm w-full">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.displayName ?? p.slug ?? p.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {field("Slug", "slug", "gpt-4o", "Unique identifier — must match the provider's model ID")}
            {field("Display Name", "displayName", "GPT-4o")}

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <textarea
                className="w-full min-h-[72px] resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of the model…"
              />
            </div>
          </section>

          {/* Capabilities */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="size-3.5" /> Capabilities
            </p>
            <div className="grid grid-cols-2 gap-3">
              {field("Context Length", "contextLength", "128000")}
              {field("Max Output Tokens", "maxOutputTokens", "16384")}
            </div>
            {field("Tokenizer", "tokenizer", "cl100k_base")}
          </section>

          {/* Pricing */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="size-3.5" /> Pricing (per token)
            </p>
            <div className="grid grid-cols-2 gap-3">
              {field("Input", "inputPricePerToken", "0.0000025")}
              {field("Output", "outputPricePerToken", "0.0000100")}
              {field("Cache Write", "cacheWritePricePerToken", "0.0000038")}
              {field("Cache Read", "cacheReadPricePerToken", "0.0000003")}
            </div>
          </section>

          {/* Modalities & Parameters */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="size-3.5" /> Modalities & Parameters
            </p>
            {field("Input Modalities", "inputModalities", "text, image", "Comma-separated")}
            {field("Output Modalities", "outputModalities", "text", "Comma-separated")}
            {field("Supported Parameters", "supportedParameters", "temperature, top_p, max_tokens", "Comma-separated")}
            {field("Default For Capabilities", "defaultForCapabilities", "chat, vision", "Comma-separated")}
          </section>

          {/* Status */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Database className="size-3.5" /> Status
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  form.isActive ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
                )}
              >
                <span className={cn("pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform", form.isActive ? "translate-x-4" : "translate-x-0")} />
              </button>
              <span className="text-sm">{form.isActive ? "Active" : "Inactive"}</span>
            </div>
          </section>
        </div>

        <SheetFooter className="px-6 py-4 border-t flex flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={isPending}>
            {isPending ? (mode === "create" ? "Creating…" : "Saving…") : (mode === "create" ? "Create Model" : "Save Changes")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

export default function AdminModelsPage() {
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [statusFilter, setStatusFilter]     = useState("ALL");
  const [slugSearch, setSlugSearch]         = useState("");
  const [debouncedSlug, setDebouncedSlug]   = useState("");
  const [page, setPage] = useState(1);

  const [sheetOpen, setSheetOpen]       = useState(false);
  const [sheetMode, setSheetMode]       = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget]     = useState<AdminModel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminModel | null>(null);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const t = setTimeout(() => { setDebouncedSlug(slugSearch); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [slugSearch]);

  // ── Queries ──

  const { data: totalData,    isLoading: totalLoading }    = useQuery({
    queryKey: ["admin-models-count", "all"],
    queryFn: () => api.get("/models", { params: { pageSize: 1 } }).then((r) => r.data),
    staleTime: 60_000,
  });
  const { data: activeData,   isLoading: activeLoading }   = useQuery({
    queryKey: ["admin-models-count", "active"],
    queryFn: () => api.get("/models", { params: { pageSize: 1, isActive: "true" } }).then((r) => r.data),
    staleTime: 60_000,
  });
  const { data: inactiveData, isLoading: inactiveLoading } = useQuery({
    queryKey: ["admin-models-count", "inactive"],
    queryFn: () => api.get("/models", { params: { pageSize: 1, isActive: "false" } }).then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: providersData } = useQuery({
    queryKey: ["admin-providers-list"],
    queryFn: () => api.get("/providers").then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const modelsQuery = useQuery({
    queryKey: ["admin-models", debouncedSlug, providerFilter, statusFilter, page],
    queryFn: () => api.get("/models", {
      params: {
        page,
        pageSize: PAGE_SIZE,
        ...(debouncedSlug  ? { slug: debouncedSlug }                       : {}),
        ...(providerFilter !== "ALL" ? { providerId: providerFilter }      : {}),
        ...(statusFilter   !== "ALL" ? { isActive: statusFilter === "ACTIVE" ? "true" : "false" } : {}),
      },
    }).then((r) => r.data),
    staleTime: 30_000,
  });

  // ── Mutations ──

  const { mutate: deleteModel, isPending: deleting } = useMutation({
    mutationFn: (id: string) => api.delete(`/models/${id}`).then((r) => r.data),
    onSuccess: () => {
      toast.success("Model deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-models"] });
      queryClient.invalidateQueries({ queryKey: ["admin-models-count"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to delete model"),
  });

  const { mutate: toggleStatus } = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/models/${id}`, { isActive }).then((r) => r.data),
    onSuccess: (_, { isActive }) => {
      toast.success(isActive ? "Model activated" : "Model deactivated");
      queryClient.invalidateQueries({ queryKey: ["admin-models"] });
      queryClient.invalidateQueries({ queryKey: ["admin-models-count"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to update status"),
  });

  // ── Derived ──

  const providers: AdminProvider[] = (() => {
    const raw = providersData?.data ?? providersData;
    if (Array.isArray(raw)) return raw;
    if (raw?.data && Array.isArray(raw.data)) return raw.data;
    return [];
  })();

  const modelList: AdminModel[]  = modelsQuery.data?.data      ?? [];
  const totalPages: number       = modelsQuery.data?.totalPages ?? 1;
  const totalRecords: number     = modelsQuery.data?.totalRecords ?? 0;
  const hasFilters = !!(debouncedSlug || providerFilter !== "ALL" || statusFilter !== "ALL");

  const openCreate = () => { setSheetMode("create"); setEditTarget(null); setSheetOpen(true); };
  const openEdit   = (m: AdminModel) => { setSheetMode("edit"); setEditTarget(m); setSheetOpen(true); };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 pb-10"
    >
      {/* ── Delete confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-destructive" />
              Delete model?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{deleteTarget ? getModelName(deleteTarget) : ""}</strong>{" "}
              will be permanently deleted. Any requests routing to this model will fail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteModel(deleteTarget.id)}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete Model"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Sheet ── */}
      <ModelSheet
        open={sheetOpen}
        mode={sheetMode}
        model={editTarget}
        providers={providers}
        onClose={() => setSheetOpen(false)}
      />

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Models</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage LLM models, pricing, and capabilities.</p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="size-4" /> Add Model
        </Button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Models" value={totalData?.totalRecords    ?? 0} icon={BrainCircuit} iconBg="bg-blue-50 dark:bg-blue-900/20 text-blue-600"         loading={totalLoading} />
        <StatCard title="Active"       value={activeData?.totalRecords   ?? 0} icon={Power}        iconBg="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" loading={activeLoading} />
        <StatCard title="Inactive"     value={inactiveData?.totalRecords ?? 0} icon={PowerOff}     iconBg="bg-zinc-100 dark:bg-zinc-800 text-zinc-500"            loading={inactiveLoading} />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-9 text-sm"
            placeholder="Search by slug…"
            value={slugSearch}
            onChange={(e) => setSlugSearch(e.target.value)}
          />
        </div>

        <Select value={providerFilter} onValueChange={(v) => { setProviderFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 text-sm w-[160px]"><SelectValue placeholder="All Providers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Providers</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.displayName ?? p.slug ?? p.id}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 text-sm w-[130px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground"
            onClick={() => { setSlugSearch(""); setProviderFilter("ALL"); setStatusFilter("ALL"); setPage(1); }}>
            Clear filters
          </Button>
        )}

        {totalRecords > 0 && !modelsQuery.isLoading && (
          <span className="text-xs text-muted-foreground ml-auto">
            {totalRecords} model{totalRecords !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Table ── */}
      <Card className="border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
              <TableHead className="pl-5 py-3 font-semibold text-xs w-[28%]">Model</TableHead>
              <TableHead className="py-3 font-semibold text-xs">Provider</TableHead>
              <TableHead className="py-3 font-semibold text-xs text-right">Context</TableHead>
              <TableHead className="py-3 font-semibold text-xs text-right">Max Output</TableHead>
              <TableHead className="py-3 font-semibold text-xs text-right">Input / token</TableHead>
              <TableHead className="py-3 font-semibold text-xs text-right">Output / token</TableHead>
              <TableHead className="py-3 font-semibold text-xs">Status</TableHead>
              <TableHead className="py-3 w-10 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {modelsQuery.isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-border/40">
                    <TableCell colSpan={8} className="py-3 pl-5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-8 rounded-lg shrink-0" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-36" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              : modelList.length === 0
              ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-20 text-center">
                      <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                        <BrainCircuit className="size-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {hasFilters ? "No models match your filters" : "No models yet"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {hasFilters ? "Try adjusting your search or filters." : "Add your first model to get started."}
                      </p>
                      {hasFilters ? (
                        <button className="mt-3 text-xs text-primary hover:underline underline-offset-2"
                          onClick={() => { setSlugSearch(""); setProviderFilter("ALL"); setStatusFilter("ALL"); }}>
                          Clear all filters
                        </button>
                      ) : (
                        <Button size="sm" className="mt-4 gap-1.5" onClick={openCreate}>
                          <Plus className="size-3.5" /> Add Model
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              : modelList.map((model) => (
                  <TableRow key={model.id} className="group border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {model.provider.providerLogo
                            ? <img src={model.provider.providerLogo} alt={model.provider.displayName ?? ""} className="size-full object-contain p-1" />
                            : <BrainCircuit className="size-4 text-muted-foreground" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight truncate">{getModelName(model)}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{model.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <ProviderBadge provider={model.provider} />
                    </TableCell>
                    <TableCell className="py-3.5 text-right text-sm tabular-nums text-muted-foreground">
                      {fmtCtx(model.contextLength)}
                    </TableCell>
                    <TableCell className="py-3.5 text-right text-sm tabular-nums text-muted-foreground">
                      {fmtCtx(model.maxOutputTokens)}
                    </TableCell>
                    <TableCell className="py-3.5 text-right text-xs tabular-nums font-mono text-muted-foreground">
                      {fmtPrice(model.inputPricePerToken)}
                    </TableCell>
                    <TableCell className="py-3.5 text-right text-xs tabular-nums font-mono text-muted-foreground">
                      {fmtPrice(model.outputPricePerToken)}
                    </TableCell>
                    <TableCell className="py-3.5">
                      <StatusPill isActive={model.isActive} />
                    </TableCell>
                    <TableCell className="py-3.5 pr-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => openEdit(model)}>
                            <Pencil className="size-3.5" /> Edit
                          </DropdownMenuItem>
                          {model.isActive ? (
                            <DropdownMenuItem onClick={() => toggleStatus({ id: model.id, isActive: false })}>
                              <PowerOff className="size-3.5" /> Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => toggleStatus({ id: model.id, isActive: true })}>
                              <Power className="size-3.5" /> Activate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(model)}>
                            <Trash2 className="size-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </Card>

      <Pagination page={page} totalPages={totalPages} totalRecords={totalRecords} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </motion.div>
  );
}
