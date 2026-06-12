"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Monitor, Smartphone, Shield } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { Session, User } from "@/types";

// ── Schemas ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNo: z.string().optional(),
  countryCode: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  profileImage: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type PasswordValues = z.infer<typeof passwordSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(ts?: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseUserAgent(ua?: string) {
  if (!ua) return "Unknown device";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  return ua.slice(0, 36);
}

// ── Profile Tab ───────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery<User>({
    queryKey: ["profile"],
    queryFn: () => api.get("/users/me").then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phoneNo: "",
      countryCode: "",
      city: "",
      state: "",
      country: "",
      timezone: "",
      profileImage: "",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
        phoneNo: profile.phoneNo ?? "",
        countryCode: profile.countryCode ?? "",
        city: profile.city ?? "",
        state: profile.state ?? "",
        country: profile.country ?? "",
        timezone: profile.timezone ?? "",
        profileImage: profile.profileImage ?? "",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const { mutate, isPending } = useMutation({
    mutationFn: (data: ProfileValues) =>
      api.patch("/users/me", data).then((r) => r.data),
    onSuccess: (updated: User) => {
      setUser(updated);
      queryClient.setQueryData(["profile"], updated);
      toast.success("Profile updated");
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const imageUrl = watch("profileImage");
  const displayUser = profile ?? user;
  const initials = displayUser
    ? `${displayUser.firstName?.[0] ?? ""}${displayUser.lastName?.[0] ?? ""}`.toUpperCase()
    : "??";

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4 pt-4">
      {/* Avatar */}
      <Card>
        <CardContent className="flex items-center gap-5 pt-6">
          <Avatar className="h-16 w-16 rounded-2xl shrink-0">
            {imageUrl && <AvatarImage src={imageUrl} alt="Profile" />}
            <AvatarFallback className="rounded-2xl text-xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="profileImage">Profile image URL</Label>
            <Input
              id="profileImage"
              placeholder="https://example.com/avatar.png"
              {...register("profileImage")}
            />
            {errors.profileImage && (
              <p className="text-xs text-destructive">
                {errors.profileImage.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-xs text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && (
                <p className="text-xs text-destructive">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="countryCode">Country code</Label>
              <Input
                id="countryCode"
                placeholder="+1"
                {...register("countryCode")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phoneNo">Phone number</Label>
              <Input
                id="phoneNo"
                placeholder="555 000 1234"
                {...register("phoneNo")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State / Province</Label>
              <Input id="state" {...register("state")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register("country")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                placeholder="America/New_York"
                {...register("timezone")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Read-only account info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Account Info</CardTitle>
          <CardDescription className="text-xs">
            Contact support to change your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">
              {displayUser?.email ?? "—"}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-muted-foreground">Role</span>
            <Badge variant="outline" className="capitalize text-xs">
              {displayUser?.role?.toLowerCase() ?? "—"}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge
              variant="outline"
              className={
                displayUser?.status === "ACTIVE"
                  ? "text-green-600 border-green-300 bg-green-50 text-xs"
                  : "text-zinc-500 text-xs"
              }
            >
              {displayUser?.status?.toLowerCase() ?? "—"}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-muted-foreground">Member since</span>
            <span className="text-sm">{fmtDate(profile?.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-4">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}

// ── Password Section ──────────────────────────────────────────────────────────

function PasswordSection() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: PasswordValues) =>
      api.patch("/users/me/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      toast.success("Password changed successfully");
      reset();
    },
    onError: () =>
      toast.error("Failed to change password — check your current password"),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Change Password</CardTitle>
        <CardDescription className="text-xs">
          Use a strong password you don't use elsewhere.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((d) => mutate(d))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p className="text-xs text-destructive">
                {errors.currentPassword.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p className="text-xs text-destructive">
                {errors.newPassword.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Sessions Section ──────────────────────────────────────────────────────────

function SessionsSection() {
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ["sessions"],
    queryFn: () => api.get("/sessions").then((r) => r.data),
  });

  const revokeOne = useMutation({
    mutationFn: (id: string) => api.delete(`/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session revoked");
    },
    onError: () => toast.error("Failed to revoke session"),
  });

  const revokeAll = useMutation({
    mutationFn: () => api.delete("/sessions"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("All other sessions revoked");
    },
    onError: () => toast.error("Failed to revoke sessions"),
  });

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div>
          <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Devices currently signed in to your account.
          </CardDescription>
        </div>
        {otherSessions.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={revokeAll.isPending}
            onClick={() => revokeAll.mutate()}
            className="shrink-0 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
          >
            {revokeAll.isPending && (
              <Loader2 className="mr-1.5 size-3 animate-spin" />
            )}
            Revoke all other sessions
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Shield className="size-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No active sessions found.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        {session.deviceName
                          ?.toLowerCase()
                          .includes("mobile") ? (
                          <Smartphone className="size-3.5 text-muted-foreground" />
                        ) : (
                          <Monitor className="size-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {session.deviceName ??
                            parseUserAgent(session.userAgent)}
                        </p>
                        {session.isCurrent && (
                          <span className="mt-1 inline-flex items-center rounded-full border border-green-300 bg-green-50 px-1.5 py-px text-[10px] font-medium text-green-600">
                            Current session
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {session.ipAddress ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {fmtDate(session.lastUsedAt)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {fmtDate(session.expiresAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {!session.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={revokeOne.isPending}
                        onClick={() => revokeOne.mutate(session.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/5"
                      >
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ── Security Tab ──────────────────────────────────────────────────────────────

function SecurityTab() {
  return (
    <div className="space-y-4 pt-4">
      <PasswordSection />
      <SessionsSection />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Account Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your profile information and account security.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
