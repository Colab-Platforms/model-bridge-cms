"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Activity,
  UserCheck,
  UserX,
  Clock,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  KeyRound,
  ShieldOff,
  ShieldX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

type DatePreset = "today" | "past_24h" | "weekly" | "monthly" | "yearly";

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "past_24h", label: "24h" },
  { key: "weekly", label: "7d" },
  { key: "monthly", label: "30d" },
  { key: "yearly", label: "1y" },
];

function fmtUsd(v: string | number) {
  return `$${parseFloat(String(v)).toFixed(4)}`;
}

function fmtNum(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  loading?: boolean;
}) {
  return (
    <Card className="rounded-none">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16 rounded-none" />
        ) : (
          <p className="text-2xl font-bold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

type ConfirmAction =
  | { type: "key"; keyId: string; keyName: string }
  | { type: "project"; projectId: string; projectName: string; keyIds: string[] };

function keyStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "REVOKED") return "destructive";
  return "secondary";
}

function UserExpandedPanel({
  userId,
  onConfirm,
}: {
  userId: string;
  onConfirm: (action: ConfirmAction) => void;
}) {
  const { data: keys, isLoading } = useQuery({
    queryKey: ["admin-user-keys", userId],
    queryFn: () => api.get(`/api-keys/user/${userId}`).then((r) => r.data),
    staleTime: 30_000,
  });

  const keyList: any[] = Array.isArray(keys) ? keys : (keys?.data ?? []);

  // Group keys by project
  const projectMap = new Map<string, { project: any; keys: any[] }>();
  for (const key of keyList) {
    const proj = key.project;
    if (!proj) continue;
    const existing = projectMap.get(proj.id) ?? { project: proj, keys: [] };
    existing.keys.push(key);
    projectMap.set(proj.id, existing);
  }
  const projects = Array.from(projectMap.values());

  if (isLoading) {
    return (
      <div className="p-4 space-y-2 bg-muted/20 border-t border-border">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-none" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="p-6 bg-muted/20 border-t border-border text-sm text-muted-foreground text-center">
        No projects or API keys found for this user.
      </div>
    );
  }

  return (
    <div className="bg-muted/10 border-t border-border divide-y divide-border">
      {projects.map(({ project, keys: projKeys }) => {
        const activeKeys = projKeys.filter((k: any) => k.status === "ACTIVE");
        return (
          <div key={project.id} className="p-4 space-y-3">
            {/* Project header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="size-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-semibold">{project.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground font-mono">/{project.slug}</span>
                </div>
                <Badge
                  variant={project.isActive ? "default" : "secondary"}
                  className="rounded-none text-xs ml-1"
                >
                  {project.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {activeKeys.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-none h-7 text-xs"
                  onClick={() =>
                    onConfirm({
                      type: "project",
                      projectId: project.id,
                      projectName: project.name,
                      keyIds: activeKeys.map((k: any) => k.id),
                    })
                  }
                >
                  <ShieldX className="size-3 mr-1" />
                  Revoke All Keys ({activeKeys.length})
                </Button>
              )}
            </div>

            {/* Keys table for this project */}
            <div className="rounded-none border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs uppercase tracking-wider py-2">Key Name</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider py-2">Prefix</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider py-2">Status</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider py-2">Created</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider py-2">Last Used</TableHead>
                    <TableHead className="py-2" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projKeys.map((k: any) => (
                    <TableRow key={k.id} className="bg-background">
                      <TableCell className="text-sm py-2">
                        <div className="flex items-center gap-1.5">
                          <KeyRound className="size-3 text-muted-foreground" />
                          {k.name ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground py-2">
                        {k.keyPrefix}…
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant={keyStatusVariant(k.status)} className="rounded-none text-xs">
                          {k.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-2">
                        {new Date(k.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-2">
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}
                      </TableCell>
                      <TableCell className="text-right py-2">
                        {k.status === "ACTIVE" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-none h-6 text-xs"
                            onClick={() =>
                              onConfirm({
                                type: "key",
                                keyId: k.id,
                                keyName: k.name ?? k.keyPrefix,
                              })
                            }
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

export default function AdminUsersPage() {
  const [preset, setPreset] = useState<DatePreset>("weekly");
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const queryClient = useQueryClient();

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["admin-overview-users", preset],
    queryFn: () =>
      api.get("/admin/overview", { params: { dateRangePreset: preset } }).then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["admin-activity-users", preset],
    queryFn: () =>
      api
        .get("/admin/activity/by-users", { params: { dateRangePreset: preset, pageSize: 100 } })
        .then((r) => r.data),
    staleTime: 60_000,
  });

  const { mutate: revokeKey, isPending: revoking } = useMutation({
    mutationFn: (keyId: string) =>
      api.patch(`/api-keys/${keyId}`, { status: "REVOKED" }).then((r) => r.data),
    onSuccess: () => {
      toast.success("API key revoked");
      // Invalidate all expanded user key queries
      expandedUsers.forEach((uid) => {
        queryClient.invalidateQueries({ queryKey: ["admin-user-keys", uid] });
      });
      setConfirmAction(null);
    },
    onError: () => {
      toast.error("Failed to revoke API key");
    },
  });

  const handleConfirm = async () => {
    if (!confirmAction) return;

    if (confirmAction.type === "key") {
      revokeKey(confirmAction.keyId);
    } else {
      // Revoke all keys for the project sequentially
      try {
        await Promise.all(
          confirmAction.keyIds.map((id) =>
            api.patch(`/api-keys/${id}`, { status: "REVOKED" })
          )
        );
        toast.success(`All active keys for "${confirmAction.projectName}" revoked`);
        expandedUsers.forEach((uid) => {
          queryClient.invalidateQueries({ queryKey: ["admin-user-keys", uid] });
        });
        setConfirmAction(null);
      } catch {
        toast.error("Failed to revoke some keys");
      }
    }
  };

  const toggleUser = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const summary = overview?.summary;
  const isLoading = overviewLoading || activityLoading;
  const users: any[] = activity?.data ?? [];

  return (
    <div className="space-y-6 pb-10">
      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "key" ? "Revoke API Key?" : "Revoke All Project Keys?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "key"
                ? <>This will immediately revoke <strong>{confirmAction.keyName}</strong>. Any requests using this key will be rejected.</>
                : <>This will revoke all <strong>{confirmAction?.keyIds.length}</strong> active API keys in project <strong>{(confirmAction as any)?.projectName}</strong>. All access through this project will be blocked.</>
              }
              {" "}This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirm}
              disabled={revoking}
            >
              {revoking ? "Revoking…" : confirmAction?.type === "key" ? "Revoke Key" : "Revoke All Keys"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">User activity, projects, and API key management</p>
        </div>
        <div className="flex overflow-hidden rounded-none border border-border">
          {PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                preset === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Total Users" value={summary?.totalUsers ?? 0} icon={Users} loading={isLoading} />
        <StatCard title="Active" value={summary?.activeUsers ?? 0} icon={UserCheck} loading={isLoading} />
        <StatCard title="Suspended" value={summary?.suspendedUsers ?? 0} icon={UserX} loading={isLoading} />
        <StatCard title="Inactive" value={summary?.inactiveUsers ?? 0} icon={Clock} loading={isLoading} />
      </div>

      {/* User activity + accordion */}
      <Card className="rounded-none">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="size-4" />
            User Activity
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              — click a row to view projects &amp; API keys
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-8" />
                <TableHead className="text-xs uppercase tracking-wider">User</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Requests</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Tokens</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Spend</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Success Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-5 w-full rounded-none" />
                      </TableCell>
                    </TableRow>
                  ))
                : users.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center text-sm text-muted-foreground">
                        No user activity found for this period.
                      </TableCell>
                    </TableRow>
                  )
                : users.map((u: any) => {
                    const successRate =
                      u.totalRequests > 0
                        ? ((u.successRequests / u.totalRequests) * 100).toFixed(1)
                        : "—";
                    const displayName =
                      u.firstName && u.lastName
                        ? `${u.firstName} ${u.lastName}`
                        : u.email ?? u.userId;
                    const isExpanded = expandedUsers.has(u.userId);

                    return (
                      <React.Fragment key={u.userId}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/40"
                          onClick={() => toggleUser(u.userId)}
                        >
                          <TableCell className="py-3 pl-4 pr-0">
                            {isExpanded
                              ? <ChevronDown className="size-4 text-muted-foreground" />
                              : <ChevronRight className="size-4 text-muted-foreground" />
                            }
                          </TableCell>
                          <TableCell className="py-3">
                            <p className="text-sm font-medium">{displayName}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </TableCell>
                          <TableCell className="py-3 text-right text-sm tabular-nums">
                            {fmtNum(u.totalRequests ?? 0)}
                          </TableCell>
                          <TableCell className="py-3 text-right text-sm tabular-nums">
                            {fmtNum(u.totalTokens ?? 0)}
                          </TableCell>
                          <TableCell className="py-3 text-right text-sm tabular-nums">
                            {fmtUsd(u.totalCost ?? "0")}
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <span
                              className={cn(
                                "text-xs font-medium",
                                parseFloat(successRate) >= 95
                                  ? "text-green-600"
                                  : parseFloat(successRate) >= 80
                                  ? "text-amber-600"
                                  : "text-red-500"
                              )}
                            >
                              {successRate !== "—" ? `${successRate}%` : "—"}
                            </span>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow key={`${u.userId}-panel`} className="hover:bg-transparent">
                            <TableCell colSpan={6} className="p-0">
                              <UserExpandedPanel
                                userId={u.userId}
                                onConfirm={setConfirmAction}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
