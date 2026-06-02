"use client";

import { usePathname, useRouter } from "next/navigation";
import { Menu, Coins, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/authStore";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/keys": "API Keys",
  "/dashboard/usage": "Usage Logs",
  "/dashboard/stats": "Statistics",
  "/dashboard/credits": "Credits & Wallet",
  "/dashboard/profile": "Profile",
};

interface TopbarProps {
  onMenuToggle: () => void;
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const title = PAGE_TITLES[pathname] ?? "Dashboard";

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "??";

  const handleLogout = () => {
    logout();
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.push("/auth/login");
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
          aria-label="Toggle sidebar"
        >
          <Menu className="size-5" />
        </Button>
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
      </div>

      {/* Right: credit balance + user dropdown */}
      <div className="flex items-center gap-2">
        {/* Credit balance chip — hidden on mobile */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-xl bg-muted px-3 py-1.5 text-sm">
          <Coins className="size-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium text-foreground tabular-nums">
            ${user?.creditBalance?.toFixed(2) ?? "0.00"}
          </span>
        </div>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="User menu"
            >
              <Avatar size="sm">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="pb-0">
              <p className="text-sm font-medium text-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs font-normal text-muted-foreground truncate">
                {user?.email}
              </p>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={() => router.push("/dashboard/profile")}>
              <User className="size-4" />
              Profile
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
