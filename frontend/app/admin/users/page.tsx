"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  KeyRound,
  ShieldOff,
  ShieldX,
  Search,
  Pencil,
  Trash2,
  UserCog,
  Activity,
  MoreHorizontal,
  MapPin,
  Phone,
  ShieldAlert,
} from "lucide-react";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type DatePreset = "today" | "past_24h" | "weekly" | "monthly" | "yearly";

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "past_24h", label: "24h" },
  { key: "weekly", label: "7d" },
  { key: "monthly", label: "30d" },
  { key: "yearly", label: "1y" },
];

type UserStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE";

interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNo: string | null;
  countryCode: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  profileImage: string | null;
  status: UserStatus;
  authProvider: string;
  timezone: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  roles: { id: string; name: string }[];
}

interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phoneNo?: string;
  countryCode?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  status?: UserStatus;
}

type ConfirmAction =
  | { type: "key"; keyId: string; keyName: string }
  | { type: "project"; projectId: string; projectName: string; keyIds: string[] };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtUsd(v: string | number) {
  return `$${parseFloat(String(v)).toFixed(4)}`;
}

function fmtNum(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

function getUserDisplayName(user: Pick<AdminUser, "firstName" | "lastName" | "email">) {
  const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return full || user.email;
}

function getInitials(user: Pick<AdminUser, "firstName" | "lastName" | "email">) {
  if (user.firstName && user.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  return user.email[0].toUpperCase();
}

const AVATAR_PALETTES = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300",
];

function avatarPalette(email: string) {
  const n = email.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTES[n % AVATAR_PALETTES.length];
}

// ─── Shared UI atoms ─────────────────────────────────────────────────────────

function UserAvatar({
  user,
  size = "md",
}: {
  user: Pick<AdminUser, "firstName" | "lastName" | "email">;
  size?: "sm" | "md" | "lg";
}) {
  const sz = size === "sm" ? "size-7 text-[10px]" : size === "lg" ? "size-12 text-sm" : "size-9 text-xs";
  return (
    <div className={cn("rounded-full flex items-center justify-center font-semibold shrink-0 select-none", sz, avatarPalette(user.email))}>
      {getInitials(user)}
    </div>
  );
}

const STATUS_STYLES: Record<UserStatus, { pill: string; dot: string; label: string }> = {
  ACTIVE:    { pill: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800", dot: "bg-emerald-500 animate-pulse", label: "Active" },
  SUSPENDED: { pill: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",                         dot: "bg-red-500",                 label: "Suspended" },
  INACTIVE:  { pill: "bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700",                   dot: "bg-zinc-400",                label: "Inactive" },
};

function StatusPill({ status }: { status: UserStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", s.pill)}>
      <span className={cn("size-1.5 rounded-full shrink-0", s.dot)} />
      {s.label}
    </span>
  );
}

const ROLE_STYLES: Record<string, string> = {
  SuperAdmin: "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
  Admin:      "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
  User:       "bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700",
};

function RolePill({ role }: { role: string }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", ROLE_STYLES[role] ?? ROLE_STYLES.User)}>
      {role}
    </span>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  title, value, icon: Icon, iconBg, loading,
}: {
  title: string; value: number | string; icon: React.ElementType; iconBg: string; loading?: boolean;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
            {loading
              ? <Skeleton className="h-8 w-14 mt-1" />
              : <p className="text-2xl font-bold tracking-tight">{value}</p>
            }
          </div>
          <div className={cn("size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", iconBg)}>
            <Icon className="size-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Edit sheet ───────────────────────────────────────────────────────────────

function EditUserSheet({ user, open, onClose }: { user: AdminUser | null; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<UpdateUserPayload>({});

  React.useEffect(() => {
    if (user) setForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      phoneNo: user.phoneNo ?? "",
      countryCode: user.countryCode ?? "",
      city: user.city ?? "",
      state: user.state ?? "",
      country: user.country ?? "",
      timezone: user.timezone ?? "",
      status: user.status,
    });
  }, [user]);

  const { mutate: updateUser, isPending } = useMutation({
    mutationFn: (payload: UpdateUserPayload) =>
      api.patch(`/admin/users/${user!.id}`, payload).then((r) => r.data),
    onSuccess: () => {
      toast.success("User updated");
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to update user"),
  });

  const set = (key: keyof UpdateUserPayload) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSave = () => {
    if (!user) return;
    const payload: UpdateUserPayload = {};
    if (form.firstName !== (user.firstName ?? "")) payload.firstName = form.firstName;
    if (form.lastName  !== (user.lastName  ?? "")) payload.lastName  = form.lastName;
    if (form.phoneNo   !== (user.phoneNo   ?? "")) payload.phoneNo   = form.phoneNo;
    if (form.countryCode !== (user.countryCode ?? "")) payload.countryCode = form.countryCode;
    if (form.city    !== (user.city    ?? "")) payload.city    = form.city;
    if (form.state   !== (user.state   ?? "")) payload.state   = form.state;
    if (form.country !== (user.country ?? "")) payload.country = form.country;
    if (form.timezone !== (user.timezone ?? "")) payload.timezone = form.timezone;
    if (form.status !== user.status) payload.status = form.status;
    if (!Object.keys(payload).length) { toast.info("No changes to save"); return; }
    updateUser(payload);
  };

  const field = (label: string, key: keyof UpdateUserPayload, placeholder = "") => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        className="h-9 text-sm"
        value={(form[key] as string) ?? ""}
        onChange={set(key)}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-[420px] flex flex-col p-0">

        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          {user && (
            <div className="flex items-center gap-3">
              <UserAvatar user={user} size="lg" />
              <div className="min-w-0">
                <SheetTitle className="text-base font-semibold truncate">{getUserDisplayName(user)}</SheetTitle>
                <SheetDescription className="text-xs truncate">{user.email}</SheetDescription>
              </div>
            </div>
          )}
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          <section className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <UserCog className="size-3.5" /> Personal Info
            </p>
            <div className="grid grid-cols-2 gap-3">
              {field("First Name", "firstName", "First name")}
              {field("Last Name",  "lastName",  "Last name")}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {field("Country Code", "countryCode", "+1")}
              {field("Phone",        "phoneNo",     "555-0100")}
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="size-3.5" /> Location
            </p>
            <div className="grid grid-cols-2 gap-3">
              {field("City",    "city",    "New York")}
              {field("State",   "state",   "NY")}
              {field("Country", "country", "United States")}
              {field("Timezone","timezone","America/New_York")}
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="size-3.5" /> Account
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as UserStatus }))}>
                <SelectTrigger className="h-9 text-sm w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>
        </div>

        {/* Footer */}
        <SheetFooter className="px-6 py-4 border-t flex flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Expanded activity panel ──────────────────────────────────────────────────

function UserExpandedPanel({ userId, onConfirm }: { userId: string; onConfirm: (a: ConfirmAction) => void }) {
  const { data: keys, isLoading } = useQuery({
    queryKey: ["admin-user-keys", userId],
    queryFn: () => api.get(`/api-keys/user/${userId}`).then((r) => r.data),
    staleTime: 30_000,
  });

  const keyList: any[] = Array.isArray(keys) ? keys : (keys?.data ?? []);
  const projectMap = new Map<string, { project: any; keys: any[] }>();
  for (const k of keyList) {
    if (!k.project) continue;
    const e = projectMap.get(k.project.id) ?? { project: k.project, keys: [] };
    e.keys.push(k);
    projectMap.set(k.project.id, e);
  }
  const projects = Array.from(projectMap.values());

  if (isLoading) return (
    <div className="px-6 py-4 bg-muted/30 border-t space-y-2">
      {[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
    </div>
  );

  if (!projects.length) return (
    <div className="px-6 py-6 bg-muted/30 border-t text-center text-sm text-muted-foreground">
      No projects or API keys found for this user.
    </div>
  );

  return (
    <div className="bg-muted/20 border-t divide-y divide-border/50">
      {projects.map(({ project, keys: pKeys }) => {
        const active = pKeys.filter((k: any) => k.status === "ACTIVE");
        return (
          <div key={project.id} className="px-6 py-4 space-y-3">
            {/* Project header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FolderOpen className="size-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold">{project.name}</span>
                <span className="text-xs text-muted-foreground font-mono">/{project.slug}</span>
                <Badge variant={project.isActive ? "default" : "secondary"} className="text-[10px] py-0 px-1.5">
                  {project.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {active.length > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  onClick={() => onConfirm({ type: "project", projectId: project.id, projectName: project.name, keyIds: active.map((k: any) => k.id) })}
                >
                  <ShieldX className="size-3 mr-1" />
                  Revoke All ({active.length})
                </Button>
              )}
            </div>

            {/* Keys table */}
            <div className="rounded-lg border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    {["Key Name", "Prefix", "Status", "Created", "Last Used", ""].map((h) => (
                      <TableHead key={h} className="py-2 text-xs font-medium">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pKeys.map((k: any) => (
                    <TableRow key={k.id} className="text-sm">
                      <TableCell className="py-2 font-medium">
                        <div className="flex items-center gap-1.5">
                          <KeyRound className="size-3 text-muted-foreground" />
                          {k.name ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 font-mono text-xs text-muted-foreground">{k.keyPrefix}••••</TableCell>
                      <TableCell className="py-2">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                          k.status === "ACTIVE"  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          k.status === "REVOKED" ? "bg-red-50 text-red-700 border border-red-200" :
                                                   "bg-zinc-100 text-zinc-500 border border-zinc-200"
                        )}>
                          {k.status === "ACTIVE" && <span className="size-1 rounded-full bg-emerald-500 animate-pulse" />}
                          {k.status}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground">
                        {new Date(k.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground">
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Never"}
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        {k.status === "ACTIVE" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 px-2"
                            onClick={() => onConfirm({ type: "key", keyId: k.id, keyName: k.name ?? k.keyPrefix })}
                          >
                            <ShieldOff className="size-3 mr-1" />
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, totalRecords, pageSize, onPageChange }: {
  page: number; totalPages: number; totalRecords: number; pageSize: number; onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, totalRecords);

  let pages: number[];
  if (totalPages <= 7) pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  else if (page <= 4)  pages = [1, 2, 3, 4, 5];
  else if (page >= totalPages - 3) pages = Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
  else pages = [page - 2, page - 1, page, page + 1, page + 2];

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
      <p className="text-xs text-muted-foreground order-2 sm:order-1">
        Showing <span className="font-medium text-foreground">{from}–{to}</span> of{" "}
        <span className="font-medium text-foreground">{totalRecords}</span> users
      </p>
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</Button>
        {pages[0] > 1 && <>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => onPageChange(1)}>1</Button>
          {pages[0] > 2 && <span className="text-muted-foreground text-xs px-0.5">…</span>}
        </>}
        {pages.map((p) => (
          <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => onPageChange(p)}>
            {p}
          </Button>
        ))}
        {pages[pages.length - 1] < totalPages && <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="text-muted-foreground text-xs px-0.5">…</span>}
          <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => onPageChange(totalPages)}>{totalPages}</Button>
        </>}
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [preset, setPreset] = useState<DatePreset>("weekly");
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const [editUser, setEditUser]       = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // ── Queries ──

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["admin-overview-users", preset],
    queryFn: () => api.get("/admin/overview", { params: { dateRangePreset: preset } }).then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["admin-activity-users", preset],
    queryFn: () => api.get("/admin/activity/by-users", { params: { dateRangePreset: preset, pageSize: 100 } }).then((r) => r.data),
    staleTime: 60_000,
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users-list", debouncedSearch, statusFilter, roleFilter, page],
    queryFn: () => api.get("/admin/users", {
      params: {
        page, pageSize: PAGE_SIZE,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        ...(roleFilter   !== "ALL" ? { role: roleFilter }     : {}),
      },
    }).then((r) => r.data),
    staleTime: 30_000,
  });

  // ── Mutations ──

  const { mutate: revokeKey, isPending: revoking } = useMutation({
    mutationFn: (keyId: string) => api.patch(`/api-keys/${keyId}`, { status: "REVOKED" }).then((r) => r.data),
    onSuccess: () => {
      toast.success("API key revoked");
      expandedUsers.forEach((uid) => queryClient.invalidateQueries({ queryKey: ["admin-user-keys", uid] }));
      setConfirmAction(null);
    },
    onError: () => toast.error("Failed to revoke key"),
  });

  const { mutate: deleteUser, isPending: deleting } = useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/users/${userId}`).then((r) => r.data),
    onSuccess: () => {
      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to delete user"),
  });

  const { mutate: quickStatus } = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: UserStatus }) =>
      api.patch(`/admin/users/${userId}`, { status }).then((r) => r.data),
    onSuccess: (_, { status }) => {
      toast.success(status === "ACTIVE" ? "User activated" : "User suspended");
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to update status"),
  });

  const handleKeyConfirm = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === "key") {
      revokeKey(confirmAction.keyId);
    } else {
      try {
        await Promise.all(confirmAction.keyIds.map((id) => api.patch(`/api-keys/${id}`, { status: "REVOKED" })));
        toast.success(`Revoked all keys in "${confirmAction.projectName}"`);
        expandedUsers.forEach((uid) => queryClient.invalidateQueries({ queryKey: ["admin-user-keys", uid] }));
        setConfirmAction(null);
      } catch { toast.error("Failed to revoke some keys"); }
    }
  };

  const toggleExpand = (uid: string) =>
    setExpandedUsers((prev) => { const n = new Set(prev); n.has(uid) ? n.delete(uid) : n.add(uid); return n; });

  const summary      = overview?.summary;
  const activityList = activity?.data ?? [];
  const userList: AdminUser[] = usersQuery.data?.data     ?? [];
  const totalPages:  number   = usersQuery.data?.totalPages   ?? 1;
  const totalRecords: number  = usersQuery.data?.totalRecords ?? 0;
  const hasFilters = !!(debouncedSearch || statusFilter !== "ALL" || roleFilter !== "ALL");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 pb-10"
    >
      {/* ── Confirm dialogs ── */}

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => { if (!o) setConfirmAction(null); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "key" ? "Revoke this key?" : "Revoke all keys?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "key"
                ? <><strong className="text-foreground">{confirmAction.keyName}</strong> will stop accepting requests immediately.</>
                : <>All <strong className="text-foreground">{confirmAction?.keyIds.length}</strong> active keys in <strong className="text-foreground">{(confirmAction as any)?.projectName}</strong> will be revoked.</>
              }
              {" "}This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleKeyConfirm} disabled={revoking}>
              {revoking ? "Revoking…" : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-destructive" />
              Delete user?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{deleteTarget ? getUserDisplayName(deleteTarget) : ""}</strong>{" "}
              ({deleteTarget?.email}) will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && deleteUser(deleteTarget.id)} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditUserSheet user={editUser} open={!!editUser} onClose={() => setEditUser(null)} />

      {/* ── Page header + stat cards + tabs, all sharing one Tabs context ──
           className="contents" makes Tabs render with no box of its own, so its
           children (header row, stat grid, TabsContent) stack vertically via the
           parent motion.div's `space-y-6`, instead of inheriting Tabs' own flex layout. */}
      <Tabs defaultValue="users" className="contents">

        {/* Header row: title/subtitle on the left, compact pill tab switcher on the right */}
        <div className="flex w-full flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Users</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage accounts, review activity, and control API key access.</p>
          </div>

          <TabsList className="inline-flex h-9 items-center gap-1 rounded-full bg-muted/60 p-1 w-fit">
            <TabsTrigger
              value="users"
              className="gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <UserCog className="size-3.5" />
              Users
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Activity className="size-3.5" />
              Activity
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Stat cards (not gated by tab value) ── */}
        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4 mt-6">
          <StatCard title="Total Users"   value={summary?.totalUsers     ?? 0} icon={Users}     iconBg="bg-blue-50 dark:bg-blue-900/20 text-blue-600"          loading={overviewLoading} />
          <StatCard title="Active"         value={summary?.activeUsers    ?? 0} icon={UserCheck} iconBg="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600"  loading={overviewLoading} />
          <StatCard title="Suspended"      value={summary?.suspendedUsers ?? 0} icon={UserX}     iconBg="bg-red-50 dark:bg-red-900/20 text-red-600"              loading={overviewLoading} />
          <StatCard title="Inactive"       value={summary?.inactiveUsers  ?? 0} icon={Clock}     iconBg="bg-zinc-100 dark:bg-zinc-800 text-zinc-500"              loading={overviewLoading} />
        </div>

        {/* ─ All Users tab ─ */}
        <TabsContent value="users" className="mt-5 space-y-4">

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                className="pl-8 h-9 text-sm"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="h-9 text-sm w-[140px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
              <SelectTrigger className="h-9 text-sm w-[120px]"><SelectValue placeholder="All Roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="User">User</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={() => { setSearch(""); setStatusFilter("ALL"); setRoleFilter("ALL"); setPage(1); }}>
                Clear filters
              </Button>
            )}

            {totalRecords > 0 && !usersQuery.isLoading && (
              <span className="text-xs text-muted-foreground ml-auto">{totalRecords} user{totalRecords !== 1 ? "s" : ""}</span>
            )}
          </div>

          {/* Table */}
          <Card className="border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
                  <TableHead className="pl-5 py-3 font-semibold text-xs w-[36%]">User</TableHead>
                  <TableHead className="py-3 font-semibold text-xs">Role</TableHead>
                  <TableHead className="py-3 font-semibold text-xs">Status</TableHead>
                  <TableHead className="py-3 font-semibold text-xs">Auth</TableHead>
                  <TableHead className="py-3 font-semibold text-xs">Joined</TableHead>
                  <TableHead className="py-3 w-10 pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQuery.isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i} className="border-b border-border/40">
                        <TableCell colSpan={6} className="py-3 pl-5">
                          <div className="flex items-center gap-3">
                            <Skeleton className="size-9 rounded-full shrink-0" />
                            <div className="space-y-1.5">
                              <Skeleton className="h-3.5 w-32" />
                              <Skeleton className="h-3 w-44" />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  : userList.length === 0
                  ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-20 text-center">
                          <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                            <Users className="size-5 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {hasFilters ? "No users match your filters" : "No users yet"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {hasFilters ? "Try adjusting your search or filters." : "Users will appear here once they register."}
                          </p>
                          {hasFilters && (
                            <button className="mt-3 text-xs text-primary hover:underline underline-offset-2" onClick={() => { setSearch(""); setStatusFilter("ALL"); setRoleFilter("ALL"); }}>
                              Clear all filters
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  : userList.map((user) => {
                      const role = user.roles?.[0]?.name ?? "User";
                      return (
                        <TableRow key={user.id} className="group border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                          <TableCell className="pl-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <UserAvatar user={user} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium leading-tight truncate">{getUserDisplayName(user)}</p>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5"><RolePill role={role} /></TableCell>
                          <TableCell className="py-3.5"><StatusPill status={user.status} /></TableCell>
                          <TableCell className="py-3.5">
                            <span className="text-xs text-muted-foreground capitalize">
                              {user.authProvider?.toLowerCase() ?? "local"}
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </TableCell>
                          <TableCell className="py-3.5 pr-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={() => setEditUser(user)}>
                                  <Pencil className="size-3.5" /> Edit
                                </DropdownMenuItem>
                                {user.status === "ACTIVE" && (
                                  <DropdownMenuItem onClick={() => quickStatus({ userId: user.id, status: "SUSPENDED" })}>
                                    <UserX className="size-3.5" /> Suspend
                                  </DropdownMenuItem>
                                )}
                                {user.status === "SUSPENDED" && (
                                  <DropdownMenuItem onClick={() => quickStatus({ userId: user.id, status: "ACTIVE" })}>
                                    <UserCheck className="size-3.5" /> Activate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(user)}>
                                  <Trash2 className="size-3.5" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </Card>

          <Pagination page={page} totalPages={totalPages} totalRecords={totalRecords} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </TabsContent>

        {/* ─ Activity tab ─ */}
        <TabsContent value="activity" className="mt-5">
          <Card className="border-border/60 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between py-4 px-5 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="size-4 text-muted-foreground" />
                User Activity
                <span className="text-xs font-normal text-muted-foreground">— click a row to see projects & keys</span>
              </CardTitle>
              {/* Date preset */}
              <div className="flex items-center border border-border/60 rounded-lg overflow-hidden">
                {PRESETS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setPreset(key)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium transition-colors",
                      preset === key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CardHeader>

            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
                  <TableHead className="w-10 pl-5 py-3" />
                  <TableHead className="py-3 font-semibold text-xs">User</TableHead>
                  <TableHead className="py-3 font-semibold text-xs text-right">Requests</TableHead>
                  <TableHead className="py-3 font-semibold text-xs text-right">Tokens</TableHead>
                  <TableHead className="py-3 font-semibold text-xs text-right">Spend</TableHead>
                  <TableHead className="py-3 font-semibold text-xs text-right pr-5">Success Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i} className="border-b border-border/40">
                        <TableCell colSpan={6} className="py-3 pl-5">
                          <div className="flex items-center gap-3">
                            <Skeleton className="size-9 rounded-full shrink-0" />
                            <Skeleton className="h-4 w-48" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  : activityList.length === 0
                  ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-20 text-center">
                          <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                            <Activity className="size-5 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-foreground">No activity in this period</p>
                          <p className="text-xs text-muted-foreground mt-1">Try selecting a different date range.</p>
                        </TableCell>
                      </TableRow>
                    )
                  : (activityList as any[]).map((u) => {
                      const rate = u.totalRequests > 0
                        ? ((u.successRequests / u.totalRequests) * 100).toFixed(1)
                        : null;
                      const expanded = expandedUsers.has(u.userId);
                      const actUser  = { firstName: u.firstName, lastName: u.lastName, email: u.email ?? u.userId };

                      return (
                        <React.Fragment key={u.userId}>
                          <TableRow
                            className={cn("border-b border-border/40 cursor-pointer hover:bg-muted/30 transition-colors", expanded && "bg-muted/20")}
                            onClick={() => toggleExpand(u.userId)}
                          >
                            <TableCell className="pl-5 py-3.5">
                              {expanded
                                ? <ChevronDown  className="size-4 text-muted-foreground" />
                                : <ChevronRight className="size-4 text-muted-foreground" />
                              }
                            </TableCell>
                            <TableCell className="py-3.5">
                              <div className="flex items-center gap-3">
                                <UserAvatar user={actUser} />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium leading-tight">{getUserDisplayName(actUser)}</p>
                                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-3.5 text-right text-sm tabular-nums font-medium">{fmtNum(u.totalRequests ?? 0)}</TableCell>
                            <TableCell className="py-3.5 text-right text-sm tabular-nums text-muted-foreground">{fmtNum(u.totalTokens ?? 0)}</TableCell>
                            <TableCell className="py-3.5 text-right text-sm tabular-nums font-medium">{fmtUsd(u.totalCost ?? "0")}</TableCell>
                            <TableCell className="py-3.5 text-right pr-5">
                              {rate !== null ? (
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                  parseFloat(rate) >= 95
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                    : parseFloat(rate) >= 80
                                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                                )}>
                                  {rate}%
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                          {expanded && (
                            <TableRow className="hover:bg-transparent">
                              <TableCell colSpan={6} className="p-0 border-b border-border/40">
                                <UserExpandedPanel userId={u.userId} onConfirm={setConfirmAction} />
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}