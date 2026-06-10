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
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useProjectStore } from "@/store/projectStore";
import CreateProjectModal from "@/components/forms/projects/CreateProjectModal";

export function ProjectSwitcher() {
  const { isMobile } = useSidebar();
  const { projects, activeProject, setActiveProject } = useProjectStore();
  const [createOpen, setCreateOpen] = React.useState(false);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <FolderOpen className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {activeProject?.name ?? "No project"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {activeProject ? "Active project" : "Select a project"}
                  </span>
                </div>
                <ChevronsUpDownIcon className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
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
        </SidebarMenuItem>
      </SidebarMenu>

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
