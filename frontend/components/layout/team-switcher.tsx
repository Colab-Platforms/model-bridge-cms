"use client";

import * as React from "react";
import { ChevronsUpDownIcon, FolderOpen, Plus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjectStore } from "@/store/projectStore";
import CreateProjectModal from "@/components/forms/projects/CreateProjectModal";
import { cn } from "@/lib/utils";

export function ProjectSwitcher({ className }: { className?: string }) {
  const { projects, activeProject, setActiveProject } = useProjectStore();
  const [createOpen, setCreateOpen] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex h-8 items-center gap-2 rounded-xl border border-border bg-background pl-2 pr-2.5 text-left transition-all hover:bg-accent",
              className
            )}
          >
            <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FolderOpen className="size-3" />
            </div>
            <span className="max-w-[120px] truncate text-[13px] font-semibold text-foreground">
              {activeProject?.name ?? "No project"}
            </span>
            <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56 rounded-lg" align="start" sideOffset={6}>
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Projects
          </DropdownMenuLabel>

          {projects.length === 0 ? (
            <DropdownMenuItem disabled className="text-muted-foreground text-sm">
              No projects yet
            </DropdownMenuItem>
          ) : (
            projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                className="gap-2 p-2"
                onSelect={() => setActiveProject(project)}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <FolderOpen className="size-3" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span
                    className={
                      activeProject?.id === project.id
                        ? "truncate font-semibold"
                        : "truncate font-medium"
                    }
                  >
                    {project.name}
                  </span>
                  {activeProject?.id === project.id && (
                    <span className="truncate text-xs text-muted-foreground">
                      Active
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 p-2 cursor-pointer"
            onSelect={() => setCreateOpen(true)}
          >
            <div className="flex size-6 items-center justify-center rounded-md border bg-transparent text-muted-foreground">
              <Plus className="size-3" />
            </div>
            <span className="text-muted-foreground">New project</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
