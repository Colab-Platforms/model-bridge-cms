"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Key,
  ListOrdered,
  History,
  Wallet,
  FolderOpen,
  CircleUserRound,
  ShieldCheck,
  SlidersHorizontal,
  CreditCard,
  Receipt,
} from "lucide-react";

import { NavMain } from "@/components/layout/nav-main";
import { NavUser } from "@/components/layout/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navMain = [
  {
    title: "Overview",
    url: "/dashboard/overview",
    icon: <LayoutDashboard />,
  },
  {
    title: "Projects",
    url: "/dashboard/projects",
    icon: <FolderOpen />,
  },
  {
    title: "API Keys",
    url: "/dashboard/keys",
    icon: <Key />,
  },
  {
    title: "Usage Logs",
    url: "/dashboard/usage",
    icon: <ListOrdered />,
  },
  {
    title: "Activity Log",
    url: "/dashboard/activity",
    icon: <History />,
  },
  {
    title: "Billing",
    url: "/dashboard/billing",
    icon: <CreditCard />,
    items: [
      {
        title: "Credits & Wallet",
        url: "/dashboard/credits",
      },
      {
        title: "Invoices",
        url: "/dashboard/billing/invoices",
      },
    ],
  },
];

const navAccount = [
  {
    title: "Profile",
    url: "/dashboard/profile",
    icon: <CircleUserRound />,
  },
  {
    title: "Privacy",
    url: "/dashboard/privacy",
    icon: <ShieldCheck />,
  },
  {
    title: "Preferences",
    url: "/dashboard/preferences",
    icon: <SlidersHorizontal />,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="py-1.5">
        <div className="flex items-center justify-between gap-2 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <span className="text-xs font-medium text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
            Platform
          </span>
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <NavMain items={navMain} hideLabel />
        <NavMain items={navAccount} label="Account" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
