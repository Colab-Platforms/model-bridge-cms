"use client";

import * as React from "react";
import {
  LayoutDashboard,
  BrainCircuit,
  Key,
  BarChart2,
  Wallet,
  FolderOpen,
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
  // {
  //   title: "Models",
  //   url: "/models",
  //   icon: <BrainCircuit />,
  // },
  {
    title: "Projects",
    url: "/dashboard/projects",
    icon: <FolderOpen />,
  },
  {
    title: "API Management",
    url: "#",
    icon: <Key />,
    items: [
      { title: "API Keys",    url: "/dashboard/keys" },
      { title: "Usage Logs",  url: "/dashboard/usage" },
      { title: "Activity Log", url: "/dashboard/activity" },
    ],
  },
  {
    title: "Credits & Wallet",
    url: "/dashboard/credits",
    icon: <Wallet />,
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
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
