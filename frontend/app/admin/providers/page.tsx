"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Server, Plus, Pencil, Trash2, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface Provider {
  id: string;
  slug: string | null;
  displayName: string | null;
  description: string | null;
  baseUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ProviderFormData {
  slug: string;
  displayName: string;
  description: string;
  baseUrl: string;
  isActive: boolean;
}

function ProviderFormDialog({
  open,
  onClose,
  provider,
}: {
  open: boolean;
  onClose: () => void;
  provider?: Provider;
}) {
  const qc = useQueryClient();
  const isEdit = !!provider;

  const [form, setForm] = useState<ProviderFormData>({
    slug: provider?.slug ?? "",
    displayName: provider?.displayName ?? "",
    description: provider?.description ?? "",
    baseUrl: provider?.baseUrl ?? "",
    isActive: provider?.isActive ?? true,
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (data: ProviderFormData) =>
      isEdit
        ? api.patch(`/providers/${provider!.id}`, data).then((r) => r.data)
        : api.post("/providers", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-providers"] });
      toast.success(isEdit ? "Provider updated" : "Provider created");
      onClose();
    },
    onError: (e: any) => {
      setError(e?.response?.data?.message ?? "Something went wrong");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.slug.trim() || !form.displayName.trim()) {
      setError("Slug and display name are required.");
      return;
    }
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Provider" : "Add Provider"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update provider details." : "Register a new LLM provider."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="openai"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="rounded-none"
                disabled={isEdit}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="OpenAI"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                className="rounded-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                placeholder="https://api.openai.com/v1"
                value={form.baseUrl}
                onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                className="rounded-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="Short description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="rounded-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="size-4"
              />
              <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending} className="rounded-none">
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="rounded-none">
              {mutation.isPending ? "Saving…" : isEdit ? "Save Changes" : "Add Provider"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminProvidersPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<Provider | null>(null);
  const [deleteProvider, setDeleteProvider] = useState<Provider | null>(null);

  const { data: providers = [], isLoading } = useQuery<Provider[]>({
    queryKey: ["admin-providers"],
    queryFn: () =>
      api.get("/providers").then((r) => {
        const raw = r.data;
        if (Array.isArray(raw)) return raw;
        if (raw?.data && Array.isArray(raw.data)) return raw.data;
        return [];
      }),
    staleTime: 2 * 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/providers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-providers"] });
      toast.success("Provider deleted");
      setDeleteProvider(null);
    },
    onError: () => toast.error("Failed to delete provider"),
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Providers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading…" : `${providers.length} provider${providers.length !== 1 ? "s" : ""} registered`}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="rounded-none gap-1.5">
          <Plus className="size-4" />
          Add Provider
        </Button>
      </div>

      {/* Providers table */}
      <Card className="rounded-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs uppercase tracking-wider">Provider</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Slug</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Base URL</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-center">Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-5 w-full rounded-none" />
                      </TableCell>
                    </TableRow>
                  ))
                : providers.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                        <Server className="size-10 mx-auto mb-3 text-muted-foreground/40" />
                        No providers registered yet.
                      </TableCell>
                    </TableRow>
                  )
                : providers.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{p.displayName ?? p.slug}</p>
                        {p.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">{p.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">{p.slug}</TableCell>
                      <TableCell>
                        {p.baseUrl ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                            <Globe className="size-3 shrink-0" />
                            <span className="truncate max-w-xs">{p.baseUrl}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={cn(
                            "rounded-none text-xs px-2 py-0",
                            p.isActive
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : "bg-red-100 text-red-600 hover:bg-red-100"
                          )}
                        >
                          {p.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-none"
                            onClick={() => setEditProvider(p)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-none text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteProvider(p)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <ProviderFormDialog
        open={createOpen || !!editProvider}
        onClose={() => { setCreateOpen(false); setEditProvider(null); }}
        provider={editProvider ?? undefined}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteProvider} onOpenChange={(v) => !v && setDeleteProvider(null)}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteProvider?.displayName ?? deleteProvider?.slug}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none bg-red-600 hover:bg-red-700"
              onClick={() => deleteProvider && deleteMutation.mutate(deleteProvider.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
