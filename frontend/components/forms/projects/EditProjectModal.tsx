"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import api from "@/lib/api";
import { useProjectStore } from "@/store/projectStore";
import type { Project } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  project: Project;
  onClose: () => void;
}

export default function EditProjectModal({ project, onClose }: Props) {
  const qc = useQueryClient();
  const { projects, setProjects, activeProject, setActiveProject } = useProjectStore();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: project.name,
      description: project.description ?? "",
      isActive: project.isActive,
    },
  });

  useEffect(() => {
    reset({
      name: project.name,
      description: project.description ?? "",
      isActive: project.isActive,
    });
  }, [project, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: (d: FormValues) =>
      api.patch(`/projects/${project.id}`, d).then((r) => r.data),
    onSuccess: (updated: Project) => {
      const updatedList = projects.map((p) => (p.id === updated.id ? updated : p));
      setProjects(updatedList);
      if (activeProject?.id === updated.id) setActiveProject(updated);
      qc.invalidateQueries({ queryKey: ["projects"] });
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
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>Update the name or description.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((d) => {
            setApiError(null);
            mutate(d);
          })}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ep-name">Project name</Label>
            <Input
              id="ep-name"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ep-desc">
              Description{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="ep-desc"
              placeholder="What is this project for?"
              {...register("description")}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="ep-active"
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              {...register("isActive")}
            />
            <Label htmlFor="ep-active" className="cursor-pointer">
              Active
            </Label>
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
