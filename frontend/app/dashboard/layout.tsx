"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { useProjectStore } from "@/store/projectStore";
import { useAuthStore } from "@/store/authStore";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardBreadcrumbs } from "@/components/layout/dashboard-breadcrumbs";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import api from "@/lib/api";
import type { Project } from "@/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const setProjects = useProjectStore((s) => s.setProjects);
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


const { data: fetchedProjects } = useQuery<Project[]>({
  queryKey: ["projects"],
  queryFn: () => api.get("/projects").then((r) => r.data),
  enabled: mounted,
  staleTime: 5 * 60 * 1000,
});

useEffect(() => {
  if (fetchedProjects) {
    setProjects(fetchedProjects);
  }
}, [fetchedProjects, setProjects]);


  useEffect(() => {
    if (hasHydrated) {
      if (!user) {
        router.replace("/auth/login");
      } else if (isAdmin()) {
        router.replace("/admin/statistics");
      }
    }
  }, [hasHydrated, user, isAdmin, router]);

  if (!hasHydrated || !user) return null;
  if (isAdmin()) return null;

  return (
    <>
      <DashboardHeader />
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <DashboardBreadcrumbs />
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
