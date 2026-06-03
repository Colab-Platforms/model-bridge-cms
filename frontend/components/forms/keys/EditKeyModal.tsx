"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

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
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import type { ApiKey } from "@/types";

const SCOPES = ["FULL", "CHAT", "IMAGE", "AUDIO", "VIDEO", "READ_ONLY"] as const;

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  scopes: z.array(z.enum(SCOPES)).min(1, "Select at least one scope"),
  rateLimit: z.coerce.number().int().min(1, "Must be at least 1"),
  monthlyLimit: z.string().optional(),
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
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: apiKey.name,
      scopes: apiKey.scopes,
      rateLimit: apiKey.rateLimit,
      monthlyLimit: apiKey.monthlyLimit?.toString() ?? "",
    },
  });

  useEffect(() => {
    reset({
      name: apiKey.name,
      scopes: apiKey.scopes,
      rateLimit: apiKey.rateLimit,
      monthlyLimit: apiKey.monthlyLimit?.toString() ?? "",
    });
  }, [apiKey, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: (d: FormValues) =>
      api
        .patch(`/api/v1/keys/${apiKey.id}`, {
          name: d.name,
          scopes: d.scopes,
          rateLimit: Number(d.rateLimit),
          monthlyLimit: d.monthlyLimit ? Number(d.monthlyLimit) : null,
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
            Update the name, scopes, or rate limits for this key.
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

          {/* Scopes */}
          <div className="flex flex-col gap-1.5">
            <Label>Scopes</Label>
            <Controller
              name="scopes"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {SCOPES.map((scope) => {
                    const checked = field.value.includes(scope);
                    return (
                      <label
                        key={scope}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors select-none",
                          checked
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-accent"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={(e) =>
                            field.onChange(
                              e.target.checked
                                ? [...field.value, scope]
                                : field.value.filter((s) => s !== scope)
                            )
                          }
                        />
                        <span
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded-md border transition-colors",
                            checked
                              ? "border-primary bg-primary"
                              : "border-border bg-background"
                          )}
                        >
                          {checked && (
                            <svg
                              className="size-3 text-primary-foreground"
                              fill="none"
                              viewBox="0 0 12 12"
                            >
                              <path
                                d="M2 6l3 3 5-5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        {scope}
                      </label>
                    );
                  })}
                </div>
              )}
            />
            {errors.scopes && (
              <p className="text-xs text-destructive">{errors.scopes.message}</p>
            )}
          </div>

          {/* Rate limit + Monthly limit side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ek-rate">Rate limit (req / min)</Label>
              <Input
                id="ek-rate"
                type="number"
                min={1}
                aria-invalid={!!errors.rateLimit}
                {...register("rateLimit")}
              />
              {errors.rateLimit && (
                <p className="text-xs text-destructive">
                  {errors.rateLimit.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ek-monthly">
                Monthly limit{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="ek-monthly"
                type="number"
                min={1}
                placeholder="No limit"
                {...register("monthlyLimit")}
              />
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
