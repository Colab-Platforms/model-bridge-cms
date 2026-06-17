"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import OneTimeKeyDisplay from "./OneTimeKeyDisplay";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useProjectStore } from "@/store/projectStore";

const LIMIT_TYPES = ["DAILY", "WEEKLY", "MONTHLY", "QUATERLY", "YEARLY"] as const;

const schema = z.object({
  name:        z.string().min(1, "Name is required"),
  projectId:   z.string().min(1, "Please select a project"),
  creditLimit: z.string().optional(),
  limitType:   z.enum(LIMIT_TYPES).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onKeyCreated?: (keyId: string, fullApiKey: string) => void;
}

export default function CreateKeyModal({ open, onClose, onKeyCreated }: Props) {
  const qc            = useQueryClient();
  const projects      = useProjectStore((s) => s.projects);
  const activeProject = useProjectStore((s) => s.activeProject);
  const user          = useAuthStore((s) => s.user);

  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [apiError, setApiError]       = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", projectId: "", creditLimit: "", limitType: undefined },
  });

  // Pre-select activeProject every time the modal opens
  useEffect(() => {
    if (open) {
      reset({
        name:        "",
        projectId:   activeProject?.id ?? projects[0]?.id ?? "",
        creditLimit: "",
        limitType:   undefined,
      });
      setRevealedKey(null);
      setApiError(null);
    }
  }, [open, activeProject?.id]);

  const { mutate, isPending } = useMutation({
    mutationFn: (d: FormValues) =>
      api.post("/api-keys", {
        userId:      user!.id,
        name:        d.name,
        projectId:   d.projectId,
        creditLimit: d.creditLimit || undefined,
        limitType:   d.limitType   || undefined,
      }).then((r) => r.data),
    onSuccess: (data) => {
      setRevealedKey(data.apiKey);
      qc.invalidateQueries({ queryKey: ["keys"] });
      if (data.id && data.apiKey) {
        onKeyCreated?.(data.id, data.apiKey);
      }
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        setApiError(err.response?.data?.message ?? "Failed to create key.");
      }
    },
  });

  const handleClose = () => {
    reset();
    setRevealedKey(null);
    setApiError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {revealedKey ? "Your new API key" : "Create API key"}
          </DialogTitle>
          {!revealedKey && (
            <DialogDescription>
              Give your key a name, pick a project, and optionally set a spend limit.
            </DialogDescription>
          )}
        </DialogHeader>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              You need at least one project before creating an API key.
            </p>
            <Button asChild variant="outline" onClick={handleClose}>
              <Link href="/dashboard/projects">Go to Projects</Link>
            </Button>
          </div>
        ) : revealedKey ? (
          <OneTimeKeyDisplay apiKey={revealedKey} onDismiss={handleClose} />
        ) : (
          <form
            onSubmit={handleSubmit((d) => {
              setApiError(null);
              mutate(d);
            })}
            className="flex flex-col gap-4"
          >
            {/* Key name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ck-name">Key name</Label>
              <Input
                id="ck-name"
                placeholder="e.g. My Production App"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Project selector */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ck-project">Project</Label>
              <select
                id="ck-project"
                className="h-10 rounded-xl border border-border bg-background px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                aria-invalid={!!errors.projectId}
                {...register("projectId")}
              >
                <option value="">Select a project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.projectId && (
                <p className="text-xs text-destructive">{errors.projectId.message}</p>
              )}
            </div>

            {/* Credit limit + period */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ck-limit">
                  Credit limit{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="ck-limit"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="No limit"
                  {...register("creditLimit")}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ck-limit-type">Limit period</Label>
                <select
                  id="ck-limit-type"
                  className="h-10 rounded-xl border border-border bg-background px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  {...register("limitType")}
                >
                  <option value="">No period</option>
                  {LIMIT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {apiError && (
              <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {apiError}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating…" : "Create key"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
