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
} from "lucide-react";

import { NavMain } from "@/components/layout/nav-main";
import { NavUser } from "@/components/layout/nav-user";
import { ProjectSwitcher } from "@/components/layout/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
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
    title: "Credits & Wallet",
    url: "/dashboard/credits",
    icon: <Wallet />,
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
      <SidebarHeader>
        <ProjectSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavMain items={navAccount} label="Account" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
