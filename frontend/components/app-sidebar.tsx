"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Key,
  ScrollText,
  BarChart2,
  Wallet,
  CommandIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  teams: [
    {
      name: "Model Bridge",
      logo: <CommandIcon />,
      plan: "CMS",
    },
  ],
  navMain: [
    {
      title: "Overview",
      url: "/dashboard",
      icon: <LayoutDashboard />,
    },
    {
      title: "API Management",
      url: "#",
      icon: <Key />,
      items: [
        { title: "API Keys",    url: "/dashboard/keys" },
        { title: "Usage Logs", url: "/dashboard/usage" },
      ],
    },
    {
      title: "Analytics",
      url: "#",
      icon: <BarChart2 />,
      items: [
        { title: "Statistics", url: "/dashboard/stats" },
      ],
    },
    {
      title: "Credits & Wallet",
      url: "/dashboard/credits",
      icon: <Wallet />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
