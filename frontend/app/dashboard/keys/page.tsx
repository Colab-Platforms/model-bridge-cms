"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MoreHorizontal,
  Plus,
  Key,
  Shield,
  RefreshCw,
  Trash2,
  Edit3,
  Copy,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CreateKeyModal from "@/components/forms/keys/CreateKeyModal";
import EditKeyModal from "@/components/forms/keys/EditKeyModal";
import OneTimeKeyDisplay from "@/components/forms/keys/OneTimeKeyDisplay";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectStore";
import type { ApiKey } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(str: string | null | undefined) {
  if (!str) return "Never";
  return new Date(str).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}


const STATUS_CONFIG: Record<ApiKey["status"], { bg: string; text: string; dot: string }> = {
  ACTIVE:    { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-600", dot: "bg-emerald-500" },
  REVOKED:   { bg: "bg-red-500/10 border-red-500/20", text: "text-red-600", dot: "bg-red-500" },
  INACTIVE:  { bg: "bg-zinc-500/10 border-zinc-500/20", text: "text-zinc-500", dot: "bg-zinc-500" },
  EXPIRED:   { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-600", dot: "bg-amber-500" },
  EXHAUSTED: { bg: "bg-orange-500/10 border-orange-500/20", text: "text-orange-600", dot: "bg-orange-500" },
};

function StatusBadge({ status }: { status: ApiKey["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-none px-2.5 py-0.5 text-[10px] font-black uppercase tracking-tight border",
      cfg.bg,
      cfg.text
    )}>
      <span className={cn("size-1.5 rounded-full animate-pulse", cfg.dot)} />
      {status}
    </span>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 30 } },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function KeysPage() {
  const qc = useQueryClient();
  const activeProject = useProjectStore((s) => s.activeProject);

  const [createOpen, setCreateOpen]       = useState(false);
  const [editKey, setEditKey]             = useState<ApiKey | null>(null);
  const [revokeKey, setRevokeKey]         = useState<ApiKey | null>(null);
  const [rotateKey, setRotateKey]         = useState<ApiKey | null>(null);
  const [rotatedApiKey, setRotatedApiKey] = useState<string | null>(null);
  // Full keys stored in memory for this session only (cleared on page refresh)
  const [sessionKeys, setSessionKeys]     = useState<Record<string, string>>({});

  const storeSessionKey = (keyId: string, fullKey: string) =>
    setSessionKeys((prev) => ({ ...prev, [keyId]: fullKey }));

  const { data: keys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ["keys", activeProject?.id],
    queryFn: () =>
      api.get("/api-keys", { params: { projectId: activeProject!.id } }).then((r) => r.data),
    enabled: !!activeProject,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api-keys/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["keys"] });
      setRevokeKey(null);
      toast.success("API key revoked");
    },
    onError: () => toast.error("Failed to revoke key. Please try again."),
  });

  const rotateMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/api-keys/${id}/rotate`).then((r) => r.data),
    onSuccess: (data) => {
      setRotatedApiKey(data.apiKey);
      qc.invalidateQueries({ queryKey: ["keys"] });
      if (rotateKey && data.apiKey) {
        storeSessionKey(rotateKey.id, data.apiKey);
      }
    },
    onError: () => toast.error("Failed to rotate key. Please try again."),
  });

  const closeRotateDialog = () => {
    setRotateKey(null);
    setRotatedApiKey(null);
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* ── Page Header ── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground/90">Security Keys</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Authenticate your application requests with secure project keys.
          </p>
        </div>
        <Button 
          onClick={() => setCreateOpen(true)} 
          className="shrink-0 rounded-none bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 h-10 px-5 font-bold uppercase text-xs tracking-wider"
        >
          <Plus className="size-4 mr-2" />
          Generate New Key
        </Button>
      </motion.div>

      {/* ── Info Banner ── */}
      <motion.div variants={itemVariants} className="rounded-none border border-primary/20 bg-primary/5 p-6 flex items-start gap-4">
         <div className="flex size-10 items-center justify-center rounded-none bg-primary/10 text-primary shrink-0">
            <Shield className="size-5" />
         </div>
         <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">Protect your secrets</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              API keys carry significant privileges. Never share them in public repositories or client-side code that isn't obfuscated. We recommend rotating keys every 90 days for maximum security.
            </p>
         </div>
      </motion.div>

      {/* ── Main Content ── */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="space-y-3 rounded-none border border-border/40 bg-card/60 backdrop-blur-md p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-6 rounded-none border border-dashed border-border/60 bg-muted/10 py-24 text-center backdrop-blur-sm">
            <div className="flex size-20 items-center justify-center rounded-none bg-muted shadow-inner">
              <Key className="size-10 text-muted-foreground/40" />
            </div>
            <div className="max-w-xs">
              <p className="font-bold text-foreground text-xl">No API keys active</p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                You haven't created any keys for this project yet. Start by generating a new one.
              </p>
            </div>
            <Button 
              onClick={() => setCreateOpen(true)}
              className="rounded-none font-bold px-6"
            >
              <Plus className="size-4 mr-2" />
              Create First Key
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-none border border-border/40 bg-card/60 backdrop-blur-md shadow-sm transition-all duration-500 hover:shadow-xl">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/40 bg-muted/40 hover:bg-muted/40">
                  <TableHead className="py-5 pl-8 text-[11px] font-black uppercase tracking-widest text-muted-foreground">Key Prefix</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Identity</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Balance Limit</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Activity</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Created</TableHead>
                  <TableHead className="w-12 pr-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id} className="group/row transition-colors hover:bg-primary/5 cursor-default border-b border-border/10">
                    <TableCell className="pl-8">
                       <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-muted/60 border border-border/50 rounded px-2 py-1 text-muted-foreground group-hover/row:text-primary transition-colors">
                            {key.keyPrefix}••••••••
                          </span>
                          <button
                            onClick={() => {
                               const toCopy = sessionKeys[key.id] ?? key.keyPrefix;
                               navigator.clipboard.writeText(toCopy);
                               toast.success(sessionKeys[key.id] ? "API key copied" : "Key prefix copied");
                            }}
                            className="opacity-0 group-hover/row:opacity-100 p-1 hover:bg-primary/10 rounded transition-all"
                            title={sessionKeys[key.id] ? "Copy full API key" : "Copy key prefix"}
                          >
                             <Copy className="size-3 text-primary" />
                          </button>
                       </div>
                    </TableCell>
                    <TableCell>
                       <span className="text-sm font-bold text-foreground truncate max-w-[150px] inline-block">
                          {key.name}
                       </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={key.status} />
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-1.5">
                          <DollarSign className="size-3.5 text-muted-foreground" />
                          <span className="text-xs font-bold text-foreground">
                            {key.creditLimit
                              ? `${String(key.creditLimit)} / ${key.limitType?.toLowerCase()}`
                              : "Unlimited"}
                          </span>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Last used</span>
                          <span className="text-xs font-bold text-foreground/80">{fmt(key.lastUsedAt)}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Issue date</span>
                          <span className="text-xs font-medium text-muted-foreground">{fmt(key.createdAt)}</span>
                       </div>
                    </TableCell>
                    <TableCell className="pr-8">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="size-10 rounded-none hover:bg-primary/10 hover:text-primary"
                          >
                            <MoreHorizontal className="size-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-none p-2 bg-popover/90 backdrop-blur-md border-border/60">
                          <DropdownMenuItem onSelect={() => setEditKey(key)} className="rounded-xl px-3 py-2.5 gap-3 cursor-pointer">
                            <Edit3 className="size-4 text-muted-foreground" />
                            <span className="font-bold text-xs uppercase tracking-wider">Configure Key</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setRotateKey(key)}
                            disabled={key.status !== "ACTIVE"}
                            className="rounded-xl px-3 py-2.5 gap-3 cursor-pointer"
                          >
                            <RefreshCw className="size-4 text-muted-foreground" />
                            <span className="font-bold text-xs uppercase tracking-wider">Rotate Secret</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="mx-2 bg-border/40" />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setRevokeKey(key)}
                            disabled={key.status !== "ACTIVE"}
                            className="rounded-xl px-3 py-2.5 gap-3 cursor-pointer"
                          >
                            <Trash2 className="size-4" />
                            <span className="font-bold text-xs uppercase tracking-wider">Revoke Access</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>

      {/* ── Modals ── */}
      <CreateKeyModal open={createOpen} onClose={() => setCreateOpen(false)} onKeyCreated={storeSessionKey} />
      {editKey && <EditKeyModal apiKey={editKey} onClose={() => setEditKey(null)} />}

      <AlertDialog open={!!revokeKey} onOpenChange={(v) => !v && setRevokeKey(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-border/60 bg-card/90 backdrop-blur-xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">Revoke key access?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground pt-2">
              The key <span className="font-bold text-foreground">"{revokeKey?.name}"</span> will be permanently deactivated. All applications currently using this credential will fail immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6">
            <AlertDialogCancel className="rounded-none border-border/60 font-bold uppercase text-[10px] tracking-widest h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none bg-red-600 text-white hover:bg-red-700 font-bold uppercase text-[10px] tracking-widest h-11 shadow-lg shadow-red-600/20"
              disabled={revokeMutation.isPending}
              onClick={() => revokeKey && revokeMutation.mutate(revokeKey.id)}
            >
              {revokeMutation.isPending ? "Revoking…" : "Revoke Access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rotateKey} onOpenChange={(v) => !v && closeRotateDialog()}>
        <DialogContent className="rounded-[2.5rem] border-border/60 bg-card/90 backdrop-blur-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {rotatedApiKey ? "New Credential Generated" : "Rotate Secret?"}
            </DialogTitle>
            {!rotatedApiKey && (
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground pt-2">
                A new private secret will be generated for <span className="font-bold text-foreground">"{rotateKey?.name}"</span>. The existing secret will reach end-of-life immediately.
              </DialogDescription>
            )}
          </DialogHeader>
          {rotatedApiKey ? (
            <OneTimeKeyDisplay apiKey={rotatedApiKey} onDismiss={closeRotateDialog} />
          ) : (
            <DialogFooter className="pt-6">
              <Button variant="outline" onClick={closeRotateDialog} className="rounded-none border-border/60 font-bold uppercase text-[10px] tracking-widest h-11">
                Keep Current
              </Button>
              <Button
                disabled={rotateMutation.isPending}
                onClick={() => rotateKey && rotateMutation.mutate(rotateKey.id)}
                className="rounded-none font-bold uppercase text-[10px] tracking-widest h-11 shadow-lg shadow-primary/20"
              >
                {rotateMutation.isPending ? "Rotating…" : "Generate New Secret"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
