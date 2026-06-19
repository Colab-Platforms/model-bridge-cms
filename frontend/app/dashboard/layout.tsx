"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { useProjectStore } from "@/store/projectStore";
import { useAuthStore } from "@/store/authStore";
import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import api from "@/lib/api";
import type { Project } from "@/types";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  overview: "Overview",
  keys: "API Keys",
  usage: "Usage Logs",
  activity: "Activity Log",
  stats: "Statistics",
  credits: "Credits & Wallet",
  projects: "Projects",
  settings: "Settings",
};

function useBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg, i) => ({
    label: ROUTE_LABELS[seg] ?? seg,
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const setProjects = useProjectStore((s) => s.setProjects);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const crumbs = useBreadcrumbs();

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
    if (mounted) {
      if (!user) {
        router.replace("/auth/login");
      } else if (user.role === "ADMIN") {
        router.replace("/admin/statistics");
      }
    }
  }, [mounted, user, router]);

  if (!mounted) return null;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.map((crumb, i) => (
                <span key={crumb.href} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <BreadcrumbSeparator className="hidden md:block" />
                  )}
                  <BreadcrumbItem
                    className={i < crumbs.length - 1 ? "hidden md:block" : ""}
                  >
                    {crumb.isLast ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={crumb.href}>
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </span>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
