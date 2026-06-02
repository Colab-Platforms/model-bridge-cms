"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Key,
  ScrollText,
  BarChart2,
  Wallet,
  LogOut,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/authStore";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "API Keys", href: "/dashboard/keys", icon: Key },
  { label: "Usage Logs", href: "/dashboard/usage", icon: ScrollText },
  { label: "Statistics", href: "/dashboard/stats", icon: BarChart2 },
  { label: "Credits & Wallet", href: "/dashboard/credits", icon: Wallet },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.push("/auth/login");
  };

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "??";

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-border bg-card",
          "transition-transform duration-200 ease-in-out",
          "lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo row */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <span className="font-semibold text-foreground tracking-tight">
            Model Bridge
          </span>
          <button
            onClick={onClose}
            className="lg:hidden rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active =
              href === "/dashboard"
                ? pathname === href
                : pathname === href || pathname.startsWith(href + "/");

            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="shrink-0 border-t border-border p-3 space-y-1">
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary select-none">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <Badge variant="secondary" className="mt-0.5 h-4 text-xs">
                ${user?.creditBalance?.toFixed(2) ?? "0.00"}
              </Badge>
            </div>
          </div>

          <Separator />

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Log out
          </Button>
        </div>
      </aside>
    </>
  );
}
