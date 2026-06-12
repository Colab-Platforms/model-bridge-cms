"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Plus, Key } from "lucide-react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

function fmt(str: string | null | undefined) {
  if (!str) return "Never";
  return new Date(str).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<ApiKey["status"], string> = {
  ACTIVE:    "bg-green-100 text-green-700 border-green-200",
  REVOKED:   "bg-red-100 text-red-700 border-red-200",
  INACTIVE:  "bg-zinc-100 text-zinc-500 border-zinc-200",
  EXPIRED:   "bg-zinc-100 text-zinc-500 border-zinc-200",
  EXHAUSTED: "bg-orange-100 text-orange-700 border-orange-200",
};

export default function KeysPage() {
  const qc = useQueryClient();
  const activeProject = useProjectStore((s) => s.activeProject);

  const [createOpen, setCreateOpen]     = useState(false);
  const [editKey, setEditKey]           = useState<ApiKey | null>(null);
  const [revokeKey, setRevokeKey]       = useState<ApiKey | null>(null);
  const [rotateKey, setRotateKey]       = useState<ApiKey | null>(null);
  const [rotatedApiKey, setRotatedApiKey] = useState<string | null>(null);

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
    },
    onError: () => toast.error("Failed to rotate key. Please try again."),
  });

  const closeRotateDialog = () => {
    setRotateKey(null);
    setRotatedApiKey(null);
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Manage keys that authenticate requests to the API.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="size-4" />
          Create new key
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2 rounded-2xl border border-border p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      ) : keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <Key className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">No API keys yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first key to start making API requests.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Create your first key
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Credit limit</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {key.keyPrefix}
                  </TableCell>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-xs font-medium", STATUS_STYLES[key.status])}
                    >
                      {key.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {key.creditLimit
                      ? `$${key.creditLimit} / ${key.limitType?.toLowerCase() ?? "period"}`
                      : "No limit"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{fmt(key.lastUsedAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{fmt(key.createdAt)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label="Key actions"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditKey(key)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => setRotateKey(key)}
                          disabled={key.status !== "ACTIVE"}
                        >
                          Rotate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setRevokeKey(key)}
                          disabled={key.status !== "ACTIVE"}
                        >
                          Revoke
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

      {/* ── Modals ── */}
      <CreateKeyModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {editKey && <EditKeyModal apiKey={editKey} onClose={() => setEditKey(null)} />}

      {/* Revoke — AlertDialog prevents accidental dismiss */}
      <AlertDialog open={!!revokeKey} onOpenChange={(v) => !v && setRevokeKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{revokeKey?.name}</strong> will be permanently revoked.
              Any application using this key will lose access immediately. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={revokeMutation.isPending}
              onClick={() => revokeKey && revokeMutation.mutate(revokeKey.id)}
            >
              {revokeMutation.isPending ? "Revoking…" : "Revoke key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rotate — Dialog (two-step: confirm → show new key) */}
      <Dialog open={!!rotateKey} onOpenChange={(v) => !v && closeRotateDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {rotatedApiKey ? "Your new API key" : "Rotate API key?"}
            </DialogTitle>
            {!rotatedApiKey && (
              <DialogDescription>
                A new secret will be generated for{" "}
                <strong>{rotateKey?.name}</strong>. The current key will stop
                working immediately.
              </DialogDescription>
            )}
          </DialogHeader>
          {rotatedApiKey ? (
            <OneTimeKeyDisplay apiKey={rotatedApiKey} onDismiss={closeRotateDialog} />
          ) : (
            <DialogFooter>
              <Button variant="outline" onClick={closeRotateDialog}>
                Cancel
              </Button>
              <Button
                disabled={rotateMutation.isPending}
                onClick={() => rotateKey && rotateMutation.mutate(rotateKey.id)}
              >
                {rotateMutation.isPending ? "Rotating…" : "Rotate key"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
