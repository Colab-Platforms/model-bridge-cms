"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuthStore } from "@/store/authStore";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
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
import { NavMain } from "@/components/layout/nav-main";
import { NavUser } from "@/components/layout/nav-user";
import Link from "next/link";
import {
  BarChart2,
  Users,
  BrainCircuit,
  Server,
  CreditCard,
  LayoutDashboard,
  ArrowLeft,
} from "lucide-react";

const adminNav = [
  {
    title: "Statistics",
    url: "/admin/statistics",
    icon: <BarChart2 />,
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: <Users />,
  },
  {
    title: "Models",
    url: "/admin/models",
    icon: <BrainCircuit />,
  },
  {
    title: "Providers",
    url: "/admin/providers",
    icon: <Server />,
  },
  {
    title: "Credits",
    url: "/admin/credits",
    icon: <CreditCard />,
  },
];

const ROUTE_LABELS: Record<string, string> = {
  admin: "Admin",
  statistics: "Statistics",
  users: "Users",
  models: "Models",
  providers: "Providers",
  credits: "Credits",
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

function AdminSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-none bg-primary text-primary-foreground">
            <LayoutDashboard className="size-4" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold">Admin Panel</span>
            <span className="text-xs text-muted-foreground">Model Bridge</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={adminNav} />
        <div className="mt-auto px-2 pb-2">
          <Link
            href="/admin/statistics"
            className="flex items-center gap-2 rounded-none px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to Dashboard
          </Link>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const crumbs = useBreadcrumbs();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (!user) {
        router.replace("/auth/login");
      } else if (!isAdmin()) {
        router.replace("/dashboard");
      }
    }
  }, [mounted, user, isAdmin, router]);

  if (!mounted) return null;

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.map((crumb, i) => (
                <span key={crumb.href} className="flex items-center gap-1.5">
                  {i > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                  <BreadcrumbItem className={i < crumbs.length - 1 ? "hidden md:block" : ""}>
                    {crumb.isLast ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </span>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
