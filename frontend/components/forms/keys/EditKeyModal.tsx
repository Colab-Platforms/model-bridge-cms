"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";

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
import api from "@/lib/api";
import type { ApiKey } from "@/types";

const LIMIT_TYPES = ["UNLIMITED", "DAILY", "WEEKLY", "MONTHLY", "QUATERLY", "YEARLY"] as const;

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  creditLimit: z.string().optional(),
  limitType: z.enum(LIMIT_TYPES).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  apiKey: ApiKey;
  onClose: () => void;
}

export default function EditKeyModal({ apiKey, onClose }: Props) {
  const qc = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: apiKey.name,
      creditLimit: apiKey.creditLimit ?? "",
      limitType: apiKey.limitType,
    },
  });

  useEffect(() => {
    reset({
      name: apiKey.name,
      creditLimit: apiKey.creditLimit ?? "",
      limitType: apiKey.limitType,
    });
  }, [apiKey, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: (d: FormValues) =>
      api
        .patch(`/api-keys/${apiKey.id}`, {
          name: d.name,
          creditLimit: d.creditLimit || undefined,
          limitType: d.limitType || undefined,
        })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["keys"] });
      onClose();
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        setApiError(err.response?.data?.message ?? "Failed to save changes.");
      }
    },
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit API key</DialogTitle>
          <DialogDescription>
            Update the name or spend limit for this key.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((d) => {
            setApiError(null);
            mutate(d);
          })}
          className="flex flex-col gap-4"
        >
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ek-name">Key name</Label>
            <Input
              id="ek-name"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Credit limit + Limit type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ek-limit">
                Credit limit{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="ek-limit"
                type="number"
                min={0}
                step="0.01"
                placeholder="No limit"
                {...register("creditLimit")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ek-limit-type">Limit period</Label>
              <select
                id="ek-limit-type"
                className="h-10 rounded-xl border border-border bg-background px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                {...register("limitType")}
              >
                <option value="">No period</option>
                {LIMIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "UNLIMITED" ? "Unlimited" : t.charAt(0) + t.slice(1).toLowerCase()}
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
