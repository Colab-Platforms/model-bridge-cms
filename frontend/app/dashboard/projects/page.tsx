"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Plus, FolderOpen } from "lucide-react";
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
import CreateProjectModal from "@/components/forms/projects/CreateProjectModal";
import EditProjectModal from "@/components/forms/projects/EditProjectModal";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectStore";
import type { Project } from "@/types";

function fmt(str: string) {
  return new Date(str).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 30 } },
};

export default function ProjectsPage() {
  const qc = useQueryClient();
  const { projects, activeProject, setProjects, setActiveProject } = useProjectStore();
  const isLoading = false; // projects come from the layout query / store

  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      const updated = projects.filter((p) => p.id !== deleteProject!.id);
      setProjects(updated);
      if (activeProject?.id === deleteProject!.id) {
        setActiveProject(updated[0] ?? (null as unknown as Project));
      }
      qc.invalidateQueries({ queryKey: ["projects"] });
      setDeleteProject(null);
      toast.success("Project deleted");
    },
    onError: () => toast.error("Failed to delete project. Please try again."),
  });

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground/90 font-serif">Projects</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Projects group your API keys and usage data.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
          <Plus className="size-4 mr-1.5" />
          New project
        </Button>
      </motion.div>

      {/* Content */}
      <motion.div variants={itemVariants}>
      {isLoading ? (
        <div className="space-y-2 rounded-3xl border border-border/40 bg-card/60 backdrop-blur-md p-4 shadow-sm">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border bg-muted/10 py-20 text-center shadow-sm backdrop-blur-sm">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/50">
            <FolderOpen className="size-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground text-lg">No projects yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a project to start managing API keys.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="mt-2 transition-all hover:shadow-md hover:-translate-y-0.5">
            <Plus className="size-4 mr-1.5" />
            Create your first project
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border/40 bg-card/60 backdrop-blur-md shadow-sm transition-all duration-500 hover:shadow-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{project.name}</span>
                      {activeProject?.id === project.id && (
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    {project.description && (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">
                        {project.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-medium",
                        project.isActive
                          ? "border-green-200 bg-green-100 text-green-700"
                          : "border-zinc-200 bg-zinc-100 text-zinc-500"
                      )}
                    >
                      {project.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fmt(project.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label="Project actions"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => setActiveProject(project)}
                          disabled={activeProject?.id === project.id}
                        >
                          Set as active
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setEditProject(project)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setDeleteProject(project)}
                          disabled={projects.length === 1}
                        >
                          Delete
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
      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {editProject && (
        <EditProjectModal project={editProject} onClose={() => setEditProject(null)} />
      )}

      {/* Delete — AlertDialog prevents accidental dismiss */}
      <AlertDialog open={!!deleteProject} onOpenChange={(v) => !v && setDeleteProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteProject?.name}</strong> and all its API keys will be
              permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deleteProject && deleteMutation.mutate(deleteProject.id)}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
