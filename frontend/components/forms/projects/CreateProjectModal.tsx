"use client";

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
import { useProjectStore } from "@/store/projectStore";
import type { Project } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateProjectModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const setProjects = useProjectStore((s) => s.setProjects);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const projects = useProjectStore((s) => s.projects);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (d: FormValues) =>
      api.post("/projects", d).then((r) => r.data),
    onSuccess: (newProject: Project) => {
      const updated = [...projects, newProject];
      setProjects(updated);
      setActiveProject(newProject);
      qc.invalidateQueries({ queryKey: ["projects"] });
      handleClose();
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        setApiError(err.response?.data?.message ?? "Failed to create project.");
      }
    },
  });

  const handleClose = () => {
    reset();
    setApiError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Projects group your API keys and usage data together.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((d) => {
            setApiError(null);
            mutate(d);
          })}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-name">Project name</Label>
            <Input
              id="cp-name"
              placeholder="e.g. My Production App"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-desc">
              Description{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="cp-desc"
              placeholder="What is this project for?"
              {...register("description")}
            />
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
              {isPending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
