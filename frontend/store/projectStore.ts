import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project } from "@/types";

interface ProjectStore {
  projects: Project[];
  activeProject: Project | null;
  setProjects: (projects: Project[]) => void;
  setActiveProject: (project: Project) => void;
  clearProjects: () => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProject: null,
      setProjects: (projects) => {
        const current = get().activeProject;
        const stillExists = current
          ? projects.find((p) => p.id === current.id) ?? null
          : null;
        set({
          projects,
          activeProject: stillExists ?? projects[0] ?? null,
        });
      },
      setActiveProject: (project) => set({ activeProject: project }),
      clearProjects: () => set({ projects: [], activeProject: null }),
    }),
    { name: "project-storage" }
  )
);
